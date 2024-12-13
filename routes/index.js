import express from 'express';
import AppController from '../controllers/AppController.js';
import AuthController from '../controllers/AuthController.js';
import UsersController from '../controllers/UsersController.js';
import FilesController from '../controllers/FilesController.js';

const router = express.Router();

// Application status and statistics routes
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// User management routes
router.post('/users', UsersController.postNew);

// Authentication routes
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', AuthController.getMe);

// File management routes
router.post('/files', FilesController.postUpload); // Upload a file or create a folder
router.get('/files', FilesController.getIndex); // List files with pagination
router.get('/files/:id', FilesController.getShow); // Get details of a specific file
router.put('/files/:id/publish', FilesController.putPublish); // Publish a file
router.put('/files/:id/unpublish', FilesController.putUnpublish); // Unpublish a file
router.get('/files/:id/data', FilesController.getFile); // Get file content

export default router;
