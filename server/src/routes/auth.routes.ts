import { Router } from 'express';
import passport from 'passport';
import {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
  updateProfile,
  completeOnboarding,
  resendOTP,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.middleware';
import { z } from 'zod';

const router = Router();

// Auth rate-limited routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/verify-email', validateBody(z.object({ email: z.string().email(), otp: z.string().length(6) })), verifyEmail);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', otpLimiter, resendOTP);

// Token routes
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

// Protected routes
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.post('/complete-onboarding', authenticate, completeOnboarding);

export default router;
