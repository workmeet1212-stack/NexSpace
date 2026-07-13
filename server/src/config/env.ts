import { config } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

// Load .env from server directory
config({ path: resolve(__dirname, '../.env') });
// Also try loading from root directory
config({ path: resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string(),
  UPSTASH_REDIS_REST_URL: z.string(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  GROQ_API_KEY: z.string(),
  EMAIL_FROM: z.string().default('onboarding@resend.dev'),
  SERVER_URL: z.string()
});

export const env = envSchema.parse(process.env);
