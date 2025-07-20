const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");

const router = express.Router();

// GET /login
router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// POST /login
router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("login", { error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    try {
      const user = await User.findOne({ where: { username } });
      if (!user) {
        return res.render("login", { error: "Invalid username or password" });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.render("login", { error: "Invalid username or password" });
      }

      // Set session and redirect
      req.session.user = {
        id: user.id,
        username: user.username,
        theme: user.theme,
      };

      req.session.save(() => {
        res.redirect("/admin"); // Or /dashboard or wherever
      });
    } catch (err) {
      console.error("Login error:", err);
      res.render("login", { error: "Server error during login" });
    }
  }
);

// GET /logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
