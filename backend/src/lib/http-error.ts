/**
 * An error that maps directly to an HTTP response.
 * Anything thrown that is NOT an HttpError is treated as a 500 and its message is never exposed.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new HttpError(400, code, message, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    return new HttpError(401, code, message);
  }

  static forbidden(message = 'You do not have permission to do this', code = 'FORBIDDEN') {
    return new HttpError(403, code, message);
  }

  static notFound(resource = 'Resource', code = 'NOT_FOUND') {
    return new HttpError(404, code, `${resource} not found`);
  }

  static conflict(message: string, code = 'CONFLICT', details?: unknown) {
    return new HttpError(409, code, message, details);
  }
}
