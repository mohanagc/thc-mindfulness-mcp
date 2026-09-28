/**
 * Lightweight structured logging.
 *
 * Deliberately minimal per the project spec: no user profile data exists in
 * V1 (no auth), so there is nothing to redact there — but callers must still
 * never pass full returned article bodies, request headers, or IP addresses
 * into `meta`. Fields are kept to the short, useful set the spec calls out:
 * timestamp, tool name, duration, upstream status, result count, success/error.
 */

export interface ToolLogEntry {
  tool: string;
  duration_ms: number;
  upstream_status?: number;
  result_count?: number;
  ok: boolean;
  error_code?: string;
}

export function logToolCall(entry: ToolLogEntry): void {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    }),
  );
}
