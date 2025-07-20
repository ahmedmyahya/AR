// routes/galleryRoutes.js
const express = require("express");
const router = express.Router();
const { Model } = require("../database");
const { Op } = require("sequelize");

// Gallery View (Public)
router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const offset = (page - 1) * limit;
  const currentSearch = req.query.search || "";
  const currentTags = req.query.tags || "";

  let whereClause = {
    isLive: true,
  };

  if (currentSearch) {
    whereClause.name = { [Op.like]: `%${currentSearch}%` };
  }

  if (currentTags) {
    const tagsArray = currentTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tagsArray.length > 0) {
      // Use JSON_CONTAINS for SQLite or ARRAY_OVERLAP for PostgreSQL if needed,
      // for SQLite, checking if each tag is present in the JSON array as a string.
      // This is a common way to query JSON arrays in SQLite with Sequelize.
      whereClause.tags = {
        [Op.and]: tagsArray.map((tag) => ({
          // This will search for the tag within the JSON string representation
          // of the tags array. This is a common pattern for SQLite JSON.
          tags: { [Op.like]: `%\"${tag}\"%` },
        })),
      };
    }
  }

  try {
    const { count, rows: models } = await Model.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.render("gallery", {
      user: res.locals.user,
      models: models,
      totalModels: count,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
      currentSearch: currentSearch,
      currentTags: currentTags,
    });
  } catch (error) {
    console.error("Error fetching gallery models:", error);
    res.status(500).render("error", {
      message:
        "Could not retrieve models for the gallery. Please try again later.",
      status: 500,
    });
  }
});

// 3D Model Viewer Page (Public)
router.get("/viewer", async (req, res) => {
  const modelPath = req.query.model; // e.g., 'username/filename.glb'

  if (!modelPath) {
    req.session.error = "No model specified for viewing.";
    return res.redirect("/gallery");
  }

  try {
    // Extract filename and username from modelPath
    const parts = modelPath.split("/");
    const username = parts[0];
    const filename = parts[1];

    const model = await Model.findOne({
      where: {
        username: username,
        filename: filename,
        isLive: true, // Only allow viewing of live models
      },
    });

    if (!model) {
      req.session.error =
        "Model not found or is not available for public viewing.";
      return res.redirect("/gallery");
    }

    const fullModelUrl = `${res.locals.baseUrl}/uploads/${model.filePath}`;

    // Basic viewer configuration (can be expanded)
    const viewerConfig = {
      ar: true,
      cameraControls: true,
      autoRotate: true,
      shadowIntensity: 1,
      environmentImage: "neutral", // You can use a specific path if you have one
      exposure: 1,
    };

    res.render("viewer", {
      user: res.locals.user,
      model: model,
      fullModelUrl: fullModelUrl,
      viewerConfig: viewerConfig,
    });
  } catch (error) {
    console.error(`Error loading viewer for model '${modelPath}':`, error);
    res.status(500).render("error", {
      message: "Error loading 3D model viewer.",
      status: 500,
    });
  }
});

module.exports = router;
