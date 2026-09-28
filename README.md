# THC Open Mindfulness MCP

A public, read-only [Model Context Protocol](https://modelcontextprotocol.io) server for [The Holistic Care](https://www.theholisticcare.com)'s approved public mindfulness resources — interactive games, free guided audio practices, plain-language research summaries, a glossary, and the public PanchaVikas framework overview.

- **Production endpoint:** `https://mcp.theholisticcare.com/mcp` (Streamable HTTP)
- **No authentication required.** No API key, no OAuth, nothing to sign up for.
- **Read-only.** No tool in this server creates, modifies, or deletes anything.
- **Backed entirely by a public REST API** — [`api.theholisticcare.com`](https://api.theholisticcare.com) ([docs](https://api.theholisticcare.com/docs), [source](https://github.com/mohanagc/thc-open-mindfulness-api)). This server never connects to Sanity CMS, a database, or any payment system directly.

## Table of contents

- [Why this exists](#why-this-exists)
- [Architecture](#architecture)
- [Tools](#tools)
- [Resources](#resources)
- [Using it from an MCP client](#using-it-from-an-mcp-client)
- [Local development](#local-development)
- [Testing with MCP Inspector](#testing-with-mcp-inspector)
- [Deployment](#deployment)
- [Security](#security)
- [Licensing](#licensing)
- [Contributing / issues](#contributing--issues)

## Why this exists

The Holistic Care already publishes a public REST API of its mindfulness content. This server is a thin MCP wrapper around that API so any MCP-compatible client (Claude Desktop, Claude Code, custom agents, etc.) can discover and use that content through native tool calls instead of a bespoke HTTP integration — with the same content boundaries the REST API itself already enforces.

## Architecture

```
MCP client (Claude, etc.)
        │  Streamable HTTP, JSON-RPC
        ▼
 thc-mindfulness-mcp  (this repo — Next.js App Router, deployed to Vercel)
        │  plain HTTPS GET, no credentials
        ▼
 api.theholisticcare.com  (sibling REST API project)
        │
        ▼
 Sanity CMS (never touched directly by this server)
```

- **Runtime:** Next.js (App Router) on Vercel, Node.js runtime (not Edge — the MCP SDK needs Node APIs).
- **MCP SDK:** [`@modelcontextprotocol/server`](https://www.npmjs.com/package/@modelcontextprotocol/server) v2 (`createMcpHandler`, `McpServer`), the modern high-level package. `@modelcontextprotocol/sdk` v1 is kept only as a dev dependency for lower-level type definitions and future in-process test clients.
- **Transport:** Streamable HTTP, stateless. Every request builds a brand-new `McpServer` instance (`src/server.ts`) — there is no session store, so nothing about one caller's request can leak into another's.
- **Validation:** [Zod](https://zod.dev) v4 schemas for every tool input (`src/schemas.ts`), re-validated server-side regardless of what the SDK itself already checks.
- **Content boundary:** enforced entirely by which endpoints this server calls on the upstream REST API (`src/lib/apiClient.ts`, `src/lib/constants.ts`). The base URL is a compile-time constant; no tool argument can ever change what host this server talks to.

## Tools

All seven tools are read-only, take no destructive action (`readOnlyHint: true`, `destructiveHint: false` in every tool's annotations), and return a small (default 6, max 20) list of normalized resources rather than a bulk dump.

| Tool | What it does | Backed by |
|---|---|---|
| `search_mindfulness_resources` | Free-text search across every public resource family at once (blog, games, practices, research, glossary, PanchaVikas), with optional `resource_type`/`category`/`audience`/`skill`/`age` filters. | `GET /v1/search`, filtered client-side |
| `get_mindfulness_resource` | Fetch one specific resource by its type + identifier (slug for most families, stable id for PanchaVikas). | The matching dedicated detail endpoint, e.g. `GET /v1/mindfulness-games/{slug}` |
| `find_mindfulness_games` | Find interactive mindfulness games, filterable by age, skill, audience, and max duration. | `GET /v1/mindfulness-games` or `GET /v1/search` |
| `find_guided_practices` | Find free guided audio practices from the Stillness Library (never paid tracks). | `GET /v1/practices` or `GET /v1/search` |
| `search_mindfulness_research` | Search plain-language research summaries, filterable by topic and study type. | `GET /v1/whitepapers` or `GET /v1/search` |
| `lookup_mindfulness_term` | Look up one glossary term by name, with an optional pillar filter. | `GET /v1/glossary/{slug}`, falling back to search |
| `find_panchavikas_resources` | Find public PanchaVikas resources (framework pathways and the public downloadable guide only — never private curriculum). | `GET /v1/panchavikas/resources`, filtered client-side |

Every list-returning tool shares the output shape `{ results: Resource[], count: number }`; `get_mindfulness_resource` and `lookup_mindfulness_term` return `{ found: boolean, resource: Resource | null }`. See each tool's own file under `src/tools/` for its exact Zod input schema and a code comment explaining any filter it cannot apply with full fidelity (documented rather than silently ignored — see the note on `/v1/search`'s narrower parameter set below).

**A known, documented limitation:** the upstream `/v1/search` endpoint accepts only `q`/`limit`/`offset`, while `/v1/resources` and the dedicated per-family endpoints accept richer filters (`category`, `audience`, `skill`, `age_min`/`age_max`) but no free-text query. Where a tool needs both free-text search AND a filter `/v1/search` doesn't support server-side, it over-fetches from `/v1/search` and applies the filter client-side (see `src/lib/filters.ts`) — this is called out explicitly in the affected tool's description text so an MCP client (and the person using it) knows the filter is real but applied after the fact, not a guarantee from the upstream API itself.

## Resources

Five static, informational MCP resources — none of them call the upstream API, so they're always available even if `api.theholisticcare.com` is temporarily down:

| URI | Contents |
|---|---|
| `thc://about` | What this server is, who provides it, and links to the underlying API/source. |
| `thc://taxonomy` | The resource types this server can return, and what each one means. |
| `thc://usage` | Fair-use notes: no auth needed, best-effort availability, prefer `source_url`/`canonical_url`, keep result sizes small. |
| `thc://content-rights` | The software-vs-content licensing split (MIT code, all-rights-reserved content) — see [Licensing](#licensing) below. |
| `thc://panchavikas/framework` | The public PanchaVikas five-element framework overview, with an explicit statement of what it deliberately excludes (private curriculum). |

There are **no MCP prompts** in this server, by design — the spec for this project explicitly avoided adding prompts just because the protocol supports them; nothing here needed one.

## Using it from an MCP client

Any Streamable-HTTP-capable MCP client can connect directly to the production URL. For a `claude_desktop_config.json`-style remote MCP entry:

```json
{
  "mcpServers": {
    "thc-open-mindfulness": {
      "url": "https://mcp.theholisticcare.com/mcp"
    }
  }
}
```

No headers, tokens, or environment variables are required on the client side.

## Local development

```bash
npm install
npm run dev
```

The MCP endpoint is then available at `http://localhost:3000/mcp`, and a health check at `http://localhost:3000/health`.

No secrets are required for local development. The only environment variable this server reads is `THC_API_BASE_URL` (see `.env.example`), and it defaults to the production REST API if unset — set it only to point a local instance at a different API (e.g. a locally running copy of `thc-open-mindfulness-api`).

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run test        # unit tests (mocked fetch, no network)
npm run test:contract  # MCP protocol-level tests, in-process
```

## Testing with MCP Inspector

[MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the reference tool for interactively exercising an MCP server's tools and resources.

```bash
npx @modelcontextprotocol/inspector
```

Then connect it to either:
- `http://localhost:3000/mcp` (a local `npm run dev` instance), or
- `https://mcp.theholisticcare.com/mcp` (production)

using the "Streamable HTTP" transport option and no authentication. You should see all 7 tools and all 5 resources listed, and be able to call each one interactively.

## Deployment

This project deploys to [Vercel](https://vercel.com) as a standard Next.js App Router app.

1. Import the GitHub repo into a new Vercel project.
2. No environment variables are required for a production deploy (`THC_API_BASE_URL` defaults to `https://api.theholisticcare.com`).
3. Point the custom domain `mcp.theholisticcare.com` at the Vercel project (Vercel dashboard → Domains), and add the corresponding DNS record at the DNS provider for `theholisticcare.com`.
4. After deploying, verify:
   - `https://mcp.theholisticcare.com/health` returns `{"status":"ok",...}`
   - `https://mcp.theholisticcare.com/mcp` responds correctly to an MCP Inspector session (see above)
   - `npm run smoke:production` passes (`scripts/smoke-production.mts` — exercises the live endpoint end-to-end)

## Security

See [SECURITY.md](./SECURITY.md) for the full write-up. In short: no secrets, no writes, no direct Sanity/database access, SSRF-hardened outbound requests, Host/Origin header validation on the HTTP transport, and a stateless request model. Report a vulnerability to mohan@theholisticcare.com rather than opening a public issue.

## Licensing

See [LICENSING.md](./LICENSING.md) for the full explanation. Short version: the **code** in this repository is [MIT licensed](./LICENSE); the **mindfulness content** it retrieves and returns (games, practices, research summaries, glossary entries, blog excerpts, PanchaVikas overviews) is Copyright © The Holistic Care, all rights reserved, unless a specific resource says otherwise — it is public to read and reference, not to redistribute wholesale. See also [ATTRIBUTION.md](./ATTRIBUTION.md) for how to credit The Holistic Care when you build on top of this server.

## Contributing / issues

This is a small, single-purpose server maintained alongside The Holistic Care's public API and website. Bug reports and pull requests are welcome via [GitHub Issues](https://github.com/mohanagc/thc-mindfulness-mcp/issues). For anything security-related, see [SECURITY.md](./SECURITY.md) instead of opening a public issue.
