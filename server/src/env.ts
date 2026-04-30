import * as z from 'zod';

process.env.APP_STAGE = process.env.APP_STAGE || 'development';

const isDevelopment = process.env.APP_STAGE === 'development';
const isTest = process.env.APP_STAGE === 'test';

import { type StringValue } from 'ms';



let envPath: string | null = null;

if (isDevelopment) envPath = './.env';
if (isTest) envPath = './.env.test';
// In production, do not load a file. Use real environment variables.

if (envPath) {
    require('dotenv').config({ path: envPath });
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(['production', 'development', 'test'])
    .default('development'),
  APP_STAGE: z
    .enum(['production', 'development', 'test'])
    .default('development'),
  EXPRESS_PORT: z.coerce.number().positive().default(3000),
  DB_URL: z.string().startsWith('postgresql://'),
  SESSION_MAX_AGE: z.custom<StringValue>().default('1d'),
  SESSION_TOKEN_ROTATE_AFTER: z.custom<StringValue>().default('15m'),
  // BCRYPT_ROUNDS: z.coerce.number().min(10).max(20).default(12),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (e) {
  if (e instanceof z.ZodError) {
    e.issues.forEach(({ path, message }) => {
      console.error(
        `\n ZOD error with variable: ${path.join('.')} (${message})`,
      );
    });
    console.log('Invalid env variables, exiting process');
    process.exit(1);
  }

  throw e;
}

export default env;
