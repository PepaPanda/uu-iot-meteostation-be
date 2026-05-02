import type { QueryResult, QueryResultRow } from 'pg';

export const getFirstRow = <T extends QueryResultRow>(
  queryResult: QueryResult<T>,
): T | null => {
  return queryResult.rows[0] ?? null;
};

export const getAllRows = <T extends QueryResultRow>(
  queryResult: QueryResult<T>,
): T[] => {
  return queryResult.rows;
};

