import { Redis } from '@upstash/redis';
import { env } from './env';

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

// Redis key patterns:
// refresh:{userId}:{tokenId} → refresh token (TTL 7d)
// otp:{email}:{purpose} → OTP code (TTL 10m)
// otp_attempts:{email}:{purpose} → OTP attempts count (TTL 15m)
// session:{userId} → user sessions list
// cache:dashboard:{workspaceId} → dashboard cache (TTL 5m)
// cache:user:{userId} → user profile (TTL 1h)
// presence:{projectId} → online users set
// chat:{userId}:{projectId} → AI chat history (TTL 24h)
// ai:cache:{hash} → AI response cache (TTL 1h)

export const RedisKeys = {
  refreshToken: (userId: string, tokenId: string) => `refresh:${userId}:${tokenId}`,
  otp: (email: string, purpose: string) => `otp:${email}:${purpose}`,
  otpAttempts: (email: string, purpose: string) => `otp_attempts:${email}:${purpose}`,
  session: (userId: string) => `session:${userId}`,
  cacheDashboard: (workspaceId: string) => `cache:dashboard:${workspaceId}`,
  cacheUser: (userId: string) => `cache:user:${userId}`,
  presence: (projectId: string) => `presence:${projectId}`,
  chat: (userId: string, projectId: string) => `chat:${userId}:${projectId}`,
  aiCache: (hash: string) => `ai:cache:${hash}`,
};

export const TTL = {
  REFRESH_TOKEN: 60 * 60 * 24 * 7, // 7 days
  OTP: 60 * 10, // 10 minutes
  OTP_ATTEMPTS: 60 * 15, // 15 minutes
  DASHBOARD_CACHE: 60 * 5, // 5 minutes
  USER_CACHE: 60 * 60, // 1 hour
  PRESENCE: 60 * 5, // 5 minutes
  CHAT_HISTORY: 60 * 60 * 24, // 24 hours
  AI_CACHE: 60 * 60, // 1 hour
};
