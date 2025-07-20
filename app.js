require("dotenv").config();

const express = require("express");
const multer = require("multer");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcryptjs");
const { sequelize, User, Model } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const SESSION_SECRET =
  process.env.SESSION_SECRET || "super-secret-key-fallback";

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session setup
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new (require("session-file-store")(session))({
      path: "./sessions",
      retries: 5,
      logFn: function () {},
    }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static folders
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Set user info for templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) next();
  else res.redirect("/login");
};

// Multer setup (adjust file storage as you have)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: function (req, file, cb) {
    // Use original name or customize filename here
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".glb", ".gltf", ".obj", ".fbx", ".zip", ".rar"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// Routes simplified for brevity:

app.get("/", (req, res) => {
  res.render("index", { user: req.session.user });
});

app.get("/login", (req, res) => {
  res.render("login", { error: req.query.error });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findByPk(username);
    if (!user) return res.redirect("/login?error=Invalid username or password");
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.user = username;
      res.redirect("/dashboard");
    } else {
      res.redirect("/login?error=Invalid username or password");
    }
  } catch {
    res.status(500).render("error", { message: "Login failed", status: 500 });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

app.get("/dashboard", isAuthenticated, async (req, res) => {
  const username = req.session.user;
  try {
    const models = await Model.findAll({
      where: { username },
      order: [["createdAt", "DESC"]],
    });
    res.render("dashboard", { user: { username }, models });
  } catch {
    res
      .status(500)
      .render("error", { message: "Error loading dashboard.", status: 500 });
  }
});

app.get("/upload", isAuthenticated, (req, res) => {
  res.render("upload", { error: null });
});

app.post(
  "/upload",
  isAuthenticated,
  upload.single("modelFile"),
  async (req, res) => {
    try {
      if (!req.file) throw new Error("File upload failed.");
      await Model.create({
        username: req.session.user,
        title: req.body.title,
        description: req.body.description,
        name: path.parse(req.file.originalname).name,
        extension: path.extname(req.file.originalname).slice(1),
        filename: req.file.filename,
        tags: req.body.tags
          ? req.body.tags.split(",").map((t) => t.trim())
          : [],
      });
      res.redirect("/dashboard");
    } catch (err) {
      res
        .status(500)
        .render("upload", { error: err.message || "Upload failed." });
    }
  }
);

// Viewer route (pass modelPath safely)
app.get("/viewer", (req, res) => {
  const modelPath = req.query.model || "";
  console.log("Viewer request received:", modelPath);
  res.render("viewer", { modelPath });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(err.status || 500)
    .render("error", {
      message: err.message || "Something went wrong!",
      status: err.status || 500,
    });
});

// DB sync + start server
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at ${BASE_URL}`);
  });
});
