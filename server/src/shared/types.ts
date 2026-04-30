import { Request } from 'express';

export type EmptyParams = Record<string, never>;
export type EmptyQuery = Record<string, never>;
export type EmptyBody = Record<string, never>;

export type TypedRequest<
  Body = EmptyBody,
  Params = EmptyParams,
  Query = EmptyQuery,
  ResBody = unknown,
> = Request<Params, ResBody, Body, Query>;