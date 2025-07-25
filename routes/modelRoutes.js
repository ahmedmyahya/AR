// routes/modelRoutes.js
const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const modelController = require('../controllers/modelController');
const { isAuthenticated, isAuthenticatedApi } = require('../middleware/authMiddleware');
const { UPLOADS_DIR } = require('../utils/fileUtils'); // Ensure UPLOADS_DIR is exported from fileUtils
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Import uuid for unique filenames

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4(); // Generate a UUID
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueId}${ext}`); // Filename will be like 'a1b2c3d4-e5f6-7890-1234-567890abcdef.glb'
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit per file
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['model/gltf-binary', 'model/gltf+json'];
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.glb', '.gltf'];

        if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            req.fileValidationError = 'Invalid file type. Only GLB/GLTF models are allowed.';
            cb(null, false); // Reject the file
        }
    },
});

// Custom validation for modelName based on file count
const conditionalModelNameValidation = () => {
    return body('modelName')
        .custom((value, { req }) => {
            if (req.files && req.files.length === 1 && (!value || value.trim() === '')) {
                throw new Error('Model name is required for single file uploads.');
            }
            return true;
        })
        .optional();
};


// --- UI Routes (Protected) ---
router.get('/dashboard', isAuthenticated, modelController.getDashboard);
router.get('/dashboard/published', isAuthenticated, modelController.getPublishedModels);
router.get('/dashboard/drafts', isAuthenticated, modelController.getDraftModels);
router.get('/upload', isAuthenticated, modelController.getUploadPage);

// Apply conditional modelName validation here
router.post(
    '/upload',
    isAuthenticated,
    upload.array('modelFile'), // Correctly handles multiple files
    (req, res, next) => { // Add this middleware for debugging
        next(); // Pass control to the next middleware (modelController.uploadModel)
    },
    [
        conditionalModelNameValidation(),
        body('description').optional().trim(),
        body('tags').optional().trim().isLength({ max: 255 }).withMessage('Tags cannot exceed 255 characters.'),
    ],
    modelController.uploadModel
);

// --- Public Embed Route ---
router.get('/embed/:modelId', modelController.embedModel);


// --- API Routes (Protected) ---
router.post(
    '/api/models/upload',
    isAuthenticatedApi,
    upload.array('modelFile'),
    (req, res, next) => { // Add this middleware for debugging API route too
        next();
    },
    [
        conditionalModelNameValidation(),
        body('description').optional().trim(),
        body('tags').optional().trim().isLength({ max: 255 }).withMessage('Tags cannot exceed 255 characters.'),
    ],
    modelController.uploadModel
);

router.post(
    '/api/models/bulkUpload',
    isAuthenticatedApi,
    upload.array('modelFiles', 10),
    modelController.bulkUploadModels
);

router.get('/api/models', isAuthenticatedApi, modelController.getAllUserModels);
router.get('/api/models/:modelId', isAuthenticatedApi, modelController.getModelById);
router.put(
    '/api/models/:modelId',
    isAuthenticatedApi,
    [
        body('modelName').optional().trim().notEmpty().withMessage('Model name cannot be empty.'),
        body('description').optional().trim(),
        body('tags').optional().trim().isLength({ max: 255 }).withMessage('Tags cannot exceed 255 characters.'),
        body('status').optional().isIn(['draft', 'deployed']).withMessage('Status must be "draft" or "deployed".'),
    ],
    modelController.updateModel
);
router.put('/api/models/:modelId/status', isAuthenticatedApi, modelController.updateModelStatus);
router.delete('/api/models/:modelId', isAuthenticatedApi, modelController.deleteModel);


module.exports = router;
