import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z, ZodType } from 'zod';

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

type Parsed<S extends Schemas> = {
  [K in keyof Schemas]-?: S[K] extends ZodType ? z.output<S[K]> : undefined;
};

/**
 * Wraps a route handler with Zod validation of body / query / params.
 *
 * - Invalid input throws a ZodError, which the error handler turns into a 400.
 * - The handler receives fully typed, parsed values (coerced numbers, dates, defaults).
 * - Unknown body keys are stripped by Zod, so operator payloads like `{ "$gt": "" }`
 *   never reach a Mongo query.
 *
 * Express 5 forwards rejected promises to the error handler, so no try/catch is needed.
 */
export function handler<S extends Schemas>(
  schemas: S,
  fn: (input: Parsed<S>, req: Request, res: Response, next: NextFunction) => unknown,
): RequestHandler {
  return async (req, res, next) => {
    const input = {
      body: schemas.body ? await schemas.body.parseAsync(req.body) : undefined,
      query: schemas.query ? await schemas.query.parseAsync(req.query) : undefined,
      params: schemas.params ? await schemas.params.parseAsync(req.params) : undefined,
    } as Parsed<S>;

    await fn(input, req, res, next);
  };
}
