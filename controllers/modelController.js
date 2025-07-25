// controllers/modelController.js
const db = require('../models'); // Import your models (User, Model) and sequelize
const { Op } = db; // Import Sequelize operators if needed for complex queries
const Model = db.Model;
const User = db.User; // Assuming you might need User model for user-specific actions
const path = require('path');
const fs = require('fs'); // For file system operations (e.g., deleting files)
const { validationResult } = require('express-validator');
const { UPLOADS_DIR } = require('../utils/fileUtils'); // Path to uploads directory

// Helper function to handle common rendering logic for dashboard views
const renderDashboard = async (req, res, models, currentPage, title = 'Model Library') => {
    try {
        const userId = req.session.userId;
        const user = await User.findByPk(userId);

        if (!user) {
            req.flash('error', 'User not found. Please log in again.');
            return res.redirect('/login');
        }

        // Fetch all models for count, regardless of filter for the sidebar counts
        const allUserModels = await Model.findAll({
            where: { userId: userId },
        });
        const totalModels = allUserModels.length;
        const publishedModels = allUserModels.filter(m => m.status === 'deployed').length;
        const draftModels = allUserModels.filter(m => m.status === 'draft').length;

        res.render('models/dashboard', { // Corrected to 'models/dashboard'
            username: user.username, // Use fetched username
            models: models,
            totalModels: totalModels,      // Passed for sidebar counts
            publishedModels: publishedModels, // Passed for sidebar counts
            draftModels: draftModels,      // Passed for sidebar counts
            success: req.flash('success'),
            error: req.flash('error'),
            currentPage: currentPage,
            title: title // Ensure title is passed from the helper
        });
    } catch (error) {
        console.error('Error in renderDashboard helper:', error);
        req.flash('error', 'Could not load dashboard data.');
        res.redirect('/dashboard'); // Redirect to main dashboard on helper error
    }
};

// 1. UI Route: Get the main dashboard with all models
exports.getDashboard = async (req, res) => {
    try {
        const models = await Model.findAll({ where: { userId: req.session.userId } });
        await renderDashboard(req, res, models, 'allModels', 'Model Library'); // Explicitly set title
    } catch (error) {
        console.error('Error fetching all models for dashboard:', error);
        // Error handling inside renderDashboard will handle flashes and redirects
    }
};

// 2. UI Route: Get models with 'deployed' status
exports.getPublishedModels = async (req, res) => {
    try {
        const publishedModels = await Model.findAll({
            where: {
                userId: req.session.userId,
                status: 'deployed'
            }
        });
        await renderDashboard(req, res, publishedModels, 'published', 'Published 3D Models');
    } catch (error) {
        console.error('Error fetching published models:', error);
        // Error handling inside renderDashboard will handle flashes and redirects
    }
};

// 3. UI Route: Get models with 'draft' status
exports.getDraftModels = async (req, res) => {
    try {
        const draftModels = await Model.findAll({
            where: {
                userId: req.session.userId,
                status: 'draft'
            }
        });
        await renderDashboard(req, res, draftModels, 'drafts', 'Draft 3D Models');
    } catch (error) {
        console.error('Error fetching draft models:', error);
        // Error handling inside renderDashboard will handle flashes and redirects
    }
};

// 4. UI Route: Render the upload page
exports.getUploadPage = async (req, res) => { // Made async to await DB calls
    try {
        const userId = req.session.userId;
        const user = await User.findByPk(userId);

        if (!user) {
            req.flash('error', 'User not found. Please log in again.');
            return res.redirect('/login');
        }

        // Fetch all models for counts to pass to sidebar
        const allUserModels = await Model.findAll({
            where: { userId: userId },
        });
        const totalModels = allUserModels.length;
        const publishedModels = allUserModels.filter(m => m.status === 'deployed').length;
        const draftModels = allUserModels.filter(m => m.status === 'draft').length;

        res.render('models/upload', {
            username: user.username, // Use fetched username
            totalModels: totalModels,      // Pass total models count
            publishedModels: publishedModels, // Pass published models count
            draftModels: draftModels,      // Pass draft models count
            success: req.flash('success'),
            error: req.flash('error'),
            currentPage: 'upload', // Set current page for active highlighting
            title: 'Upload Model' // Sets the page title
        });
    } catch (error) {
        console.error('Error fetching data for upload page:', error);
        req.flash('error', 'Could not load upload page data.');
        res.redirect('/dashboard');
    }
};


