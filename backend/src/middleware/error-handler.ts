import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error.js';

type ErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

type MappedError = { status: number; body: ErrorBody };

const fail = (status: number, code: string, message: string, details?: unknown): MappedError => ({
  status,
  body: { error: details === undefined ? { code, message } : { code, message, details } },
});

function isBodyParserError(err: unknown): err is { type: string; status: number } {
  return typeof err === 'object' && err !== null && 'type' in err && 'status' in err;
}

function isDuplicateKeyError(err: unknown): err is { code: 11000; keyValue?: Record<string, unknown> } {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

function mapError(err: unknown): MappedError {
  if (err instanceof HttpError) {
    return fail(err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return fail(
      400,
      'VALIDATION_ERROR',
      'Some fields are invalid',
      err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }

  if (isBodyParserError(err)) {
    if (err.type === 'entity.parse.failed') return fail(400, 'BAD_JSON', 'Request body is not valid JSON');
    if (err.type === 'entity.too.large') return fail(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }

  if (err instanceof mongoose.Error.CastError) {
    return fail(400, 'INVALID_ID', `Invalid value for "${err.path}"`);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return fail(
      400,
      'VALIDATION_ERROR',
      'Some fields are invalid',
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    );
  }

  if (isDuplicateKeyError(err)) {
    const fields = Object.keys(err.keyValue ?? {});
    return fail(409, 'CONFLICT', `A record with this ${fields.join(', ') || 'value'} already exists`, { fields });
  }

  return fail(500, 'INTERNAL', 'Something went wrong. Please try again.');
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const { status, body } = mapError(err);

  if (status >= 500) {
    req.log.error({ err }, 'Unhandled error');
  }

  res.status(status).json(body);
};
