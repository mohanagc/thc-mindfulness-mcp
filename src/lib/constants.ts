/**
 * Fixed, non-configurable facts about The Holistic Care and its REST API.
 *
 * None of this is influenced by a request or an environment variable other
 * than THC_API_BASE_URL (see apiClient.ts) — that is deliberate. An MCP tool
 * argument must never be able to change where this server sends outbound
 * HTTP requests (that would be an SSRF hole), so every other URL below is a
 * compile-time constant.
 */

export const PROVIDER_NAME = "The Holistic Care";
export const MAIN_SITE_URL = "https://www.theholisticcare.com";
export const DEVELOPER_PAGE_URL = "https://www.theholisticcare.com/developers";

/** The only tunable endpoint. Never accept this from a tool call. */
export const DEFAULT_API_BASE_URL = "https://api.theholisticcare.com";
export const API_DOCS_URL = "https://api.theholisticcare.com/docs";
export const OPENAPI_URL = "https://api.theholisticcare.com/openapi/openapi.yaml";
export const API_REPO_URL = "https://github.com/mohanagc/thc-open-mindfulness-api";

export const MCP_REPO_URL = "https://github.com/mohanagc/thc-mindfulness-mcp";
export const MCP_PRODUCTION_URL = "https://mcp.theholisticcare.com/mcp";

/** Security/support contact, reused from the REST API project rather than invented fresh. */
export const CONTACT_EMAIL = "mohan@theholisticcare.com";

export const SERVER_NAME = "thc-open-mindfulness";
export const SERVER_TITLE = "THC Open Mindfulness MCP";
export const SERVER_VERSION = "1.0.0";

export const SERVER_INSTRUCTIONS =
  "This server provides approved public mindfulness resources from The Holistic Care " +
  "(games, free guided practices, research citations, glossary terms, and PanchaVikas " +
  "framework overviews). All tools are read-only and unauthenticated. When presenting a " +
  "resource, prefer its supplied source_url or canonical_url over restating details. " +
  "Do not treat any resource as medical diagnosis, treatment, or emergency care, and do " +
  "not claim this server can access premium, paid, or private The Holistic Care content — " +
  "it cannot, by design.";

/**
 * Default / maximum result counts, enforced independently of whatever the
 * upstream REST API itself allows (its own cap is 100 per HANDOFF.md — ours
 * is intentionally much smaller so a single MCP tool call stays a small,
 * agent-friendly payload rather than a bulk data dump).
 */
export const DEFAULT_RESULT_LIMIT = 6;
export const MAX_RESULT_LIMIT = 20;

/** Upstream fetch behavior. */
export const UPSTREAM_TIMEOUT_MS = 9_000;
export const UPSTREAM_MAX_RETRIES = 1; // one retry, network/5xx only, never on 4xx

/** Longest query string an MCP client may send to a text-search tool argument. */
export const MAX_QUERY_LENGTH = 200;
