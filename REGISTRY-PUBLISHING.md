# Publishing to the MCP Registry (and other directories)

**Status: this project is registry-*ready*, but has NOT been submitted anywhere.** This document records what's already in place and the exact steps left to actually publish — deliberately not run in this build, per the project's own explicit scope boundary (see HANDOFF.md's "Stop point").

## What's already done

- `server.json` at the repo root, in the shape the [Official MCP Registry](https://registry.modelcontextprotocol.io) expects for a remote-only server (no local package — `remotes` only, pointing at the production Streamable HTTP endpoint).
- `npm run validate:registry` — a structural check (`scripts/validate-registry.mjs`) of `server.json`'s required fields, without needing network access. Run it after any change to `server.json` or `package.json`'s `version`.
- MIT `LICENSE`, `SECURITY.md`, and a public GitHub repo layout — all commonly required or strongly recommended by registries before they'll list a server.
- A production deployment reachable at a stable HTTPS domain (`mcp.theholisticcare.com`) — most directories require the server to actually be live and callable before listing it, not just source code.

## Before you actually submit anywhere

1. **Re-verify `server.json` against the live schema.** Registry schemas evolve; `scripts/validate-registry.mjs` checks the shape this project was built against, not necessarily what the registry currently enforces. Check `https://registry.modelcontextprotocol.io` (or wherever the Official Registry's current docs live) for the current `server.schema.json` URL and any new required fields.
2. **Confirm the production endpoint is live and healthy** — `curl https://mcp.theholisticcare.com/health` should return `{"status":"ok",...}`, and an MCP Inspector session against `https://mcp.theholisticcare.com/mcp` should list all 7 tools and 5 resources with no errors (see `README.md`'s "Testing with MCP Inspector" section).
3. **Bump `version` in both `package.json` and `server.json` together** if anything has changed since this was written — `validate:registry` will fail loudly if they drift.

## Official MCP Registry (registry.modelcontextprotocol.io)

This is the primary, Anthropic/community-run registry referenced by the MCP spec itself.

1. Install the registry's publishing CLI (`mcp-publisher`, per the registry's own docs — check for the current install method, historically `go install` or a downloadable binary).
2. Authenticate the CLI against your GitHub account (the registry ties a server's namespace, e.g. `io.github.mohanagc/...`, to a verified GitHub identity).
3. Run the CLI's own `validate` command against `server.json` as a second check beyond this repo's `validate:registry` script.
4. Run the CLI's `publish` command from the repo root.
5. Confirm the listing appears at the registry's public server-lookup endpoint/UI.

## Other directories (not started, listed for reference only)

The original project scope explicitly excludes submitting to any of these in this build — they are listed here only so a future session (or Mohan) has the list in one place when that work is picked up:

- Glama (glama.ai/mcp/servers)
- MCP.Directory
- MCP Central
- mcpnav
- awesome-remote-mcp-servers (GitHub curated list — a PR against the list's README/JSON)
- TensorBlock
- mcpservers.org

Each has its own submission mechanism (a web form, a PR against a list, or its own CLI) and its own review turnaround. None of them were investigated in depth as part of this build; do that research at submission time rather than trusting anything written here to still be current.

## After publishing (future work, not done here)

- Watch for the registry (or Glama/other directories) surfacing usage or health-check failures — they sometimes deprioritize or flag servers that go unreachable.
- Keep `server.json`'s `version` in sync with actual releases; most registries treat a stale, unreachable, or mismatched-version listing as a signal to deprioritize the server in search/discovery.
