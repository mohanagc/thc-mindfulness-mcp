/**
 * Shared helpers for unit tests. No test in this project makes a real network
 * call — every test that exercises code touching `getJson()` installs a mock
 * `globalThis.fetch` first and restores the original afterward, regardless of
 * whether the test passes or throws.
 */

export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

/** Runs `fn` with `globalThis.fetch` replaced, restoring it afterward unconditionally. */
export async function withMockFetch<T>(impl: FetchImpl, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  // @ts-expect-error -- test-only global reassignment
  globalThis.fetch = impl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A minimal, schema-shaped ApiSuccessList<T> envelope for test fixtures. */
export function successList<T>(data: T[], overrides: Partial<{ limit: number; offset: number; total: number }> = {}) {
  return {
    data,
    pagination: { limit: overrides.limit ?? data.length, offset: overrides.offset ?? 0, total: overrides.total ?? data.length },
    meta: { generated_at: new Date().toISOString(), provider: "The Holistic Care", source: "api.theholisticcare.com" },
  };
}

export function successDetail<T>(data: T) {
  return {
    data,
    meta: { generated_at: new Date().toISOString(), provider: "The Holistic Care", source: "api.theholisticcare.com" },
  };
}
