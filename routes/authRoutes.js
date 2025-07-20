// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { User } = require("../database");
const bcrypt = require("bcryptjs");
const {
  validateLogin,
  validateUserTheme,
  handleValidationErrors,
  requireLogin,
} = require("../middleware/auth");

// Login Post (handles user login)
router.post(
  "/login",
  validateLogin,
  handleValidationErrors,
  async (req, res) => {
    const { username, password } = req.body;

    try {
      const user = await User.findByPk(username);
      if (user && (await bcrypt.compare(password, user.password))) {
        req.session.user = user.username;
        req.session.success = `Welcome, ${user.username}!`;
        res.redirect("/dashboard");
      } else {
        req.session.error = "Invalid username or password.";
        res.redirect("/login");
      }
    } catch (error) {
      console.error("Login error:", error);
      req.session.error = "An error occurred during login. Please try again.";
      res.redirect("/login");
    }
  }
);

// Logout Route
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Could not log out.");
    }
    res.redirect("/");
  });
});

// Set Theme Route (accessible by logged-in users)
router.post(
  "/set-theme",
  requireLogin,
  validateUserTheme,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { theme } = req.body;
      const user = await User.findByPk(req.session.user);
      if (user) {
        user.theme = theme;
        await user.save();
        res.json({ success: true, message: "Theme updated successfully." });
      } else {
        res.status(404).json({ success: false, message: "User not found." });
      }
    } catch (error) {
      console.error("Error setting theme:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update theme." });
    }
  }
);

module.exports = router;
