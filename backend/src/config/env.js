import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('12h'),
  COOKIE_SECURE: z.preprocess(toBool, z.boolean()).default(false),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  PDF_OUTPUT_DIR: z.string().default('./tmp/pdf'),
  PDF_SKIP_BROWSER_DOWNLOAD: z.preprocess(toBool, z.boolean()).default(false),
});

// Treat "1"/"true"/true as true; everything else is false.
function toBool(v) {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return false;
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';

export const APP_NAME = 'Book Amount Entry System';