# Licensing

This project has two separate things in it, licensed two separate ways. Conflating them is the single most common mistake an integrator can make with this server — read this before you build on it.

## 1. The server code (this repository) — MIT

Everything in this repository — the MCP tool implementations, the REST API client, the resource normalizers, the Next.js route handlers, the tests, the scripts — is [MIT licensed](./LICENSE). You may fork it, self-host it, modify it, and redistribute it, including for commercial purposes, with attribution per the MIT license text.

This mirrors the licensing decision already made for the sibling REST API project (`thc-open-mindfulness-api`), for the same reason: the *code* that fetches and shapes public data is not the asset The Holistic Care needs to protect. Free, permissive code licensing is also what most MCP client ecosystems and registries expect of a well-behaved public server.

## 2. The mindfulness content this server returns — NOT MIT, NOT Creative Commons

This is the part that is easy to get wrong. When you call a tool like `find_mindfulness_games` or `lookup_mindfulness_term`, the JSON that comes back is not covered by the MIT license above. It is:

> Copyright © The Holistic Care. All rights reserved, unless a specific resource explicitly states otherwise.

This content is licensed to be **read and referenced**, not relicensed, resold, or reproduced wholesale. Concretely:

- **Fine:** an AI assistant reading a tool result and summarizing or quoting a short excerpt in its answer to a user, with a link back to the resource's `source_url`/`canonical_url`.
- **Fine:** a developer building an app that calls this MCP server (or the underlying REST API directly) live, at request time, and displays results with attribution.
- **Not fine:** bulk-scraping every resource via repeated tool calls to build your own competing content library, database, or dataset for redistribution.
- **Not fine:** stripping attribution and presenting THC's game descriptions, research summaries, or glossary definitions as your own original content.
- **Not fine:** describing this content anywhere as "open source," "public domain," or "Creative Commons licensed." It is none of those things — see `thc://content-rights` (the MCP resource) or the REST API's own `LICENSING.md`/`ATTRIBUTION.md` for the canonical wording.

If in doubt about a specific use case, contact The Holistic Care (see [SECURITY.md](./SECURITY.md) for the contact address) before building on it at scale.

## Why the split

This is the same split used successfully by, e.g., Wikipedia's API clients (MIT/BSD-licensed client code, CC-BY-SA content) and most public-data MCP servers now emerging in the ecosystem: it lets developers freely build, fork, and improve the *integration* while the underlying organization keeps normal copyright control over the *content* it produces. Nothing about running this server, forking it, or building on top of it grants any license to the content beyond what's described above.

## What this server will never expose, regardless of license

Independent of the MIT/all-rights-reserved split above, this server is architecturally incapable of returning:

- Sanity CMS documents directly (it never holds a Sanity token — see [SECURITY.md](./SECURITY.md))
- Paid or premium content (course material, paid Stillness Library tracks, shop products)
- Private PanchaVikas curriculum or session plans (only the public framework overview and public downloads)
- User data, order data, or anything requiring authentication

These are backend-provided guarantees (the upstream REST API itself never returns them to this server), not policy statements alone.
