import express from 'express';
import {
  registerUser,
  authUser,
  getUserProfile,
  searchUsers,
  googleLogin,
  updateUserProfile,
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/google', googleLogin);

// Protected routes
router.get('/me', protect, getUserProfile);
router.get('/', protect, searchUsers);
router.put('/profile', protect, updateUserProfile);

export default router;

