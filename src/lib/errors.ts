/**
 * A small, closed set of safe-to-expose error shapes for MCP tool results.
 *
 * Every one of these codes maps to a concise, non-leaky message. Nothing that
 * flows into an AppError's `message` should ever contain a stack trace,
 * upstream response body, environment variable, or internal path — see the
 * call sites in apiClient.ts, which deliberately discard the real upstream
 * error text before constructing these.
 */
export type AppErrorCode =
  | "invalid_input"
  | "not_found"
  | "upstream_bad_request"
  | "upstream_unavailable"
  | "internal_error";

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }

  /** The structured form a tool handler returns inside an error CallToolResult. */
  toStructured(): { code: AppErrorCode; message: string } {
    return { code: this.code, message: this.message };
  }
}

export function notFound(what: string): AppError {
  return new AppError("not_found", `No ${what} was found for the given identifier.`);
}

export function invalidInput(message: string): AppError {
  return new AppError("invalid_input", message);
}

export function upstreamUnavailable(): AppError {
  return new AppError(
    "upstream_unavailable",
    "The Holistic Care public resource service is temporarily unavailable. Please try again shortly.",
  );
}

export function upstreamBadRequest(message?: string): AppError {
  return new AppError(
    "upstream_bad_request",
    message && message.length < 300
      ? message
      : "The Holistic Care public resource service rejected this request.",
  );
}

export function internalError(): AppError {
  return new AppError("internal_error", "An internal error occurred while handling this request.");
}
