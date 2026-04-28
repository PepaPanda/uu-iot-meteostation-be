import { dbPool } from './pool';

export async function checkDbConnection() {
  const result = await dbPool.query('SELECT NOW() AS now');
  return result.rows[0];
}