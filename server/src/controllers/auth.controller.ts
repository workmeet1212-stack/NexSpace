// auth.controller.ts

import { Request, Response } from 'express';
import { z } from 'zod';
import {
  generateTokens,
  verifyRefreshToken,
  sendOTP,
  verifyOTP,
  findUserByEmail,
  findUserById,
  createUser,
  updateUserLastLogin,
  markEmailVerified,
  updatePassword,
  revokeAllUserTokens,
  cacheUser,
  getCachedUser,
} from '../services/auth.service';
import { sendOTPEmail, sendWelcomeEmail } from '../services/email.service';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { sanitizeEmail, generateUUID, slugify } from '../utils/helpers';
import { env } from '../config/env';
import passport from 'passport';

// ✅ Validation schemas — NO `body:` wrapper
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8).max(100),
});

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // ✅ 'lax' for OAuth redirect to work
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Register
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = registerSchema.parse(req.body);
  const sanitizedEmail = sanitizeEmail(email);

  const existingUser = await findUserByEmail(sanitizedEmail);
  if (existingUser) {
    errorResponse({ res, message: 'Email already registered', statusCode: 409 });
    return;
  }

  const user = await createUser({
    name,
    email: sanitizedEmail,
    password,
    provider: 'local',
  });

  const { otp } = await sendOTP(sanitizedEmail, 'email_verify');
  await sendOTPEmail({ email: sanitizedEmail, name, otp, purpose: 'email_verify' });

  successResponse({
    res,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    },
    message: 'Registration successful. Please verify your email.',
    statusCode: 201,
  });
};

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = loginSchema.parse(req.body);
  const sanitizedEmail = sanitizeEmail(email);

  const user = await findUserByEmail(sanitizedEmail);
  if (!user) {
    errorResponse({ res, message: 'Invalid credentials', statusCode: 401 });
    return;
  }

  if (user.status === 'suspended') {
    errorResponse({ res, message: 'Account suspended', statusCode: 403 });
    return;
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    errorResponse({ res, message: 'Invalid credentials', statusCode: 401 });
    return;
  }

  if (!user.isEmailVerified) {
    errorResponse({
      res,
      message: 'Please verify your email first',
      statusCode: 403,
      error: { requiresVerification: true },
    });
    return;
  }

  if (user.twoFactorEnabled) {
    successResponse({
      res,
      data: { requiresTwoFactor: true, userId: user._id },
      message: 'Two-factor authentication required',
    });
    return;
  }

  const { accessToken, refreshToken } = await generateTokens(user._id.toString());
  await cacheUser(user);
  await updateUserLastLogin(user._id.toString());
  res.cookie('refreshToken', refreshToken, cookieOptions);

  successResponse({
    res,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        onboardingCompleted: user.onboardingCompleted,
        preferences: user.preferences,
      },
      accessToken,
    },
    message: 'Login successful',
  });
};

// Refresh token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    errorResponse({ res, message: 'No refresh token provided', statusCode: 401 });
    return;
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } = await verifyRefreshToken(token);
    res.cookie('refreshToken', newRefreshToken, cookieOptions);
    successResponse({ res, data: { accessToken }, message: 'Token refreshed' });
  } catch {
    res.clearCookie('refreshToken');
    errorResponse({ res, message: 'Invalid refresh token', statusCode: 401 });
  }
};

// Logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      if (decoded?.userId && decoded?.tokenId) {
        await revokeAllUserTokens(decoded.userId);
      }
    } catch {}
  }

  res.clearCookie('refreshToken');
  successResponse({ res, data: null, message: 'Logged out successfully' });
};

// Verify email
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = verifyEmailSchema.parse(req.body);
  const sanitizedEmail = sanitizeEmail(email);

  try {
    await verifyOTP(sanitizedEmail, 'email_verify', otp);
  } catch (error: any) {
    errorResponse({ res, message: error.message, statusCode: 400 });
    return;
  }

  const user = await findUserByEmail(sanitizedEmail);
  if (!user) {
    errorResponse({ res, message: 'User not found', statusCode: 404 });
    return;
  }

  await markEmailVerified(user._id.toString());
  const { accessToken, refreshToken } = await generateTokens(user._id.toString());
  await cacheUser(user);
  res.cookie('refreshToken', refreshToken, cookieOptions);
  await sendWelcomeEmail(sanitizedEmail, user.name);

  successResponse({
    res,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: true,
        onboardingCompleted: user.onboardingCompleted,
        preferences: user.preferences,
      },
      accessToken,
    },
    message: 'Email verified successfully',
  });
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const sanitizedEmail = sanitizeEmail(email);

  const user = await findUserByEmail(sanitizedEmail);
  if (!user) {
    successResponse({
      res,
      data: null,
      message: 'If the email exists, you will receive a reset code',
    });
    return;
  }

  const { otp } = await sendOTP(sanitizedEmail, 'password_reset');
  await sendOTPEmail({
    email: sanitizedEmail,
    name: user.name,
    otp,
    purpose: 'password_reset',
  });

  successResponse({
    res,
    data: null,
    message: 'If the email exists, you will receive a reset code',
  });
};

