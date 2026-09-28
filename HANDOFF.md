# HANDOFF — THC Open Mindfulness MCP

Read this first if you are picking this project back up in a new session. It mirrors the handoff convention already established in the sibling `thc-open-mindfulness-api` project.

## What this project is

A public, read-only MCP (Model Context Protocol) server that wraps The Holistic Care's already-public REST API (`api.theholisticcare.com`) as 7 MCP tools and 5 MCP resources. It is a thin adapter layer, not a second copy of the content or logic — every fact this server returns comes from a live call to the REST API at request time.

- Repo: `https://github.com/mohanagc/thc-mindfulness-mcp`
- Local path: `E:\thc-mindfulness-mcp`
- Production endpoint (target): `https://mcp.theholisticcare.com/mcp`
- Sibling project it depends on: `E:\thc-open-mindfulness-api` / `https://api.theholisticcare.com`

## Non-negotiable architectural rule

**This server must never connect directly to Sanity, a database, or any payment system.** It only ever calls `api.theholisticcare.com` over plain HTTPS, with no credentials. If a future feature seems to need direct Sanity/database access, that is a signal the feature belongs in the REST API project instead, exposed as a new public endpoint there — not a reason to weaken this server's boundary. See `SECURITY.md` for the full reasoning.

## Build status as of this session

| Phase | Status |
|---|---|
| Audit REST API + verify current MCP standards | ✅ Done |
| Scaffold project (package.json, tsconfig, .gitignore, .env.example) | ✅ Done |
| REST API client (`src/lib/apiClient.ts`, `errors.ts`, `logger.ts`, `normalize.ts`, `types.ts`) | ✅ Done |
| 7 MCP tools (`src/tools/*.ts`) | ✅ Done |
| 5 MCP resources (`src/resources/index.ts`) | ✅ Done |
| MCP HTTP handler + health + root page (`app/mcp/route.ts`, `app/health/route.ts`, `app/page.tsx`, `app/layout.tsx`, `src/server.ts`) | ✅ Done |
| Docs (README, LICENSE, LICENSING, ATTRIBUTION, SECURITY, REGISTRY-PUBLISHING, server.json, this file) | ✅ Done |
| Tests: unit tests (`apiClient`, `normalize`, `filters`, all 7 tool handlers) | ✅ Done — `tests/apiClient.test.ts`, `tests/normalize.test.ts`, `tests/filters.test.ts`, `tests/tools.test.ts`, all with `globalThis.fetch` mocked, zero real network calls |
| Tests: in-process MCP protocol contract test | ✅ Done — `tests/contract.test.ts`, connects a real SDK `Client` to the real `buildMcpServer()` output over `InMemoryTransport` (no HTTP), verifies tools/list, resources/list, tools/call (success + error), resources/read, and zero-prompts behavior |
| Production smoke script | ✅ Written — `scripts/smoke-production.mts`, makes REAL requests to a deployed MCP endpoint via the SDK's `StreamableHTTPClientTransport`; deliberately NOT run yet (nothing is deployed) and NOT part of CI |
| CI (GitHub Actions) | ✅ Done — `.github/workflows/ci.yml` (typecheck, lint, unit+contract tests, `validate:registry`, build), plus `eslint.config.mjs` + `eslint`/`eslint-config-next` devDependencies added since `next lint` was removed in this Next.js version (16.3.6 — confirmed by absence of `next-lint.js` in `node_modules/next/dist/cli`); `package.json`'s `lint` script fixed to `eslint .` accordingly |
| Git init / push to GitHub | ⚠️ Partially done, blocked — see "Real verification performed" and "Known limitations" below. `git init` + `git add -A` succeeded (all real project files staged, `node_modules`/`.next` correctly excluded per `.gitignore`); `git commit` is blocked by a stuck `.git/index.lock` this sandbox cannot remove (`Operation not permitted` — a filesystem-lock quirk of this Windows-mounted drive, not a code issue). The GitHub repo `mohanagc/thc-mindfulness-mcp` also still needs to be created (confirmed not to exist), and this sandbox has zero GitHub credentials regardless (`git ls-remote` fails: "could not read Username for 'https://github.com'"). |
| Vercel project + deployment | ⏳ Not started |
| Custom domain `mcp.theholisticcare.com` | ⏳ Not started |
| Production smoke verification | ⏳ Not started |
| Registry submission | ⛔ Explicitly out of scope for this build — see below |