// 5. UI/API Logic: Handle model upload (used by both /upload and /api/models/upload)
exports.uploadModel = async (req, res) => {
    const errors = validationResult(req);
    // Handle Multer file type error if present
    if (req.fileValidationError) {
        req.flash('error', req.fileValidationError);
        if (req.originalUrl.startsWith('/api')) {
            return res.status(400).json({ success: false, message: req.fileValidationError });
        }
        return res.redirect('/upload');
    }

    // Check for req.files instead of req.file because Multer uses .array()
    if (!req.files || req.files.length === 0) {
        req.flash('error', 'No files uploaded. Please select one or more model files.');
        if (req.originalUrl.startsWith('/api')) {
            return res.status(400).json({ success: false, message: 'No files uploaded.' });
        }
        return res.redirect('/upload');
    }

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        req.flash('error', errorMessages);
        // Clean up all uploaded files if validation fails for any
        req.files.forEach(file => { // Iterate and unlink each file
            fs.unlink(file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
            });
        });
        if (req.originalUrl.startsWith('/api')) {
            return res.status(400).json({ success: false, message: errorMessages });
        }
        return res.redirect('/upload');
    }

    const uploadedModels = [];
    const failedUploads = [];
    const userId = req.session.userId;
    // Get common fields from body, assuming they apply to all files in a multi-upload
    const { modelName: firstModelName, description, tags, status } = req.body;

    for (const [index, file] of req.files.entries()) {
        try {
            const filePath = file.filename; // Only store the filename relative to UPLOADS_DIR
            const fileSize = file.size;
            const mimeType = file.mimetype;

            // For the first file, use the provided modelName. For subsequent, use filename.
            const currentModelName = index === 0 && firstModelName ? firstModelName : path.parse(file.originalname).name;

            // Construct the full hosting link
            const hostingLink = `${req.protocol}://${req.get('host')}/embed/${filePath.split('.')[0]}`; // Uses unique ID as embed link identifier

            const newModel = await Model.create({
                userId,
                modelName: currentModelName,
                description: description || '', // Use common description or empty
                filePath,
                fileSize,
                mimeType,
                hostingLink,
                tags: tags || '', // Use common tags or empty
                status: status || 'draft', // Default to 'draft' if not provided
            });
            uploadedModels.push(newModel);
        } catch (error) {
            console.error(`Error uploading model ${file.originalname}:`, error);
            failedUploads.push(file.originalname);
            // Delete the file if DB save fails
            fs.unlink(file.path, (err) => {
                if (err) console.error('Error deleting failed upload file:', err);
            });
        }
    }

    if (uploadedModels.length > 0) {
        let successMessage = `${uploadedModels.length} model(s) uploaded successfully!`;
        if (failedUploads.length > 0) {
            successMessage += ` (Failed to upload: ${failedUploads.join(', ')})`;
            req.flash('error', `Failed to upload the following models: ${failedUploads.join(', ')}`);
        }
        req.flash('success', successMessage);
        if (req.originalUrl.startsWith('/api')) {
            return res.status(201).json({
                success: true,
                message: successMessage,
                uploaded: uploadedModels,
                failed: failedUploads
            });
        }
        res.redirect('/dashboard');
    } else {
        const errorMessage = failedUploads.length > 0 ? `Failed to upload all models: ${failedUploads.join(', ')}` : 'No models were uploaded.';
        req.flash('error', errorMessage);
        if (req.originalUrl.startsWith('/api')) {
            return res.status(500).json({ success: false, message: errorMessage });
        }
        res.redirect('/upload');
    }
};

