import pg from 'pg';
import env from '../env';

const { Pool } = pg;

if (!env.DB_URL) {
  throw new Error('DATABASE_URL is not defined');
}

export const dbPool = new Pool({
  connectionString: env.DB_URL,
});