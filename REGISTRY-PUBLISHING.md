# Publishing to the MCP Registry (and other directories)

**Status: LIVE on the Official MCP Registry as of 2026-09-29.** `com.theholisticcare/open-mindfulness` v1.0.0 is published at `https://registry.modelcontextprotocol.io`, authenticated via DNS domain verification (no GitHub OAuth). See HANDOFF.md's "DNS domain verification and publish, completed" log for the full step-by-step record.

## Publishing strategy (decided 2026-09-29): DNS domain authentication, not GitHub OAuth

**We are deliberately NOT using GitHub OAuth to authenticate to the Official MCP Registry.** GitHub account risk (OAuth app authorizations, however scoped) is something we want to minimize after the earlier account-flag incident on this account (see HANDOFF.md). The Official MCP Registry supports an alternative: **DNS domain verification**, which proves control of `theholisticcare.com` via a TXT record rather than a GitHub identity. This lets the namespace be `com.theholisticcare/...` (a domain-owned namespace) instead of `io.github.mohanagc/...` (a GitHub-identity-owned namespace) — no OAuth app, no GitHub App installation, no login scope on this account at all.

Decided shape, reflected in the current `server.json`:

- **Namespace:** `com.theholisticcare/open-mindfulness`
- **Authentication method:** DNS domain verification (TXT record on `theholisticcare.com`) — NOT GitHub OAuth
- **Domain:** `theholisticcare.com`
- **Remote transport:** `streamable-http` only (no local/npm package)
- **MCP endpoint:** `https://mcp.theholisticcare.com/mcp`
- **No npm package** — this server is remote-only, so there is nothing to `npm publish`.
- **No GitHub OAuth, no GitHub Apps, no new GitHub integrations** of any kind for this publishing flow.
- **Manual publication only, for now** — a human runs `mcp-publisher publish` from a local machine when ready. No CI/CD auto-publish pipeline exists or is planned yet.
- **No GitHub Actions auto-publishing** — deliberately not set up; would itself require a GitHub App/workflow, which this strategy avoids.

The `repository` field in `server.json` still references the GitHub repo (`https://github.com/mohanagc/thc-mindfulness-mcp`) with its stable repository ID — that's descriptive metadata about where the source lives, not an authentication mechanism. Filling in that field does not authenticate anything or grant the registry any access to GitHub; it's just a link, the same as `websiteUrl`.

## What's already done

- `server.json` at the repo root, in the shape the [Official MCP Registry](https://registry.modelcontextprotocol.io) expects for a remote-only server (no local package — `remotes` only, pointing at the production Streamable HTTP endpoint), using the `com.theholisticcare/open-mindfulness` DNS-verified namespace.
- `npm run validate:registry` — a structural check (`scripts/validate-registry.mjs`) of `server.json`'s required fields, without needing network access. Run it after any change to `server.json` or `package.json`'s `version`.
- MIT `LICENSE`, `SECURITY.md`, and a public GitHub repo layout — all commonly required or strongly recommended by registries before they'll list a server. (This is just the repo being a normal public repo — not a registry authentication step.)
- A production deployment reachable at a stable HTTPS domain (`mcp.theholisticcare.com`) — most directories require the server to actually be live and callable before listing it, not just source code.

## Before you actually submit anywhere

1. **Re-verify `server.json` against the live schema.** Registry schemas evolve; `scripts/validate-registry.mjs` checks the shape this project was built against, not necessarily what the registry currently enforces. Check `https://registry.modelcontextprotocol.io` (or wherever the Official Registry's current docs live) for the current `server.schema.json` URL and any new required fields.
2. **Confirm the production endpoint is live and healthy** — `curl https://mcp.theholisticcare.com/health` should return `{"status":"ok",...}`, and an MCP Inspector session against `https://mcp.theholisticcare.com/mcp` should list all 7 tools and 5 resources with no errors (see `README.md`'s "Testing with MCP Inspector" section).
3. **Bump `version` in both `package.json` and `server.json` together** if anything has changed since this was written — `validate:registry` will fail loudly if they drift.

## Official MCP Registry (registry.modelcontextprotocol.io) — DNS authentication path

This is the primary, Anthropic/community-run registry referenced by the MCP spec itself. Steps below use **DNS domain verification**, not GitHub OAuth.

1. ✅ **Done (2026-09-29).** Installed the registry's official publishing CLI, `mcp-publisher` **v1.8.1**, downloaded directly from `https://github.com/modelcontextprotocol/registry/releases/tag/v1.8.1` (`mcp-publisher_windows_amd64.tar.gz`). SHA-256 checksum verified against GitHub's own displayed hash before extracting (`399ad0d6e00a50812b563a71d8bfbff5160c085e6b13aac6ec083d98d5ff7c45`) — matched via `Get-FileHash`. Extracted to `E:\Tools\mcp-publisher\`.
2. ✅ **Done (2026-09-29).** Ran `mcp-publisher validate server.json` from the repo root:
   ```
   Validating against https://registry.modelcontextprotocol.io...
   ✅ server.json is valid
   ```
   This is a pure schema check with no authentication involved, and it validated against the **live, current** official schema — not just this repo's own offline `validate:registry` script. Both checks now agree: `server.json` is correct as of today.
3. ✅ **Done (2026-09-29).** Generated an Ed25519 key pair (`openssl genpkey -algorithm Ed25519`), kept **outside** this repo at `E:\THC-private-keys\mcp-registry\key.pem` (never committed). Derived the public DNS value and added it as a **new, additive** TXT record under `theholisticcare.com`'s Cloudflare DNS (`v=MCPv1; k=ed25519; p=IgKI9kNiSeEv2GmZTI7/6QT6wgVTLvt87V9RC/WkVuE=`) — every existing SPF/DKIM/DMARC/Google/Vercel TXT record was left untouched. Confirmed resolving publicly via `Resolve-DnsName`. Ran `mcp-publisher login dns -domain theholisticcare.com -private-key <hex>` (private key extracted via DER-slicing, not text-parsing; whole sequence wrapped in `set +o history` so it never hit shell history) — **succeeded**, authenticating the `com.theholisticcare` namespace with zero GitHub OAuth, App, or account involvement.
4. ✅ **Done (2026-09-29).** Ran `mcp-publisher publish server.json` from the repo root:
   ```
   Publishing to https://registry.modelcontextprotocol.io...
   ✓ Successfully published
   ✓ Server com.theholisticcare/open-mindfulness version 1.0.0
   ```
5. **Recommended, not yet confirmed:** open the registry's public server-lookup UI/API from a real browser to confirm the listing is visible externally (the environment used to prepare this build had no network route to `registry.modelcontextprotocol.io` to check this directly).

**`com.theholisticcare/open-mindfulness` v1.0.0 is now live.** Any future version bump needs `key.pem` again (back it up securely, somewhere durable and outside this repo) — the same DNS-authenticated identity is reused for every future publish of this namespace, not regenerated each time.

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
