import test from "node:test";
import assert from "node:assert/strict";
import { getJson } from "../src/lib/apiClient.js";
import { AppError } from "../src/lib/errors.js";
import { jsonResponse, withMockFetch } from "./testUtils.js";

/** Narrowing helper so assert.rejects' `unknown` predicate param type-checks cleanly. */
function isAppErrorWithCode(err: unknown, code: string): err is AppError {
  return err instanceof AppError && err.code === code;
}

test("getJson: returns parsed data + status on a 200", async () => {
  // getJson<T>() is a thin, generic JSON getter: it returns the upstream
  // response body verbatim as `data` (typed as T by the caller), with no
  // envelope-unwrapping of its own — callers who expect the REST API's
  // {data, meta, pagination} envelope type T accordingly and destructure it
  // themselves (see e.g. tools/index.ts). This fixture deliberately has no
  // extra top-level keys beyond what's asserted, so a straight deepEqual
  // against the whole parsed body is a faithful test of that pass-through.
  await withMockFetch(
    async () => jsonResponse(200, { hello: "world" }),
    async () => {
      const { data, status } = await getJson<{ hello: string }>("/v1/whatever");
      assert.equal(status, 200);
      assert.deepEqual(data, { hello: "world" });
    },
  );
});

test("getJson: a 404 throws a not_found AppError", async () => {
  await withMockFetch(
    async () => jsonResponse(404, { error: { code: "not_found", message: "nope" } }),
    async () => {
      await assert.rejects(
        () => getJson("/v1/mindfulness-games/does-not-exist"),
        (err: unknown) => isAppErrorWithCode(err, "not_found"),
      );
    },
  );
});

test("getJson: a 429 is treated as upstream_unavailable, not surfaced raw", async () => {
  await withMockFetch(
    async () => jsonResponse(429, { error: { code: "rate_limited", message: "slow down" } }),
    async () => {
      await assert.rejects(
        () => getJson("/v1/search", { q: "x" }),
        (err: unknown) => {
          if (!isAppErrorWithCode(err, "upstream_unavailable")) return false;
          // The raw upstream message must never leak through verbatim.
          return !err.message.includes("slow down");
        },
      );
    },
  );
});

test("getJson: a persistent 503 retries once, then throws upstream_unavailable", async () => {
  let callCount = 0;
  await withMockFetch(
    async () => {
      callCount += 1;
      return jsonResponse(503, { error: { code: "unavailable", message: "down" } });
    },
    async () => {
      await assert.rejects(
        () => getJson("/v1/whitepapers"),
        (err: unknown) => isAppErrorWithCode(err, "upstream_unavailable"),
      );
    },
  );
  assert.equal(callCount, 2, "expected exactly one retry (2 total attempts) on a 503");
});

test("getJson: a 400 is NOT retried (single attempt, upstream_bad_request)", async () => {
  let callCount = 0;
  await withMockFetch(
    async () => {
      callCount += 1;
      return jsonResponse(400, { error: { code: "bad_request", message: "bad limit value" } });
    },
    async () => {
      await assert.rejects(
        () => getJson("/v1/search", { limit: -1 }),
        (err: unknown) => {
          if (!isAppErrorWithCode(err, "upstream_bad_request")) return false;
          return /bad limit value/.test(err.message);
        },
      );
    },
  );
  assert.equal(callCount, 1, "a 4xx must never be retried");
});

test("getJson: a 503 that recovers on retry succeeds", async () => {
  let callCount = 0;
  await withMockFetch(
    async () => {
      callCount += 1;
      if (callCount === 1) return jsonResponse(503, { error: { code: "unavailable", message: "down" } });
      return jsonResponse(200, { data: [], pagination: { limit: 6, offset: 0, total: 0 }, meta: {} });
    },
    async () => {
      const { data } = await getJson<{ data: unknown[] }>("/v1/practices");
      assert.deepEqual(data.data, []);
    },
  );
  assert.equal(callCount, 2);
});

test("getJson: a network-level failure (fetch throws) is treated as upstream_unavailable after retry", async () => {
  let callCount = 0;
  await withMockFetch(
    async () => {
      callCount += 1;
      throw new TypeError("fetch failed");
    },
    async () => {
      await assert.rejects(
        () => getJson("/v1/glossary/whatever"),
        (err: unknown) => isAppErrorWithCode(err, "upstream_unavailable"),
      );
    },
  );
  assert.equal(callCount, 2, "a network failure should be retried once before giving up");
});

test("getJson: malformed JSON body is treated as internal_error, not thrown raw", async () => {
  await withMockFetch(
    async () =>
      new Response("this is not json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    async () => {
      await assert.rejects(
        () => getJson("/v1/mindfulness-games"),
        (err: unknown) => isAppErrorWithCode(err, "internal_error"),
      );
    },
  );
});

test("getJson: never sends credentials and always sets Accept: application/json", async () => {
  let capturedInit: RequestInit | undefined;
  await withMockFetch(
    async (_url, init) => {
      capturedInit = init;
      return jsonResponse(200, { data: [], pagination: { limit: 1, offset: 0, total: 0 }, meta: {} });
    },
    async () => {
      await getJson("/v1/search", { q: "breathing" });
    },
  );
  assert.equal(capturedInit?.credentials, "omit");
  assert.equal(capturedInit?.cache, "no-store");
  const headers = capturedInit?.headers as Record<string, string>;
  assert.equal(headers.Accept, "application/json");
});

test("getJson: query values are placed via a real URL/URLSearchParams, never string-concatenated unsafely", async () => {
  let capturedUrl: string | undefined;
  await withMockFetch(
    async (url) => {
      capturedUrl = String(url);
      return jsonResponse(200, { data: [], pagination: { limit: 1, offset: 0, total: 0 }, meta: {} });
    },
    async () => {
      // A query value containing characters that would be dangerous if
      // string-concatenated into a URL must come out correctly percent-encoded.
      await getJson("/v1/search", { q: "breath & focus?x=1" });
    },
  );
  assert.ok(capturedUrl);
  const parsed = new URL(capturedUrl!);
  assert.equal(parsed.searchParams.get("q"), "breath & focus?x=1");
  assert.equal(parsed.pathname, "/v1/search");
});