// 6. Public Route: Embed a model by its ID (from hostingLink)
exports.embedModel = async (req, res) => {
    try {
        const { modelId } = req.params; // This will be the unique filename ID without extension
        // Find the model by searching for its file path containing the modelId
        const model = await Model.findOne({
            where: {
                filePath: {
                    [Op.like]: `${modelId}.%` // Match any extension for the given ID
                },
                status: 'deployed' // Only allow embedding for deployed models
            }
        });

        if (!model) {
            return res.status(404).render('404', { // Changed to '404' assuming you have a 404.ejs
                message: 'Model not found or not deployed.',
                status: 404,
                title: 'Model Not Found' // <--- ADDED THIS LINE
            });
        }

        // Render a simple EJS template that just contains the model-viewer
        res.render('embed', {
            modelSrc: `/uploads/${model.filePath}`, // Full path to the model file
            modelName: model.modelName,
            title: `Embed ${model.modelName}` // <--- ADDED THIS LINE
        });
    } catch (error) {
        console.error('Error embedding model:', error);
        res.status(500).render('500', { // Changed to '500' assuming you have a 500.ejs
            message: 'Internal server error.',
            status: 500,
            title: 'Server Error' // <--- ADDED THIS LINE
        });
    }
};

// 7. API Route: Bulk Upload Models (Placeholder - requires more detailed implementation)
exports.bulkUploadModels = async (req, res) => {
    // This is a more complex scenario as you'd need to associate data with each file.
    // For simplicity, this is a placeholder. You'd likely need to parse a manifest
    // or handle individual modelName/description/tags per file.
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded for bulk.' });
    }

    const uploadedModels = [];
    const errors = [];

    for (const file of req.files) {
        try {
            // This example assumes basic details; a real bulk upload might need a CSV/JSON manifest
            const modelName = file.originalname.split('.')[0]; // Use filename as modelName
            const filePath = file.filename;
            const fileSize = file.size;
            const mimeType = file.mimetype;
            const userId = req.session.userId;
            const hostingLink = `${req.protocol}://${req.get('host')}/embed/${filePath.split('.')[0]}`;

            const newModel = await Model.create({
                userId,
                modelName,
                filePath,
                fileSize,
                mimeType,
                hostingLink,
                status: 'draft', // Bulk uploads typically start as draft
                description: '', tags: '' // Default empty
            });
            uploadedModels.push(newModel);
        } catch (error) {
            console.error(`Error processing bulk upload for file ${file.originalname}:`, error);
            errors.push({ filename: file.originalname, message: 'Failed to process.' });
            // Clean up file if DB save fails
            fs.unlink(file.path, (err) => {
                if (err) console.error('Error deleting failed bulk upload file:', err);
            });
        }
    }

    if (errors.length > 0) {
        return res.status(207).json({ // 207 Multi-Status
            success: true,
            message: 'Some models uploaded successfully, others failed.',
            uploaded: uploadedModels,
            failed: errors
        });
    }

    res.status(201).json({ success: true, message: 'All models uploaded successfully!', models: uploadedModels });
};

// 8. API Route: Get all models for the authenticated user
exports.getAllUserModels = async (req, res) => {
    try {
        const models = await Model.findAll({ where: { userId: req.session.userId } });
        res.status(200).json({ success: true, models });
    } catch (error) {
        console.error('Error fetching user models via API:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve models.' });
    }
};

