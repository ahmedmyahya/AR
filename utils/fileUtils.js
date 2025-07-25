// utils/fileUtils.js
const path = require('path');
const fs = require('fs/promises'); // Use fs.promises for async file operations

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Function to ensure the uploads directory exists
const ensureUploadsDir = async () => {
    try {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        console.log(`Uploads directory ensured: ${UPLOADS_DIR}`);
    } catch (error) {
        console.error('Failed to create uploads directory:', error);
    }
};

// Call it once when the module is loaded (e.g., when server starts)
ensureUploadsDir();

// Function to delete a file
async function deleteFile(filePath) {
    try {
        await fs.unlink(filePath);
        console.log('File deleted:', filePath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn('Attempted to delete non-existent file:', filePath);
        } else {
            console.error('Error deleting file:', filePath, error);
            throw error;
        }
    }
}


module.exports = {
    UPLOADS_DIR,
    ensureUploadsDir,
    deleteFile,
};