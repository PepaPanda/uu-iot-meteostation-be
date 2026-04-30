import type { QueryResult } from 'pg';
import { isObjectEmpty } from '../shared/helpers';

export const getFirstRow = (queryResult: QueryResult) => {
    const { rows } = queryResult;
    const row = isObjectEmpty(rows) ? null : rows[0];
    return row;
};

export const getAllRows = (queryResult: QueryResult) => {
    const { rows } = queryResult;
    const row = isObjectEmpty(rows) ? null : rows;
    return row;
};