// 9. API Route: Get a specific model by ID
exports.getModelById = async (req, res) => {
    try {
        const { modelId } = req.params;
        const model = await Model.findOne({
            where: {
                id: modelId,
                userId: req.session.userId // Ensure model belongs to the user
            }
        });

        if (!model) {
            return res.status(404).json({ success: false, message: 'Model not found.' });
        }
        res.status(200).json({ success: true, model });
    } catch (error) {
        console.error('Error fetching model by ID via API:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve model.' });
    }
};

// 10. API Route: Update model details
exports.updateModel = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array().map(err => err.msg).join(', ') });
    }

    try {
        const { modelId } = req.params;
        const { modelName, description, tags, status } = req.body;

        const model = await Model.findOne({
            where: {
                id: modelId,
                userId: req.session.userId // Ensure model belongs to the user
            }
        });

        if (!model) {
            return res.status(404).json({ success: false, message: 'Model not found or unauthorized.' });
        }

        // Update fields if provided
        if (modelName !== undefined) model.modelName = modelName;
        if (description !== undefined) model.description = description;
        if (tags !== undefined) model.tags = tags;
        if (status !== undefined) model.status = status;

        await model.save();

        res.status(200).json({ success: true, message: 'Model updated successfully!', model });
    } catch (error) {
        console.error('Error updating model:', error);
        res.status(500).json({ success: false, message: 'Failed to update model.' });
    }
};

// 11. API Route: Update model status (e.g., draft to deployed)
exports.updateModelStatus = async (req, res) => {
    try {
        const { modelId } = req.params;
        const { status } = req.body;

        if (!status || !['draft', 'deployed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status provided. Must be "draft" or "deployed".' });
        }

        const model = await Model.findOne({
            where: {
                id: modelId,
                userId: req.session.userId // Ensure model belongs to the user
            }
        });

        if (!model) {
            return res.status(404).json({ success: false, message: 'Model not found or unauthorized.' });
        }

        model.status = status;
        await model.save();

        // For API calls, respond with JSON. Frontend JS will handle refreshing or updating UI.
        res.status(200).json({ success: true, message: `Model status updated to ${status}.`, model });
    } catch (error) {
        console.error('Error updating model status:', error);
        res.status(500).json({ success: false, message: 'Failed to update model status.' });
    }
};

// 12. API Route: Delete a model
exports.deleteModel = async (req, res) => {
    try {
        const { modelId } = req.params;

        const model = await Model.findOne({
            where: {
                id: modelId,
                userId: req.session.userId // Ensure model belongs to the user
            }
        });

        if (!model) {
            // Check if it's a UI form submission (not an API call)
            if (req.method === 'POST' && !req.originalUrl.startsWith('/api')) { // Using POST for _method=DELETE
                req.flash('error', 'Model not found or unauthorized to delete.');
                return res.redirect('/dashboard');
            }
            return res.status(404).json({ success: false, message: 'Model not found or unauthorized to delete.' });
        }

        const filePath = path.join(UPLOADS_DIR, model.filePath);

        // Delete the file from the file system first
        fs.unlink(filePath, async (err) => {
            if (err) {
                console.error('Error deleting model file from disk:', err);
                // Even if file deletion fails, attempt to remove from DB, but report error
                if (req.originalUrl.startsWith('/api')) {
                    return res.status(500).json({ success: false, message: 'Failed to delete model file from disk, but attempting to remove database entry.' });
                } else {
                    req.flash('error', 'Failed to delete model file from disk. Database entry will be removed.');
                }
            }

            // Then delete the record from the database
            await model.destroy();

            if (req.originalUrl.startsWith('/api')) {
                return res.status(200).json({ success: true, message: 'Model deleted successfully!' });
            }
            req.flash('success', `${model.modelName} deleted successfully!`);
            res.redirect('/dashboard');
        });

    } catch (error) {
        console.error('Error deleting model:', error);
        if (req.originalUrl.startsWith('/api')) {
            return res.status(500).json({ success: false, message: 'Failed to delete model.' });
        }
        req.flash('error', 'Failed to delete model.');
        res.redirect('/dashboard');
    }
};
