import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { redis, RedisKeys, TTL } from '../config/redis';
import { env } from '../config/env';
import { User, IUser } from '../models/User.model';
import { generateOTP } from '../utils/helpers';

interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
  tokenId?: string;
}

interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = async (userId: string): Promise<GeneratedTokens> => {
  const tokenId = uuidv4();

  // Generate access token (15 minutes)
  const accessToken = jwt.sign(
    { userId, type: 'access' } as TokenPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );

  // Generate refresh token (7 days)
  const refreshToken = jwt.sign(
    { userId, tokenId, type: 'refresh' } as TokenPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY }
  );

  // Store refresh token in Redis
  await redis.setex(
    RedisKeys.refreshToken(userId, tokenId),
    TTL.REFRESH_TOKEN,
    JSON.stringify({ userId, createdAt: new Date().toISOString() })
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch (error: any) {
    console.log('🔴 JWT Verify Error:', error.name, error.message);
    console.log('🔴 Token:', token.substring(0, 50) + '...');
    console.log('🔴 Secret first 10 chars:', env.JWT_ACCESS_SECRET.substring(0, 10));
    throw new Error('Invalid or expired access token');
  }
};

export const verifyRefreshToken = async (token: string): Promise<GeneratedTokens> => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if refresh token exists in Redis
    const redisKey = RedisKeys.refreshToken(decoded.userId, decoded.tokenId!);
    const storedToken = await redis.get(redisKey);

    if (!storedToken) {
      throw new Error('Token revoked');
    }

    // Delete old refresh token (rotation)
    await redis.del(redisKey);

    // Generate new token pair
    return generateTokens(decoded.userId);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Invalid or expired refresh token');
  }
};

export const revokeRefreshToken = async (userId: string, tokenId: string): Promise<void> => {
  const redisKey = RedisKeys.refreshToken(userId, tokenId);
  await redis.del(redisKey);
};

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  // Find all refresh tokens for the user and delete them
  const pattern = RedisKeys.refreshToken(userId, '*');
  let cursor = 0;
  do {
    const result = await redis.scan(cursor, { match: pattern, count: 100 });
    cursor = result[0];
    const keys = result[1];
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== 0);
};

export const sendOTP = async (
  email: string,
  purpose: 'email_verify' | 'password_reset'
): Promise<{ otp: string; expiresIn: number }> => {
  // Check rate limit
  const attemptsKey = RedisKeys.otpAttempts(email, purpose);
  const attempts = await redis.get(attemptsKey);
  const attemptCount = attempts ? parseInt(attempts as string) : 0;

  if (attemptCount >= 3) {
    throw new Error('Too many OTP requests. Please try again later.');
  }

  // Generate OTP
  const otp = generateOTP();

  // Store OTP in Redis
  const otpKey = RedisKeys.otp(email, purpose);
  await redis.setex(
    otpKey,
    TTL.OTP,
    JSON.stringify({ code: otp, attempts: 0, createdAt: new Date().toISOString() })
  );

  // Increment attempts counter
  await redis.setex(attemptsKey, TTL.OTP_ATTEMPTS, attemptCount + 1);

  return { otp, expiresIn: TTL.OTP };
};

export const verifyOTP = async (
  email: string,
  purpose: 'email_verify' | 'password_reset',
  code: string
): Promise<boolean> => {
  const otpKey = RedisKeys.otp(email, purpose);
  const storedData = await redis.get(otpKey);

  if (!storedData) {
    throw new Error('OTP expired or not found');
  }

  const stored = JSON.parse(storedData as string);

  // Check attempts
  if (stored.attempts >= 3) {
    await redis.del(otpKey);
    throw new Error('Too many failed attempts');
  }

  // Verify code
  if (stored.code !== code) {
    // Increment attempts
    stored.attempts += 1;
    await redis.setex(otpKey, TTL.OTP, JSON.stringify(stored));
    throw new Error('Invalid OTP');
  }

  // Delete OTP on success
  await redis.del(otpKey);
  return true;
};

export const cacheUser = async (user: IUser): Promise<void> => {
  const cacheKey = RedisKeys.cacheUser(user._id.toString());
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    onboardingCompleted: user.onboardingCompleted,
    preferences: user.preferences,
    status: user.status,
    provider: user.provider,
  };
  await redis.setex(cacheKey, TTL.USER_CACHE, JSON.stringify(userData));
};

export const getCachedUser = async (userId: string): Promise<any | null> => {
  const cacheKey = RedisKeys.cacheUser(userId);
  const cached = await redis.get(cacheKey);
  
  if (!cached) return null;

  // ✅ Handle both string and object
  if (typeof cached === 'string') {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  
  return cached; // Already parsed
};

export const invalidateUserCache = async (userId: string): Promise<void> => {
  const cacheKey = RedisKeys.cacheUser(userId);
  await redis.del(cacheKey);
};

export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email: email.toLowerCase() }).select('+password');
};

export const findUserById = async (id: string): Promise<IUser | null> => {
  return User.findById(id);
};

export const createUser = async (userData: Partial<IUser>): Promise<IUser> => {
  const user = new User(userData);
  await user.save();
  return user;
};

export const updateUserLastLogin = async (userId: string): Promise<void> => {
  await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
};

export const markEmailVerified = async (userId: string): Promise<void> => {
  await User.findByIdAndUpdate(userId, { isEmailVerified: true });
};

export const updatePassword = async (userId: string, newPassword: string): Promise<void> => {
  await User.findByIdAndUpdate(userId, {
    password: newPassword,
    passwordChangedAt: new Date(),
  });
};
