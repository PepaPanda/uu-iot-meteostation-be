import pg from 'pg';
import env from '../env';

const { Pool, types } = pg;

// node-postgres returns 64-bit integers (BIGINT/INT8) and arbitrary-precision
// numerics (NUMERIC/DECIMAL) as strings by default to avoid precision loss.
// Every id and measurement in this schema fits comfortably within the JS safe
// integer range, so we parse them as numbers. This keeps the API contract
// honest (DTOs declare `number`) and makes numeric comparisons in the domain
// logic (e.g. raindrop deltas) behave correctly.
types.setTypeParser(types.builtins.INT8, (value) => (value === null ? null : Number(value)));
types.setTypeParser(types.builtins.NUMERIC, (value) => (value === null ? null : Number(value)));

if (!env.DB_URL) {
  throw new Error('DATABASE_URL is not defined');
}

export const dbPool = new Pool({
  connectionString: env.DB_URL,
});