// Reset password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, otp, newPassword } = resetPasswordSchema.parse(req.body);
  const sanitizedEmail = sanitizeEmail(email);

  try {
    await verifyOTP(sanitizedEmail, 'password_reset', otp);
  } catch (error: any) {
    errorResponse({ res, message: error.message, statusCode: 400 });
    return;
  }

  const user = await findUserByEmail(sanitizedEmail);
  if (!user) {
    errorResponse({ res, message: 'User not found', statusCode: 404 });
    return;
  }

  await updatePassword(user._id.toString(), newPassword);
  await revokeAllUserTokens(user._id.toString());

  successResponse({ res, data: null, message: 'Password reset successful' });
};

// Get current user
export const getMe = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    errorResponse({ res, message: 'Not authenticated', statusCode: 401 });
    return;
  }

  let user = await getCachedUser(userId);

  if (!user) {
    user = await findUserById(userId);
    if (user) await cacheUser(user);
  }

  if (!user) {
    errorResponse({ res, message: 'User not found', statusCode: 404 });
    return;
  }

  successResponse({ res, data: user, message: 'User fetched successfully' });
};

// Google OAuth
export const googleAuth = passport.authenticate('google', {
  scope: ['email', 'profile'],
  session: false,
});

export const googleCallback = (req: Request, res: Response): void => {
  passport.authenticate(
    'google',
    { session: false },
    async (err: any, user: any) => {
      if (err || !user) {
        return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
      }

      const { accessToken, refreshToken } = await generateTokens(user._id.toString());
      await cacheUser(user);
      await updateUserLastLogin(user._id.toString());

      res.cookie('refreshToken', refreshToken, cookieOptions);
      res.redirect(`${env.CLIENT_URL}/auth/callback?token=${accessToken}`);
    }
  )(req, res);
};

// GitHub OAuth
export const githubAuth = passport.authenticate('github', {
  scope: ['user:email'],
  session: false,
});

export const githubCallback = (req: Request, res: Response): void => {
  passport.authenticate(
    'github',
    { session: false },
    async (err: any, user: any) => {
      if (err || !user) {
        return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
      }

      const { accessToken, refreshToken } = await generateTokens(user._id.toString());
      await cacheUser(user);
      await updateUserLastLogin(user._id.toString());

      res.cookie('refreshToken', refreshToken, cookieOptions);
      res.redirect(`${env.CLIENT_URL}/auth/callback?token=${accessToken}`);
    }
  )(req, res);
};

// Update profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  const { name, avatar, preferences } = req.body;

  const user = await findUserById(userId!);
  if (!user) {
    errorResponse({ res, message: 'User not found', statusCode: 404 });
    return;
  }

  if (name) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;
  if (preferences) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  await user.save();
  await cacheUser(user);

  successResponse({
    res,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      preferences: user.preferences,
    },
    message: 'Profile updated successfully',
  });
};

// Complete onboarding
export const completeOnboarding = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  const user = await findUserById(userId!);

  if (!user) {
    errorResponse({ res, message: 'User not found', statusCode: 404 });
    return;
  }

  user.onboardingCompleted = true;
  await user.save();
  await cacheUser(user);

  successResponse({
    res,
    data: { _id: user._id, onboardingCompleted: user.onboardingCompleted },
    message: 'Onboarding completed',
  });
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  const { email, purpose } = req.body;
  const sanitizedEmail = sanitizeEmail(email);

  const user = await findUserByEmail(sanitizedEmail);
  if (!user) {
    successResponse({
      res,
      data: null,
      message: 'If the email exists, you will receive a new code',
    });
    return;
  }

  try {
    const { otp } = await sendOTP(sanitizedEmail, purpose);
    await sendOTPEmail({ email: sanitizedEmail, name: user.name, otp, purpose });
    successResponse({ res, data: null, message: 'New verification code sent' });
  } catch (error: any) {
    errorResponse({ res, message: error.message, statusCode: 429 });
  }
};