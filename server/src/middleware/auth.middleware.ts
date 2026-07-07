import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, getCachedUser } from '../services/auth.service';
import { User } from '../models/User.model';
import { unauthorizedResponse, forbiddenResponse } from '../utils/apiResponse';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
      userRole?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      unauthorizedResponse(res, 'No token provided');
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from Redis cache or MongoDB
    let user = await getCachedUser(decoded.userId);

    if (!user) {
      user = await User.findById(decoded.userId).lean();
      if (!user) {
        unauthorizedResponse(res, 'User not found');
        return;
      }
    }

    // Check user status
    if (user.status === 'suspended') {
      forbiddenResponse(res, 'Account suspended');
      return;
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    unauthorizedResponse(res, 'Invalid or expired token');
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    let user = await getCachedUser(decoded.userId);
    if (!user) {
      user = await User.findById(decoded.userId).lean();
    }

    if (user) {
      req.user = user;
      req.userId = decoded.userId;
    }
    next();
  } catch {
    next();
  }
};

export const requireEmailVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isEmailVerified) {
    forbiddenResponse(res, 'Email verification required');
    return;
  }
  next();
};

export const requireOnboardingComplete = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.onboardingCompleted) {
    res.status(302).json({
      success: false,
      message: 'Onboarding required',
      redirect: '/onboarding',
    });
    return;
  }
  next();
};
