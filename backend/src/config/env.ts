import dotenv from 'dotenv';
dotenv.config();

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Firebase Admin
  FIREBASE_PROJECT_ID: z.string().default(process.env.FIREBASE_PROJECT_ID || 'littlefun-dev-project'),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // Supabase
  SUPABASE_URL: z.string().default(process.env.SUPABASE_URL || 'https://mock-project.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key'),

  // Super Admin security overrides
  SUPER_ADMIN_UID: z.string().optional().default('FkCSTRi6JBSfBf2haCnj8yCoOiC2'),
  SUPER_ADMIN_EMAIL: z.string().optional().default('aryaonlinetournament@gmail.com'),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,https://littlefunwithpartner.web.app'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  parsed.error.issues.forEach((issue: z.ZodIssue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const config = parsed.data;
export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
