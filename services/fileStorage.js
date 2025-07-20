// services/fileStorage.js
const path = require("path");
const fs = require("fs"); // Using fs for synchronous mkdirSync as it's typically fine for this setup

/**
 * Provides the destination path for Multer uploads.
 * Ensures the user's upload directory exists.
 */
function getMulterDestination() {
  return (req, file, cb) => {
    const username = req.session.user;
    if (!username) {
      // This should ideally be caught by requireLogin middleware before Multer runs,
      // but good to have a fallback.
      return cb(new Error("Unauthorized: User not logged in."), false);
    }
    const uploadPath = path.join(
      __dirname,
      "..", // services
      "..", // root
      "public",
      "uploads",
      username
    );
    // Use synchronous mkdirSync as Multer's destination callback expects it to be ready
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  };
}

/**
 * Provides the filename for Multer uploads.
 * Appends a timestamp to ensure unique filenames.
 */
function getMulterFilename() {
  return (req, file, cb) => {
    const originalname = file.originalname;
    const extension = path.extname(originalname);
    const basename = path.basename(originalname, extension);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${basename}${extension}`);
  };
}

module.exports = {
  getMulterDestination,
  getMulterFilename,
};
