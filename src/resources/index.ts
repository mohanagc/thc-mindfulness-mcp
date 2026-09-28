/**
 * The five V1 MCP resources. All are static, plain-text/JSON informational
 * resources — none of them call the upstream REST API, so they carry zero
 * upstream-availability risk and can be read even if api.theholisticcare.com
 * is temporarily down.
 */
import type { McpServer } from "@modelcontextprotocol/server";
import {
  API_DOCS_URL,
  CONTACT_EMAIL,
  DEFAULT_API_BASE_URL,
  DEVELOPER_PAGE_URL,
  MAIN_SITE_URL,
  MCP_REPO_URL,
  OPENAPI_URL,
  PROVIDER_NAME,
} from "../lib/constants";

function textResource(uri: string, mimeType: string, text: string) {
  return { contents: [{ uri, mimeType, text }] };
}

const ABOUT_TEXT = `# THC Open Mindfulness MCP

Provider: ${PROVIDER_NAME}
Main website: ${MAIN_SITE_URL}
Developer page: ${DEVELOPER_PAGE_URL}
REST API this server is built on: ${API_DOCS_URL} (OpenAPI spec: ${OPENAPI_URL})
Source code: ${MCP_REPO_URL}

This is a public, read-only Model Context Protocol server exposing a curated
set of ${PROVIDER_NAME}'s approved public mindfulness resources: interactive
mindfulness games, free guided audio practices, plain-language research
summaries, a glossary of mindfulness/yoga/nonduality terms, and the public
overview of the PanchaVikas child-development framework.

It never connects to ${PROVIDER_NAME}'s content management system directly.
Every tool call in this server is served by the same public REST API anyone
can call directly at ${DEFAULT_API_BASE_URL} — this MCP server adds no data
and no privileged access beyond what that API already exposes publicly.

No authentication is required in this version. There are no write operations.
`;

const TAXONOMY_TEXT = `# Public resource types

This server can discover and return the following resource types, matching
the categories the underlying REST API organizes its public content into:

- **blog** — long-form articles on mindfulness, yoga, meditation, and
  nonduality (returned as a title/excerpt/tags/canonical URL summary; the
  full article lives at its canonical_url).
- **mindfulness_game** — interactive browser-based mindfulness games for
  children, teens, or adults.
- **guided_practice** — free guided audio practices from the Stillness
  Library (short meditations, breathing practices, Yoga Nidra sessions).
  Only free tracks are ever exposed here; paid tracks are not part of the
  public API.
- **research** — plain-language summaries of published research behind
  ${PROVIDER_NAME}'s content, with author/year/journal detail where available.
- **glossary** — definitions of mindfulness, yoga, meditation, kundalini,
  ayurveda, and nonduality terms.
- **panchavikas_pathway** / **panchavikas_download** — the public overview
  and public downloadable guide for the PanchaVikas five-element child
  development framework. Private curriculum material is not part of this
  taxonomy and is not accessible through this server.
`;

const USAGE_TEXT = `# Usage

- Free public access. No API key, token, or authentication is required in
  this version of the server.
- Read-only. There are no tools that create, modify, or delete anything.
- Best-effort availability. This server depends on ${PROVIDER_NAME}'s public
  REST API (${DEFAULT_API_BASE_URL}), which applies a best-effort rate limit;
  under sustained heavy use a client may see a temporary "unavailable" error.
  There is no guaranteed uptime SLA for this V1 server.
- Prefer the \`source_url\`/\`canonical_url\` field on a returned resource when
  presenting it to a person — it is the authoritative page for that resource.
- Result sizes are intentionally small (a handful of results per call, never
  a bulk dump of the underlying catalog). Use more specific queries or
  filters to narrow results rather than requesting a large limit.
- This server's behavior may evolve; see the repository (${MCP_REPO_URL}) for
  version history. Tool names and core input shapes are treated as a stable
  contract once released and are not casually renamed.
`;

const CONTENT_RIGHTS_TEXT = `# Content rights

- **Software.** The code that implements this MCP server (and the REST API
  it depends on) is MIT-licensed. You may reuse, adapt, and self-host that
  code freely, per the MIT License terms.
- **Content.** The mindfulness games, guided practices, research summaries,
  glossary entries, blog excerpts, and PanchaVikas resources returned BY this
  server are Copyright © ${PROVIDER_NAME}, all rights reserved, unless a
  specific resource explicitly states otherwise. Public read access to this
  content through this MCP server does NOT grant a license to republish,
  redistribute, or commercially reuse that content.
- Public access is not the same as unrestricted ownership. Treat returned
  content the way you would treat any other publicly viewable, copyrighted
  web content: you may read it, discuss it, and link back to it, but
  reproducing it wholesale elsewhere is not authorized by the mere fact that
  this server could retrieve it.
- Attribution back to ${PROVIDER_NAME} (ideally via the resource's own
  source_url/canonical_url) is recommended whenever you present or quote
  from a returned resource, though it is not a strict legal requirement.
- This content is NOT Creative Commons licensed. Do not describe it that way.
- Questions about content rights: ${CONTACT_EMAIL}.
`;

const PANCHAVIKAS_FRAMEWORK_TEXT = `# PanchaVikas — public framework overview

PanchaVikas is ${PROVIDER_NAME}'s five-element child-development framework,
built around Prithvi (earth), Jal (water), Agni (fire), Vayu (air), and
Akash (space) as five developmental pathways for children.

This resource intentionally contains ONLY the public framework overview.
It does not, and never will, embed:
- the private 216-session school curriculum,
- session-by-session teacher plans,
- teacher delivery scripts, or
- any other proprietary implementation material.

To explore the public pathway summaries and the public downloadable guide
programmatically, use the find_panchavikas_resources tool. For the full
public framework page and public downloadable guide, see ${MAIN_SITE_URL}.
`;

export function registerAllResources(server: McpServer): void {
  server.registerResource(
    "about",
    "thc://about",
    { title: "About THC Open Mindfulness MCP", mimeType: "text/markdown" },
    async (uri) => textResource(uri.toString(), "text/markdown", ABOUT_TEXT),
  );

  server.registerResource(
    "taxonomy",
    "thc://taxonomy",
    { title: "Public resource taxonomy", mimeType: "text/markdown" },
    async (uri) => textResource(uri.toString(), "text/markdown", TAXONOMY_TEXT),
  );

  server.registerResource(
    "usage",
    "thc://usage",
    { title: "Usage and fair-use notes", mimeType: "text/markdown" },
    async (uri) => textResource(uri.toString(), "text/markdown", USAGE_TEXT),
  );

  server.registerResource(
    "content-rights",
    "thc://content-rights",
    { title: "Content rights and licensing", mimeType: "text/markdown" },
    async (uri) => textResource(uri.toString(), "text/markdown", CONTENT_RIGHTS_TEXT),
  );

  server.registerResource(
    "panchavikas-framework",
    "thc://panchavikas/framework",
    { title: "PanchaVikas public framework overview", mimeType: "text/markdown" },
    async (uri) => textResource(uri.toString(), "text/markdown", PANCHAVIKAS_FRAMEWORK_TEXT),
  );
}
