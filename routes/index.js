import express from 'express';
import AuthController from '../controllers/AuthController.js';
import UsersController from '../controllers/UsersController.js';

const router = express.Router();

// Define the routes
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew);

// Authentication routes
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', AuthController.getMe);

export default router;