## Real verification performed (this session — supersedes the earlier "believed correct, unexecuted" caveat)

A working shell became available partway through this build. Contrary to the earlier state of this file, the following was **actually run and observed**, not just read/reasoned about:

- **`npm install --package-lock-only`** succeeded (524 packages resolved, 0 vulnerabilities) — **`package-lock.json` now exists and is committed-ready.** A full `npm install`/`npm ci` still fails on this sandbox's Windows-mounted filesystem (`ENOTEMPTY` on install, `Invalid Version` on `ci`) — the same class of issue documented in the sibling website project's own `CLAUDE.md`. The existing partial `node_modules` (from an earlier session) was complete enough to run `tsc`, the full test suite, and `validate:registry` directly via `node node_modules/<pkg>/...` rather than through `npm run` wrapper scripts.
- **`tsc --noEmit`** (via `node node_modules/typescript/bin/tsc --noEmit`, TypeScript 7.0.2): **`src/`, `tests/`, and `scripts/` all type-check with zero errors.** This caught and led to fixing 3 real bugs (see below). The only remaining errors are confined entirely to `app/layout.tsx` and `app/page.tsx`, and are caused by the `next` package's installed copy in `node_modules/next` having **zero `.d.ts` files at all** (confirmed via `find` — only `.js` files are present), a symptom of the incomplete install, not a code defect. A `tsconfig.json` `"types": ["node", "react"]` addition was also needed — this TypeScript version does not reliably auto-include `@types/*` packages without it (confirmed: `node:test`/`node:assert/strict`/`process` were unresolvable without `"node"` listed explicitly).
- **`node --import tsx --test tests/*.test.ts`**: **54/54 tests pass.** One test had a real bug (a stray `meta: {}` in a fixture that the assertion never accounted for — fixed by removing it, since `getJson()` correctly passes the upstream body through verbatim with no envelope-unwrapping of its own).
- **`node scripts/validate-registry.mjs`**: passes, all 9 structural checks green.
- **`node node_modules/next/dist/bin/next build`**: attempted; printed only `✓ Running next.config took 466ms` and did not progress further within a 120s window. Not conclusively diagnosed — plausibly the same corrupted `next` install (missing `.d.ts` chain feeding into Next's own internal type-check step) causing a hang rather than a clean failure. **Not re-attempted at length; needs a real, complete install on an unaffected machine to actually verify the build.**
- **`eslint`**: could not run at all — `eslint`, `eslint-config-next`, and `@eslint/eslintrc` were never actually installed into `node_modules` (confirmed absent). The `eslint.config.mjs` and `package.json` wiring from the "CI + build validation" phase is unverified against a real lint run.
- **Secret scan**: `grep` across every tracked source/doc file for AWS keys, `sk-`/`ghp_` tokens, PEM private key headers, JWTs, and generic `secret=`/`token=`/`password=` assignments with real-looking values — **zero hits.** The only matches for the words "secret"/"token"/"password" in the entire tree are prose in the docs stating that none exist.
- **`git init` + `git add -A`**: succeeded; `git status --short` confirmed every real project file staged correctly and `node_modules`/`.next` excluded. **`git commit` is currently blocked** by a `.git/index.lock` file that this sandbox cannot delete (`Operation not permitted`, retried after a 20s wait, still stuck) — see Known Limitations.

### 3 real bugs found and fixed by this verification pass (not just environment noise)

1. **`src/lib/normalize.ts`** — every `from*()` function's object literal passed to the shared `omitEmpty()` helper had its `type` field widened from a specific literal (e.g. `"mindfulness_game"`) to plain `string`, because `omitEmpty<T extends Record<string, unknown>>` inferred `T` from the argument with no contextual steering toward `McpResource`. Fixed by (a) loosening `omitEmpty`'s constraint from `Record<string, unknown>` to `object` (interfaces with no index signature don't satisfy the former), and (b) passing `McpResource` as an explicit type argument at every call site — this now correctly keeps literal types intact.
2. **`tests/contract.test.ts`** — an `@ts-expect-error` guarding the `@modelcontextprotocol/sdk/inMemory.js` import was itself flagged as unused (the import resolves cleanly), and two assertions read `content.text` off a union type where one arm is a blob variant with no `text` property. Fixed by removing the stale suppression comment and adding a small `expectTextContent()` type-guard helper used by both resource-read tests.
3. **`tests/apiClient.test.ts`** — the "returns parsed data + status on a 200" test's mock fixture included an extraneous `meta: {}` key that the assertion never accounted for, since `getJson()` correctly returns the upstream JSON body verbatim (no envelope-unwrapping — that's each tool's own job). Fixed by simplifying the fixture to match exactly what the test actually asserts.

## Explicit stop point (do not go past this without new instructions)

Per the original project spec, this build stops once:
1. All V1 code is complete (tools, resources, HTTP handler) — **done**.
2. Tests pass — **done and empirically confirmed: 54/54 passing via a real `node --import tsx --test tests/*.test.ts` run** (see "Real verification performed" above; this run also caught and fixed 3 real bugs, not just environment issues).
3. Registry metadata (`server.json`) validates structurally — **done and empirically confirmed: `node scripts/validate-registry.mjs` passes all 9 checks.**
4. GitHub is ready — **not done.** `git init`/`git add -A` succeeded locally; `git commit` is blocked by a stuck `.git/index.lock` this sandbox cannot clear; the remote repo `mohanagc/thc-mindfulness-mcp` still needs to be created; this sandbox has no GitHub credentials to push with regardless.
5. Vercel deployment is ready/live, if authorized — **not done**.
6. Production MCP is verified, if the domain is available — **not done**.
7. This file is updated — **done, this entry.**

**Do NOT begin submitting this server to any MCP directory** (Official Registry, Glama, MCP.Directory, MCP Central, mcpnav, awesome-remote-mcp-servers, TensorBlock, mcpservers.org) as part of this same task, even once everything above is green. `REGISTRY-PUBLISHING.md` documents what's ready and what the actual submission steps would be, but actually submitting is separate, later work requiring an explicit go-ahead.

## Key files, what they do

```
app/
  layout.tsx        Minimal root layout, dark/gold THC styling
  page.tsx           Human-facing root page: name, endpoint, provider, links
  health/route.ts     GET /health — static, no upstream dependency
  mcp/route.ts        POST/GET/DELETE /mcp — the Streamable HTTP MCP endpoint,
                      with Host/Origin header validation in front of it

src/
  server.ts           buildMcpServer() — constructs one fresh McpServer per request
  types.ts            Ground-truth TypeScript types for the REST API's response shapes
  schemas.ts          Zod input schemas for all 7 tools
  lib/
    constants.ts      All fixed URLs/limits/timeouts — the ONLY place the upstream
                       API base URL is defined (never overridable by a tool arg)
    apiClient.ts       getJson<T>() — the one function that makes outbound HTTP calls
    errors.ts          AppError + typed error constructors (notFound, invalidInput, ...)
    logger.ts          logToolCall() — structured per-call logging, no request bodies
    normalize.ts        Converts each REST API shape into the shared McpResource shape
    filters.ts          Client-side filter helpers (age range, duration, text match)
  tools/
    index.ts            registerAllTools() — registers all 7 tools, shared error handling
    searchMindfulnessResources.ts
    getMindfulnessResource.ts
    findMindfulnessGames.ts
    findGuidedPractices.ts
    searchMindfulnessResearch.ts
    lookupMindfulnessTerm.ts
    findPanchavikasResources.ts
  resources/
    index.ts            registerAllResources() — all 5 static resources

server.json             MCP Registry metadata (not yet submitted anywhere)
scripts/
  validate-registry.mjs  Structural check of server.json (no network needed)
  smoke-production.mts   Real-network post-deploy check via the SDK's MCP client (NOT part of CI)

tests/
  testUtils.ts           Shared fetch-mocking + fixture helpers for every test file
  apiClient.test.ts       getJson(): status handling, retry-once-on-5xx, no-retry-on-4xx,
                          malformed JSON, credentials/cache headers, safe query encoding
  normalize.test.ts       Every from*() normalizer: omits nulls/empties, never fabricates data
  filters.test.ts         textIncludes/ageRangeCovers/durationFits/resourceMatchesQuery/slugify
  tools.test.ts           All 7 tool .handler()s directly, with fetch mocked — endpoint
                          routing (query vs. no-query), client-side vs. server-side filters,
                          the get_mindfulness_resource id+type matching rule, the
                          lookup_mindfulness_term glossary->search fallback
  contract.test.ts        In-process MCP protocol test: Client + InMemoryTransport connected
                          directly to buildMcpServer()'s output (bypasses HTTP) — verifies
                          tools/list, resources/list, tools/call, resources/read, zero prompts

.github/workflows/ci.yml  Typecheck, lint, unit+contract tests, validate:registry, build
eslint.config.mjs         Standard Next.js flat config (next/core-web-vitals + next/typescript)
```

## Known limitations / things to verify before trusting this build fully

1. **`npm install` / `npm ci` still cannot complete cleanly on this sandbox's Windows-mounted `E:\` filesystem.** A full `npm install` hits `ENOTEMPTY` rename errors mid-install, and `npm ci` fails with an opaque `Invalid Version:` error — both consistent with the same class of filesystem bug the sibling website project's own `CLAUDE.md` documents on this same mount. **This is now a narrower gap than before**: `npm install --package-lock-only` *did* succeed (524 packages resolved cleanly, 0 vulnerabilities), so `package-lock.json` is real and committed-ready, and the pre-existing partial `node_modules` from an earlier session was complete enough to actually run `tsc`, the full test suite (54/54 passing), and `validate:registry` directly. **Still unverified**: `eslint` (the package itself was never installed — confirmed absent from `node_modules`) and `next build` (attempted; hung at the Turbopack config-load step for 120s+ with no further output or error, not conclusively diagnosed — plausibly downstream of `next`'s own `.d.ts` files being entirely missing on disk, see #2). **Before deploying, run `npm ci && npm run lint && npm run build` on a machine without this filesystem quirk (e.g. Mohan's own) and fix anything that surfaces.**
2. **The installed `next` package in `node_modules/next` has zero `.d.ts` files** (confirmed via `find` — only `.js` files present, despite `package.json` declaring `"types": "index.d.ts"`), a direct symptom of the incomplete install in #1. This is the sole cause of every remaining `tsc` error (all confined to `app/layout.tsx` and `app/page.tsx` — "Cannot find declaration file for module 'next'", "Cannot find namespace 'React'", JSX `IntrinsicElements` errors) and is the leading suspect for why `next build` hung. **Not a code defect** — `src/`, `tests/`, and `scripts/` all type-check with zero errors under the same `tsc` run. Re-run `tsc --noEmit` after a real `npm ci` on an unaffected machine; these errors should disappear entirely once `next`'s real type declarations are on disk.
3. **`tsconfig.json` now has an explicit `"types": ["node", "react"]`.** This was necessary because this TypeScript version (`7.0.2`, installed via the `^7.0.2` devDependency range — note this is a very new major version, worth double-checking against whatever version actually resolves on a fresh `npm ci`) did not reliably auto-include `@types/node`'s ambient `node:test`/`node:assert/strict` module declarations or `@types/react`'s global namespace without it. If a fresh install resolves an older, more conventional TypeScript 5.x and the auto-inclusion behavior differs, this explicit list is still correct and harmless to keep — it just may turn out to have been unnecessary on that version. Worth a quick sanity check, not worth reverting speculatively.
4. **Two `as any` casts in `src/tools/index.ts`** (`registerListTool`/`registerSingleTool`), each with an explanatory comment, work around a generic-inference limitation in the shared tool-registration abstraction. Runtime safety is preserved (every input is still `.parse()`d against the tool's own Zod schema before use); a real `tsc` run already confirms no other type errors surface around these two call sites.
5. **`tests/contract.test.ts` contains two behaviorally-tolerant assertions** written to be correct under either of two plausible behaviors of `@modelcontextprotocol/server`'s `registerTool` (protocol-level rejection of invalid input vs. the handler's own `.parse()` + `handleToolError()` fallback). Both tests passed in the real 54/54 run, but which behavior is actually true was not pinned down — not needed for correctness, but worth a one-line note in the test if it's ever discovered incidentally.
6. **`eslint`/`eslint-config-next`/`@eslint/eslintrc` were never actually installed** in this sandbox's `node_modules` (confirmed absent when attempting to run `eslint .` directly). The `eslint.config.mjs` file and the `package.json` `lint` script were written carefully against the standard `create-next-app` flat-config pattern, but have never actually been run. **This is the single biggest remaining "written but unverified" gap** — run `npm run lint` on a real install before trusting it.
7. **The GitHub repo does not exist yet** (confirmed via a "Repository not found" check earlier in this build, and again via `git ls-remote` in this session, which also confirmed this sandbox has zero GitHub credentials — `fatal: could not read Username for 'https://github.com'`). `git init` and `git add -A` were run successfully in this sandbox (all real project files staged correctly, `node_modules`/`.next` excluded per `.gitignore`, a secret scan across every tracked file found zero API keys/tokens/private keys), but **`git commit` is currently blocked by a stuck `.git/index.lock`** this sandbox cannot delete (`Operation not permitted`, retried after a wait, still stuck) — the same class of Windows-mount file-lock issue documented in the sibling website project. **Mohan needs to, from his own machine**: clear the repo's `index.lock` if it's still present (`Remove-Item -Force .git\index.lock` in PowerShell, or simply re-run `git add -A` if the lock has already cleared on its own — this class of lock has been observed to self-resolve within hours in this project family before), commit, create the empty `mohanagc/thc-mindfulness-mcp` GitHub repo (no auto-generated README/LICENSE/.gitignore), and push.
8. **No deployment has happened.** Nothing in this list has been verified against a real running instance — not the health check, not an Inspector session, not the production domain, not the CI workflow actually running on GitHub's infrastructure.

## Next steps, in order

1. From Mohan's own machine (not this sandbox): clear `.git/index.lock` if still present, `git add -A` again if needed, then `git commit` (the commit message and full file list are already staged and ready in this sandbox — see "Real verification performed" above for exactly what's included).
2. Run `npm ci && npm run typecheck && npm run lint && npm run build` there too, to close the two remaining unverified gaps (`eslint`, `next build`) now that a real, complete install is possible.
3. Create the empty `mohanagc/thc-mindfulness-mcp` GitHub repo (no auto-generated files) and `git push`.
4. Confirm the GitHub Actions CI workflow actually goes green on the real push.
5. Create and configure the Vercel project, deploy, attach the `mcp.theholisticcare.com` custom domain.
6. Run `npm run smoke:production` (real network calls against the live deployed URL) and an MCP Inspector session against the live endpoint.
7. Update this file with the outcome of each of the above.
8. Deliver the final 19-point report to Mohan per the original spec (architecture, SDK/version, transport, tools, resources, REST endpoints used, security boundary, test results, Inspector result, registry validation result, GitHub status, Vercel status, custom domain status, production smoke status, licensing status, known limitations, anything requiring manual action, next steps).

## Content and security boundaries (recap — see SECURITY.md and LICENSING.md for full detail)

- No Sanity/database/payment access, ever, from this server.
- No premium content, no private PanchaVikas curriculum, no user data.
- No writes. No LLM calls made by this server itself. No arbitrary web access — only a fixed, small set of `api.theholisticcare.com` routes.
- Code is MIT; content returned by the tools is Copyright © The Holistic Care, all rights reserved unless stated otherwise (never Creative Commons).
