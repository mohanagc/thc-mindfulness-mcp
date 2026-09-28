import {
  DEFAULT_API_BASE_URL,
  UPSTREAM_MAX_RETRIES,
  UPSTREAM_TIMEOUT_MS,
} from "./constants";
import {
  internalError,
  notFound,
  upstreamBadRequest,
  upstreamUnavailable,
  type AppError,
} from "./errors";
import type { ApiErrorBody } from "../types";

/**
 * Centralized REST API client. This is the ONLY place in the codebase that is
 * allowed to call `fetch()` against the upstream API, and it is the ONLY
 * place THC_API_BASE_URL is read.
 *
 * Security invariants (do not weaken these):
 *  - The base URL is fixed at process start from an environment variable the
 *    deployer controls. No tool input, ever, can change it. This is what
 *    prevents this server being turned into an open SSRF relay.
 *  - Every request path is built by this module from a known, hardcoded
 *    endpoint template plus caller-supplied *values* (never caller-supplied
 *    path segments/URLs) — see the `path` + `query` split in `getJson`.
 *  - Query values are always run through `URLSearchParams`, never
 *    string-concatenated into the URL.
 */

const RAW_BASE_URL = process.env.THC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;

// Fail closed: if someone sets THC_API_BASE_URL to garbage, don't silently
// fall back to a default that might surprise a deployer — refuse to boot with
// a clear message instead. (A malformed default constant would be a bug in
// this file, not a runtime concern, so we don't need to guard that half.)
let parsedBase: URL;
try {
  parsedBase = new URL(RAW_BASE_URL);
  if (parsedBase.protocol !== "https:" && parsedBase.hostname !== "localhost") {
    throw new Error("THC_API_BASE_URL must use https:// (localhost http:// is allowed for dev).");
  }
} catch (err) {
  throw new Error(
    `Invalid THC_API_BASE_URL ("${RAW_BASE_URL}"): ${err instanceof Error ? err.message : String(err)}`,
  );
}

export const API_BASE_URL = parsedBase.origin;

export type QueryValue = string | number | boolean | undefined | null;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  // `path` is always a literal passed by our own tool code (e.g. "/v1/search"),
  // never user input — see call sites. This join is intentionally simple.
  const url = new URL(path.startsWith("/") ? path : `/${path}`, API_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function fetchWithTimeout(url: string, attempt: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "thc-mindfulness-mcp/1.0.0 (+https://mcp.theholisticcare.com)",
      },
      signal: controller.signal,
      // Never forward cookies/credentials — this is a public, unauthenticated API.
      credentials: "omit",
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableStatus(status: number): boolean {
  // Retry on transient server-side failures only. Never on 4xx — a 4xx means
  // our request was malformed/rejected, and retrying it wastes a round trip
  // for a guaranteed second failure.
  return status === 502 || status === 503 || status === 504;
}

/**
 * GETs JSON from a fixed upstream path. Handles timeouts, one bounded retry
 * on transient network/5xx failures, and safe error mapping. Never returns
 * or logs the raw upstream error body verbatim to a caller — only a short,
 * pre-approved message via AppError.
 */
export async function getJson<T>(
  path: string,
  query?: Record<string, QueryValue>,
): Promise<{ data: T; status: number }> {
  const url = buildUrl(path, query);
  let lastError: unknown;

  for (let attempt = 0; attempt <= UPSTREAM_MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, attempt);

      if (res.status === 404) {
        throw notFound("resource");
      }

      if (res.status === 429) {
        // The upstream API's own best-effort rate limiter kicked in. Treat as
        // transient/unavailable rather than a hard error — a legitimate
        // caller should be able to retry shortly.
        throw upstreamUnavailable();
      }

      if (res.status >= 500) {
        if (isRetryableStatus(res.status) && attempt < UPSTREAM_MAX_RETRIES) {
          lastError = upstreamUnavailable();
          continue;
        }
        throw upstreamUnavailable();
      }

      if (res.status >= 400) {
        const message = await safeExtractErrorMessage(res);
        throw upstreamBadRequest(message);
      }

      const body = await safeParseJson<T>(res);
      return { data: body, status: res.status };
    } catch (err) {
      if (err instanceof Error && err.name === "AppError") {
        // Already a clean AppError we raised above — surface immediately for
        // anything non-retryable, or fall through to retry logic if we
        // marked it via lastError.
        const isTransient = (err as AppError).code === "upstream_unavailable";
        if (!isTransient || attempt >= UPSTREAM_MAX_RETRIES) {
          throw err;
        }
        lastError = err;
        continue;
      }

      // Network-level failure (DNS, TLS, connection refused, abort/timeout).
      if (attempt < UPSTREAM_MAX_RETRIES) {
        lastError = err;
        continue;
      }
      throw upstreamUnavailable();
    }
  }

  // Exhausted retries.
  if (lastError instanceof Error && (lastError as AppError).code) {
    throw lastError;
  }
  throw internalError();
}

async function safeParseJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw internalError();
  }
}

async function safeExtractErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return body?.error?.message;
  } catch {
    return undefined;
  }
}
