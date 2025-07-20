// services/thumbnailGenerator.js
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// Basic logging for this service
const logger = {
  debug: (message) => console.log(`[THUMBNAIL DEBUG] ${message}`),
  info: (message) => console.log(`[THUMBNAIL INFO] ${message}`),
  warn: (message) => console.warn(`[THUMBNAIL WARN] ${message}`),
  error: (message, error) =>
    console.error(`[THUMBNAIL ERROR] ${message}`, error?.stack || error),
};

const THUMBNAIL_DIR_NAME = "thumbnails";
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;

/**
 * Generates a thumbnail for a given model URL.
 * @param {string} modelUrl The full URL to the GLB model file (e.g., http://localhost:3000/uploads/user/model.glb).
 * @param {string} outputFilename The desired filename for the thumbnail (e.g., 'model_thumbnail.png').
 * @param {string} username The username, used to create a dedicated thumbnail directory for the user.
 * @param {string} baseUrl The base URL of the application (e.g., 'http://localhost:3000').
 * @returns {Promise<string|null>} The relative path to the saved thumbnail file (e.g., 'username/thumbnails/model_thumbnail.png'), or null if failed.
 */
async function generateThumbnail(modelUrl, outputFilename, username, baseUrl) {
  let browser;
  try {
    const userThumbnailDir = path.join(
      __dirname,
      "..",
      "public",
      "uploads",
      username,
      THUMBNAIL_DIR_NAME
    );
    if (!fs.existsSync(userThumbnailDir)) {
      fs.mkdirSync(userThumbnailDir, { recursive: true });
      logger.info(`Created user thumbnail directory: ${userThumbnailDir}`);
    }

    const outputPath = path.join(userThumbnailDir, outputFilename);
    const relativeOutputPath = path.join(
      username,
      THUMBNAIL_DIR_NAME,
      outputFilename
    ); // Path for public access

    browser = await puppeteer.launch({
      headless: true, // Use 'new' for new headless mode
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setViewport({
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
    });

    // Construct the URL to the isolated viewer correctly
    // modelUrl is like http://localhost:3000/uploads/user1/model.glb
    // We need to extract 'user1/model.glb' part for the viewer
    const modelPathSegments = modelUrl.split("/uploads/")[1]; // Gets "user1/model.glb"
    const viewerPageUrl = `${baseUrl}/isolated-viewer?model=${modelPathSegments}`;

    logger.debug(`Navigating Puppeteer to: ${viewerPageUrl}`);

    await page.goto(viewerPageUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.evaluate(() => {
      return new Promise((resolve) => {
        const modelViewer = document.querySelector("model-viewer");
        if (modelViewer) {
          modelViewer.addEventListener(
            "load",
            () => {
              console.log("model-viewer loaded content!");
              resolve();
            },
            { once: true }
          );
          // If model is already loaded (e.g., from cache or very fast network)
          if (modelViewer.modelIsVisible) {
            resolve();
          }
        } else {
          console.warn("No model-viewer element found on the page.");
          resolve(); // Resolve anyway to prevent hanging
        }
      });
    });

    await page.screenshot({
      path: outputPath,
      type: "png",
      omitBackground: true,
    });
    logger.info(`Thumbnail generated: ${outputPath}`);
    return relativeOutputPath;
  } catch (error) {
    logger.error(
      `Failed to generate thumbnail for ${modelUrl} using viewer URL ${baseUrl}/isolated-viewer...: ${error.message}`,
      error
    );
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generateThumbnail,
  THUMBNAIL_DIR_NAME,
};
