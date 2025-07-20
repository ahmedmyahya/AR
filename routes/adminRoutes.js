// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { User, Model } = require("../database");
const {
  getMulterDestination,
  getMulterFilename,
} = require("../services/fileStorage");
const { generateThumbnail } = require("../services/thumbnailGenerator");
const path = require("path");
const fs = require("fs").promises;
const { Op } = require("sequelize");
const {
  requireAdmin,
  validateModel,
  handleValidationErrors,
  validateUserTheme,
} = require("../middleware/auth"); // Import requireAdmin

// Ensure all routes in this file require admin privileges
router.use(requireAdmin);

// Multer setup for admin uploads (can use the same storage setup)
const uploadAdmin = multer({
  storage: multer.diskStorage({
    destination: getMulterDestination(), // Still uses session.user for path
    filename: getMulterFilename(),
  }),
  fileFilter: (req, file, cb) => {
    // Basic file type check for admin uploads
    if (
      file.mimetype.startsWith("model/") ||
      file.mimetype.includes("glb") ||
      file.mimetype.includes("gltf")
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only GLB, GLTF, OBJ, FBX are allowed."),
        false
      );
    }
  },
});

// Admin Dashboard View
router.get("/", async (req, res) => {
  const username = req.session.user; // Should be 'admin' due to requireAdmin
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: uploadedModels } = await Model.findAndCountAll({
      order: [["createdAt", "DESC"]], // Admin can see all models
      limit: limit,
      offset: offset,
      include: [{ model: User, attributes: ["username", "theme"] }], // Include user for theme
    });

    const totalPages = Math.ceil(count / limit);

    // Fetch a single model for preview if a filename is provided in query
    let previewModel = null;
    if (req.query.filename) {
      const requestedFilename = req.query.filename;
      previewModel = await Model.findOne({
        where: { filename: requestedFilename },
      });
    }

    res.render("admin", {
      user: res.locals.user, // Passed from global middleware
      username: username,
      uploadedModels: uploadedModels,
      totalModels: count,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
      error: res.locals.error,
      success: res.locals.success,
      model: previewModel, // For preview section
      userTheme: res.locals.user?.theme || "light", // Pass theme for header
      baseUrl: res.locals.baseUrl, // Pass base URL for viewer links
    });
  } catch (error) {
    console.error("Error fetching admin models:", error);
    res.status(500).render("error", {
      message: "Could not retrieve models for admin dashboard.",
      status: 500,
    });
  }
});

// Handle Admin Upload
router.post(
  "/upload",
  uploadAdmin.array("models", 5), // Allow multiple files for admin
  async (req, res) => {
    const username = req.session.user; // Should be 'admin'
    if (!req.files || req.files.length === 0) {
      req.session.error = "No files uploaded.";
      return res.redirect("/admin");
    }

    const uploadedCount = req.files.length;
    let successCount = 0;
    let failedFiles = [];

    for (const file of req.files) {
      const { name, tags } = req.body; // Assuming name/tags are common for all uploaded files if single form
      const savedFilename = file.filename;
      const filePath = path.join(username, savedFilename);

      let thumbnailPath = null;
      try {
        // Generate thumbnail
        const modelUrl = `${res.locals.baseUrl}/uploads/${filePath}`;
        const thumbnailFilename = `${
          path.parse(savedFilename).name
        }_thumbnail.png`;
        thumbnailPath = await generateThumbnail(
          modelUrl,
          thumbnailFilename,
          username,
          res.locals.baseUrl
        );

        await Model.create({
          username: username,
          name: name || path.parse(file.originalname).name, // Use original name if no common name provided
          filename: savedFilename,
          filePath: filePath,
          thumbnailPath: thumbnailPath,
          tags: tags
            ? tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
            : [],
          isLive: false,
        });
        successCount++;
      } catch (error) {
        console.error(
          `Error uploading or processing file ${file.originalname}:`,
          error
        );
        failedFiles.push(file.originalname);
        // Clean up uploaded file if DB/thumbnail fails for this specific file
        await fs.unlink(file.path).catch(console.error);
      }
    }

    if (successCount === uploadedCount) {
      req.session.success = `${successCount} model(s) uploaded successfully!`;
    } else if (successCount > 0) {
      req.session.success = `${successCount} model(s) uploaded successfully, but ${
        failedFiles.length
      } failed: ${failedFiles.join(", ")}`;
    } else {
      req.session.error = `Failed to upload any models. Check server logs.`;
    }
    res.redirect("/admin");
  }
);

// Push Model Live
router.post("/push-live", async (req, res) => {
  const { filename } = req.body; // Using filename for admin actions
  try {
    const model = await Model.findOne({ where: { filename: filename } });
    if (!model) {
      req.session.error = "Model not found.";
      return res.redirect("/admin");
    }
    model.isLive = true;
    await model.save();
    req.session.success = `Model "${model.name}" pushed live!`;
    res.redirect("/admin");
  } catch (error) {
    console.error("Error pushing model live:", error);
    req.session.error = "Failed to push model live.";
    res.redirect("/admin");
  }
});

// Delete Model (Admin)
router.post("/delete", async (req, res) => {
  const { filename } = req.body;
  try {
    const model = await Model.findOne({ where: { filename: filename } });
    if (!model) {
      req.session.error = "Model not found.";
      return res.redirect("/admin");
    }

    // Delete model file and thumbnail from disk
    const modelFilePath = path.join(
      __dirname,
      "..",
      "public",
      "uploads",
      model.filePath
    );
    await fs
      .unlink(modelFilePath)
      .catch((err) =>
        console.error(`Failed to delete model file: ${err.message}`)
      );

    if (model.thumbnailPath) {
      const thumbnailFullPath = path.join(
        __dirname,
        "..",
        "public",
        "uploads",
        model.thumbnailPath
      );
      await fs
        .unlink(thumbnailFullPath)
        .catch((err) =>
          console.error(`Failed to delete thumbnail file: ${err.message}`)
        );
    }

    await model.destroy();
    req.session.success = `Model "${model.name}" deleted successfully.`;
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting model:", error);
    req.session.error = "Failed to delete model.";
    res.redirect("/admin");
  }
});

// Download Live Models Configuration
router.get("/download-live-models", async (req, res) => {
  try {
    const liveModels = await Model.findAll({
      where: { isLive: true },
      attributes: ["name", "filename", "tags", "username", "filePath"],
    });

    const modelsData = liveModels.map((model) => ({
      name: model.name,
      username: model.username,
      filename: model.filename,
      tags: model.tags,
      embedCode: `<model-viewer src="${res.locals.baseUrl}/uploads/${model.filePath}" auto-rotate camera-controls></model-viewer>`,
    }));

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="live_models.json"'
    );
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(modelsData, null, 2));
  } catch (error) {
    console.error("Error generating live models JSON:", error);
    req.session.error = "Failed to generate live models configuration.";
    res.redirect("/admin");
  }
});

module.exports = router;
