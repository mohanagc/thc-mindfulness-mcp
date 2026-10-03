# Security

## Reporting a vulnerability

If you find a security issue in this MCP server — a way to bypass its read-only guarantee, exfiltrate data it should not have access to, cause it to make requests to an attacker-controlled host, or anything else security-relevant — please report it privately rather than opening a public GitHub issue.

**Contact:** info@theholisticcare.com

Please include:
- A description of the issue and its potential impact
- Steps to reproduce (a specific MCP tool call and arguments is ideal)
- Any relevant logs or responses (redact anything sensitive first)

There is no bug bounty program at this time. Reports are still very welcome and will be acknowledged and acted on.

## What this server is designed to guarantee

This server has a deliberately narrow security posture, by design rather than by accident:

- **No authentication, because there is nothing behind it that needs protecting.** The server holds no secrets — no Sanity API token, no database credentials, no payment credentials, no user data. The only configuration value it reads is `THC_API_BASE_URL` (see `.env.example`), a compile-time-scoped base URL that is never influenced by a tool call argument.
- **Read-only.** No tool performs a write, mutation, or side-effecting call anywhere. Every tool issues a `GET` request to the public REST API and returns its response, normalized.
- **No direct Sanity access.** This server talks only to `https://api.theholisticcare.com` (the public REST API). It has never held, and will never be given, credentials to query Sanity CMS, Supabase, or any other backend directly. If the REST API changes what it exposes, that is the sole point of content-boundary enforcement this server relies on.
- **SSRF-hardened outbound requests.** The upstream API base URL is a fixed constant (`src/lib/constants.ts`); every specific path segment used in an outbound fetch is drawn from a small, hardcoded set of API routes (never built from unvalidated caller input as a full URL); all query parameter values are placed via `URLSearchParams`/`URL`, never string-concatenated; `credentials: "omit"` and `cache: "no-store"` are set on every fetch.
- **Input validation on every tool.** All tool arguments are validated against a Zod schema before use; string lengths are capped (see `MAX_QUERY_LENGTH`, `src/lib/constants.ts`); numeric inputs are range-checked.
- **DNS-rebinding / cross-origin protection on the HTTP transport.** The `/mcp` Streamable HTTP endpoint validates the `Host` and `Origin` headers of every request against an explicit allowlist (production hostname, plus `localhost`/`127.0.0.1` in non-production) before handing the request to the MCP SDK. A request with a present-but-disallowed `Origin` is rejected; a missing `Origin` (the normal case for non-browser MCP clients) is allowed, matching the SDK's documented behavior for this exact threat model.
- **No LLM calls inside the server.** This server does not call any AI model itself — it is a pure data-retrieval layer. The MCP client (Claude, or any other MCP-compatible client) is the only LLM in the loop.
- **No arbitrary web access.** No tool fetches an arbitrary URL supplied by the caller. Every outbound request target is one of a small, fixed set of REST API endpoints.
- **Stateless.** Each MCP request builds a fresh server instance (see `src/server.ts`, `app/mcp/route.ts`) with no session state carried between requests, so there is no session store to attack or leak across callers.
- **Timeouts and bounded retries on upstream calls.** Every outbound fetch has a hard timeout (`UPSTREAM_TIMEOUT_MS`) and at most one retry, only on network failure or a 502/503/504 — never on a 4xx, and never retried indefinitely.

## What this server explicitly does not protect against

- **Availability of the upstream REST API.** If `api.theholisticcare.com` is down or rate-limits this server, tool calls will fail or time out. This server has no cache or fallback data store.
- **Content accuracy.** This server passes through what the REST API returns. It does not fact-check, moderate, or otherwise second-guess the content it retrieves.
- **Abuse of the underlying REST API by other, unrelated clients.** Rate limiting and abuse prevention for the REST API itself is documented in that project's own `RATE_LIMITING.md`.
