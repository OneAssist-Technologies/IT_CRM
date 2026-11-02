import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  signup,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  validateResetToken,
  resetPassword,
} from '../controllers/auth.controller.js';

const router = Router();

// 1. User Registration / Signup
router.post('/signup', signup);
router.post('/register', signup);

// 2. User Authentication / Login
router.post('/login', login);

// 3. User Session Logout
router.post('/logout', logout);

// 4. Current Session Verification (/me or /session)
router.get('/session', requireAuth, getCurrentUser);
router.get('/me', requireAuth, getCurrentUser);

// 5. Dynamic Password Reset Flow
router.post('/forgot-password', forgotPassword);
router.get('/validate-reset-token', validateResetToken);
router.post('/reset-password', resetPassword);

export default router;
