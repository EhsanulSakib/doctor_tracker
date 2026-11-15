/** The API's error body: `{ error: { code, message, details } }` (backend middleware/error-handler.ts). */
export type ApiErrorBody = { error: { code: string; message: string; details?: unknown } };

type FieldIssue = { path: string; message: string };

const isFieldIssues = (details: unknown): details is FieldIssue[] =>
  Array.isArray(details) && details.every((d) => typeof d === "object" && d !== null && "path" in d && "message" in d);

const hasFields = (details: unknown): details is { fields: string[] } =>
  typeof details === "object" && details !== null && Array.isArray((details as { fields?: unknown }).fields);

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /**
   * Field-level messages, ready to put next to form inputs:
   * VALIDATION_ERROR → one message per field; CONFLICT / DOCTOR_NOT_FOUND → the message on `details.fields`.
   */
  get fieldErrors(): Record<string, string> {
    if (isFieldIssues(this.details)) {
      return Object.fromEntries(this.details.map((issue) => [issue.path, issue.message]));
    }
    if (hasFields(this.details)) {
      return Object.fromEntries(this.details.fields.map((field) => [field, this.message]));
    }
    return {};
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    try {
      const body = (await res.json()) as Partial<ApiErrorBody>;
      if (body.error?.code) return new ApiError(res.status, body.error.code, body.error.message, body.error.details);
    } catch {
      // Not JSON (proxy error page, empty body): fall through to a generic message.
    }
    return new ApiError(res.status, `HTTP_${res.status}`, "Something went wrong. Please try again.");
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
