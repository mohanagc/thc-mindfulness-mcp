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
| Git init / push to GitHub | ✅ Done — repo pushed to `github.com/mohanagc/thc-mindfulness-mcp` (deployed via Vercel CLI directly from the local project folder rather than the GitHub-App auto-deploy integration; the `mohanagc` GitHub account was flagged, restricting third-party OAuth app authorization — a real, partial fix was observed [Vercel's GitHub "Connect" button now fires real network requests, vs. zero before] but the connection still does not fully complete, so **there is currently no auto-deploy-on-push wired up** — every future deploy needs a manual `vercel --prod` from a machine with the Vercel CLI logged in, until this is revisited). |
| Vercel project + deployment | ✅ Done — project `thc-mindfulness-mcp` under team `mohans-projects-dc949787`, deployed via `vercel --prod` (CLI-based, see above). Live at `https://thc-mindfulness-mcp.vercel.app`. |
| Custom domain `mcp.theholisticcare.com` | ✅ Done (2026-09-28) — added as a Vercel domain (Production environment), DNS configured in Cloudflare as a `CNAME` record (`mcp` → `004df1d37b12e7e5.vercel-dns-016.com`, **DNS only** / not proxied — matching the existing `api.theholisticcare.com` convention, since this is a standalone Vercel-hosted app, not something needing Cloudflare-specific routing). Vercel shows **Valid Configuration** with SSL issued. `GET https://mcp.theholisticcare.com/health` confirmed returning `{"status":"ok","service":"thc-open-mindfulness-mcp","version":"1.0.0"}` via a server-side fetch from outside this local network. |
| Production smoke verification | ✅ Done (2026-09-29) — Mohan ran `npm run smoke:production` from his own machine (VS Code PowerShell) once his local DNS resolver caught up (took roughly a day for his specific ISP resolver, `2401:4900:50:9::7d5`, to refresh, even though Google's `8.8.8.8` and his browser had already resolved the record hours earlier). **All 6 checks passed**: `GET /health` returns 200 with status ok; MCP initialize handshake succeeds; `tools/list` returns exactly the 7 documented tools; `resources/list` returns exactly the 5 documented resources; `tools/call search_mindfulness_resources` succeeds against the live upstream API; `resources/read thc://about` returns non-empty text; live server exposes zero prompts (capability unsupported, as designed). The MCP server is confirmed fully live and functional end-to-end at `https://mcp.theholisticcare.com/mcp`. |
| GitHub account restriction | ✅ Resolved (2026-09-29) — GitHub Support (Ticket 4801272) confirmed the account-level flag was cleared entirely. Re-tested by connecting `thc-mindfulness-mcp` to Vercel via the GitHub App: succeeded immediately ("Connected just now"). **Auto-deploy-on-push is now wired up for this repo** — the "manual `vercel --prod` only" limitation noted just above (line 33) no longer applies going forward, though manual deploys still work fine as a fallback. |
| Registry submission | 🟡 Validated, NOT submitted (2026-09-29) — `server.json` passed both this repo's offline check and the real `mcp-publisher validate` against the live official registry schema. DNS domain-verification, login, and publish are the only steps left, all deliberately not started — see "Session log: 2026-09-29" below. |

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

## Session log: 2026-09-28 — custom domain wired up, deployment confirmed live

Picking up where an earlier session left off (Vercel project already deployed via CLI at `https://thc-mindfulness-mcp.vercel.app`, since the `mohanagc` GitHub account's OAuth-authorization restriction was blocking the normal GitHub-App auto-deploy connection to Vercel).

**GitHub OAuth restriction: re-checked, partially improved, not fully resolved.** Mohan asked to re-verify whether the "flagged, cannot authorize third-party applications" restriction had cleared (per two screenshots: a GitHub Support reinstatement-related email thread, and a normal-looking GitHub dashboard). Checked `github.com/settings/applications` (clean — no authorized OAuth apps) and empirically re-tested Vercel's own "Connect GitHub" button: it now fires real `github-limited`/`github-token` network requests (200 OK), a genuine change from before (previously zero network activity on the same click). However, after the click and a page reload, GitHub still does **not** show as connected on the Vercel account — the connection does not fully complete. Also found an already-installed Vercel GitHub App (installation id `104483982`, "All repositories" access) sitting in a "Permission updates requested" state; deliberately left this untouched rather than approving/changing it blind, since it may be tied to the already-working production `theholisticcare.com` deploy pipeline and the risk of disrupting that wasn't worth it for this task. **Net: still no fully-working GitHub↔Vercel connection for this repo — deploys remain manual (`vercel --prod`) until this is revisited, ideally with Mohan present to confirm which GitHub App connection is safe to touch.**

**Custom domain setup — completed.**
1. Added `mcp.theholisticcare.com` as a domain on the `thc-mindfulness-mcp` Vercel project (Production environment). Vercel returned the required DNS record: `CNAME`, name `mcp`, value `004df1d37b12e7e5.vercel-dns-016.com.` (Vercel's newer per-project CNAME-target format; the older `cname.vercel-dns.com` / `76.76.21.21` would also still work per Vercel's own UI note).
2. Added that record in Cloudflare (`theholisticcare.com` zone) via the dashboard: Type `CNAME`, Name `mcp`, Target `004df1d37b12e7e5.vercel-dns-016.com`, **Proxy status: DNS only** (not proxied) — deliberately matching the existing `api.theholisticcare.com` record's convention, since `mcp.theholisticcare.com` is structurally the same thing (a standalone Vercel-hosted app serving real content directly), not something that needs Cloudflare's own routing/redirect features the way `foundation`/`knowledge` subdomains do.
   - **UI note for any future session doing this again:** Cloudflare's "Add record" Type dropdown in the "Add record" modal is a custom-rendered combobox, not a native `<select>`. Coordinate-based clicks on a freshly-opened option list were unreliable across several attempts (the click either silently failed to register, selected the wrong option because the list had re-rendered at different coordinates between the screenshot and the click, or dismissed the whole modal). The reliable method: click the combobox open, then use keyboard type-ahead (e.g. press `c` then `n` for "CNAME") followed by `Escape` to close the still-open list without changing the selection — this worked immediately and consistently. Also: `form_input` (setting an input's value directly via its element ref) was more reliable than a coordinate click + `type` for the plain text "Name" field, which didn't register a click-then-type sequence correctly on the first two attempts.
3. Confirmed via Vercel's dashboard: DNS validated (blue checkmark), then "Generating SSL Certificate" (took roughly 20-30 seconds), then **"Valid Configuration."**
4. Verified live: `mcp__workspace__web_fetch` against `https://mcp.theholisticcare.com/health` returned `{"status":"ok","service":"thc-open-mindfulness-mcp","version":"1.0.0"}` — confirming the custom domain is fully live and correctly routed to the deployed app, independent of this local machine's own DNS cache.

**Full MCP-protocol smoke test: attempted, blocked by environment limits, not a server problem.**
- `npm run smoke:production` failed in this sandbox with an `esbuild`/`tsx` platform mismatch (`node_modules` on this Windows-mounted drive only has the `@esbuild/win32-x64` binary; this sandbox's shell runs Linux). Installing the missing `@esbuild/linux-x64` package timed out.
- Worked around by writing a plain `.mjs` equivalent of `scripts/smoke-production.mts` (importing the SDK's already-compiled JS directly, no TypeScript/tsx needed) and running it with plain `node` — but this sandbox's own shell has **no general internet egress at all** (confirmed: a raw `curl` to `mcp.theholisticcare.com` and even to `api.theholisticcare.com` both returned exit code 56 / connect failure; only specific allow-listed tools like `mcp__workspace__web_fetch` have a real network path out). The script's own `fetch` calls failed with `fetch failed` accordingly — this is a sandbox capability gap, not a finding about the deployed server.
- Also tried running the check via the browser (Claude in Chrome / the real local Windows machine's Chrome), which does have real internet access — but hit `DNS_PROBE_FINISHED_NXDOMAIN` repeatedly (confirmed via `document.title`/`document.body.innerText` read directly, since the browser tool's own screenshot/page-text helpers refuse to run against an error page). This is because the CNAME record is brand new (added minutes earlier in this same session) and the local machine's/ISP's DNS resolver simply hadn't picked it up yet at the time of testing — an ordinary propagation-lag issue, not a server misconfiguration, especially since `mcp__workspace__web_fetch`'s separate resolver path already saw the record correctly at the same time.
- **Net result: the plain HTTP health check is confirmed working against the real production custom domain. The full protocol-level check (`tools/list` returns exactly the 7 documented tools, `resources/list` returns exactly the 5 documented resources, a real `tools/call` against the live upstream API succeeds, a `resources/read` succeeds, zero prompts are exposed) was written and is ready to run, but was not completed in this session.** Recommend Mohan run `npm run smoke:production` from his own machine (where `node_modules` has the correct native binaries for his own OS and real internet access) once his local DNS has caught up — this should typically be within a few minutes given the CNAME's TTL, and is very likely already resolved by the time this is read.

**Not done in this session (unchanged from before, still open):** fixing the GitHub↔Vercel auto-deploy connection for real; MCP directory/registry submissions (explicitly out of scope per the original task spec — do not start this without being asked); resolving the still-pending "Permission updates requested" state on the existing Vercel GitHub App installation (deliberately left untouched, flagged for Mohan's own review since it may affect the live `theholisticcare.com` site's own deploy pipeline, not just this project).

## Session log: 2026-09-29 — production smoke test fully passed, DNS propagation resolved

Follow-up to the 2026-09-28 session above. The custom domain and health endpoint were already confirmed live; the only remaining gap was the full MCP-protocol smoke test, blocked by the brand-new CNAME record not yet having propagated to Mohan's local ISP resolver.

**Propagation timeline observed:** Google's public resolver (`8.8.8.8`) and Mohan's own browser (Chrome, via `mcp.theholisticcare.com` and `/health` both rendering correctly) resolved the record correctly within hours of it being added. Mohan's specific ISP resolver (`2401:4900:50:9::7d5`), used by default `nslookup`/`curl.exe`/Node's `fetch` on his machine, took roughly a full day longer to refresh its cache — `nslookup mcp.theholisticcare.com` (no server specified) kept returning "Non-existent domain" well after the browser and `8.8.8.8` both worked, and `npm run smoke:production` failed with generic `fetch failed` on both checks during that window, purely because Node's DNS resolution went through the same lagging local resolver. This is a good example of why a passing browser check doesn't guarantee a CLI/Node tool will also work immediately — different resolution paths can be out of sync with each other for a while after a new record is added.

**Resolved itself with time, no configuration change needed.** Mohan retried periodically; once `nslookup mcp.theholisticcare.com` finally returned a real address instead of NXDOMAIN, `npm run smoke:production` was re-run from his own machine (VS Code PowerShell, `E:\thc-mindfulness-mcp`) and passed cleanly:

```
ok - GET /health returns 200 with status: ok
ok - MCP initialize handshake succeeds
ok - tools/list returns exactly the 7 documented tools
ok - resources/list returns exactly the 5 documented resources
ok - tools/call search_mindfulness_resources succeeds against live upstream API
ok - resources/read thc://about returns non-empty text
ok - live server exposes zero prompts (capability unsupported)

All checks passed against https://mcp.theholisticcare.com/mcp
```

**This closes out production smoke verification in full.** The MCP server is now confirmed live and fully functional end-to-end at `https://mcp.theholisticcare.com/mcp`: custom domain live with valid SSL, health check passing, full MCP protocol handshake working, exactly the 7 documented tools and 5 documented resources exposed, a real tool call succeeding against the live upstream REST API, a resource read succeeding, and zero prompts exposed (as designed for this V1 scope).

**Still open, unchanged from the 2026-09-28 log:** the pending "Permission updates requested" state on the existing Vercel GitHub App installation is still untouched, flagged for Mohan's own review (though it no longer blocks new connections — see below). ~~The GitHub↔Vercel auto-deploy connection is still not fully working~~ — **resolved 2026-09-29, see below.**

## Session log: 2026-09-29 — GitHub account restriction lifted, auto-deploy connected, registry-publishing prep (validation only, not submitted)

**GitHub account restriction fully resolved.** GitHub Support closed Ticket 4801272 with: *"Sometimes our abuse detecting systems highlight accounts that need to be manually reviewed. We've cleared the restrictions from your account, so you have full access to GitHub again."* This is a full resolution, not the earlier "selective, new-authorizations-only" partial state observed mid-ticket. Verified empirically: opened Vercel's Git settings for `thc-mindfulness-mcp`, clicked "GitHub" under Connected Git Repository, the previously-401'ing `git-namespaces` API call succeeded, the repo list loaded, and clicking "Connect" on `mohanagc/thc-mindfulness-mcp` completed instantly ("Connected just now"). **This repo now has a working GitHub→Vercel auto-deploy connection** — future pushes to `main` will deploy automatically; manual `vercel --prod` is no longer required (though it still works as a fallback).

**Registry publishing strategy changed: DNS domain authentication instead of GitHub OAuth.** To further minimize GitHub account risk (independent of the above resolution — this is a standing policy choice, not a reaction to a still-open problem), the Official MCP Registry publishing plan now uses **DNS domain verification** against `theholisticcare.com`, not GitHub OAuth. This changes the server's registry namespace from the GitHub-identity-owned `io.github.mohanagc/thc-open-mindfulness` to the domain-owned `com.theholisticcare/open-mindfulness`. See the rewritten "Publishing strategy" section at the top of `REGISTRY-PUBLISHING.md` for the full decision record (namespace, auth method, no npm package, manual-publish-only, no GitHub Actions auto-publish).

**`server.json` updated to this strategy and to the current registry schema version:**

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "com.theholisticcare/open-mindfulness",
  "title": "THC Open Mindfulness MCP",
  "description": "Read-only mindfulness games, guided practices, research, glossary and PanchaVikas resources.",
  "version": "1.0.0",
  "websiteUrl": "https://www.theholisticcare.com/developers",
  "repository": {
    "url": "https://github.com/mohanagc/thc-mindfulness-mcp",
    "source": "github",
    "id": "1392379972"
  },
  "remotes": [
    {
      "type": "streamable-http",
      "url": "https://mcp.theholisticcare.com/mcp"
    }
  ]
}
```

Changes from the previous `server.json`: `$schema` bumped from the `2025-09-29` schema URL to `2025-12-11`; `name` changed from `io.github.mohanagc/thc-open-mindfulness` to `com.theholisticcare/open-mindfulness` (DNS-verified namespace, per the strategy above); added `title` (new field, human-readable display name distinct from `name`); `description` shortened to a plain one-line summary; added `repository.id` (`"1392379972"`, the stable numeric GitHub repository ID — metadata identifying which repo this is, not an authentication credential; filling it in does not authenticate anything or grant registry access to GitHub). `version` unchanged (`1.0.0`, still matches `package.json`). `remotes` unchanged (`streamable-http` at `https://mcp.theholisticcare.com/mcp`).

**Validation performed:**

1. `npm run validate:registry` (this repo's own offline structural check, `scripts/validate-registry.mjs`) — **passed, zero failures**:
   ```
   ✓ "name" present: com.theholisticcare/open-mindfulness
   ✓ "description" present: Read-only mindfulness games, guided practices, research, glossary and PanchaVikas resources.
   ✓ "version" present: 1.0.0
   ✓ "name" matches the namespaced "<namespace>/<name>" shape.
   ✓ "repository.url" present: https://github.com/mohanagc/thc-mindfulness-mcp
   ✓ "repository.source" present: github
   ✓ remotes[0].type: streamable-http
   ✓ remotes[0].url: https://mcp.theholisticcare.com/mcp
   ✓ version matches package.json (1.0.0).
   server.json passed structural validation.
   ```
2. `node -e "require('./server.json')"` — confirmed valid JSON, all 8 expected top-level keys present.

**Could NOT run the real official `mcp-publisher` CLI in this sandbox** (`mcp-publisher --help` / `mcp-publisher validate server.json`) — genuine environment limitation, not skipped:
- The official CLI is a Go binary distributed **only** via GitHub Releases (`github.com/modelcontextprotocol/registry`) — it is **not published to npm** (confirmed: no `@modelcontextprotocol/publisher` or equivalent scoped package exists on the npm registry).
- This sandbox's outbound proxy allows plain `github.com` (HTTP 200) but blocks `objects.githubusercontent.com` (where release binary downloads actually redirect to), `raw.githubusercontent.com`, `api.github.com`, and `registry.modelcontextprotocol.io`/`static.modelcontextprotocol.io` entirely (all return `403 from proxy after CONNECT`) — so the release `.tar.gz` could not be downloaded by any method tried (`curl`, the sandbox's `web_fetch` tool), and even the plain-text `checksums.txt` GoReleaser publishes alongside each release came back empty for the same reason.
- `go install` was considered as a fallback but Go is not installed, and installing it via `apt-get` failed with `Permission denied` on the dpkg lock (this sandbox user has no root/sudo access).
- **A superficially similar npm package literally named `mcp-publisher` (v0.4.2) does exist on npm — this was checked and explicitly rejected.** It is an unrelated, unofficial tool (description in Russian: a Playwright browser-automation tool for "auto-publishing content on any platform," by a third-party maintainer with no connection to the MCP project). Installing or running it would be a real, unnecessary security risk (arbitrary browser automation of unknown scope) for a name-collision package that has nothing to do with the Official MCP Registry. **It was not installed.**

**Resolved 2026-09-29, same day, by Mohan on his own machine (real internet access):**

1. Downloaded `mcp-publisher_windows_amd64.tar.gz` **v1.8.1** directly from `https://github.com/modelcontextprotocol/registry/releases/tag/v1.8.1` (the newest release as of this date — v1.8.1, not the v1.7.9 that was the latest visible from the sandbox's limited fetch earlier the same day).
2. **Independently verified the SHA-256 checksum against GitHub's own release-asset listing before extracting anything**: `sha256:399ad0d6e00a50812b563a71d8bfbff5160c085e6b13aac6ec083d98d5ff7c45` — confirmed by both GitHub's own displayed hash on the release page and `Get-FileHash` on the downloaded file. Match confirmed.
3. Extracted to `E:\Tools\mcp-publisher\` (`mcp-publisher.exe`, `LICENSE`, `README`).
4. Ran `.\mcp-publisher.exe --help` — confirmed the real CLI, printed the expected command list: `init`, `login`, `logout`, `publish`, `status`, `validate`.
5. Ran `.\mcp-publisher.exe validate "E:\thc-mindfulness-mcp\server.json"` — **result:**
   ```
   Validating against https://registry.modelcontextprotocol.io...
   ✅ server.json is valid
   ```
   This validated against the **live, current official registry schema** (not just an offline shape check) — the strongest confirmation available short of actually publishing. The DNS-auth namespace change (`com.theholisticcare/open-mindfulness`), the schema version bump, and every other field in `server.json` are all confirmed correct and accepted by the real registry as of 2026-09-29.

Only `--help` and `validate` were run in the sandbox-limited portion of this session. No `login`, `login github`, `login dns`, or `publish` was run there. No DNS TXT record or key pair was generated in the sandbox. Nothing was committed or pushed to GitHub as part of that step.

## Session log continued, same day (2026-09-29) — DNS domain verification and publish, completed by Mohan on his own machine

Mohan carried this through to completion himself, step by step, each one confirmed before the next:

1. **Key generated.** `openssl genpkey -algorithm Ed25519 -out key.pem`, run in Git Bash (OpenSSL 3.5.4 — confirmed present in Git Bash even though the plain PowerShell prompt didn't have it on `PATH`). Saved to `E:\THC-private-keys\mcp-registry\key.pem`, **outside** this repo, never committed.
2. **Public key derived and added to DNS.** `openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64` → `v=MCPv1; k=ed25519; p=IgKI9kNiSeEv2GmZTI7/6QT6wgVTLvt87V9RC/WkVuE=`. Added as a **new, additive** TXT record (`Name: @`) in Cloudflare — every existing SPF/DKIM/DMARC/Google-site-verification/Vercel-domain-verify TXT record on `theholisticcare.com` was left untouched (confirmed by screenshot of the full DNS record list before and after). Confirmed publicly resolving via `Resolve-DnsName theholisticcare.com -Type TXT`.
3. **`mcp-publisher login dns --help` checked first**, specifically to see if a file-based key option existed as a safer alternative to a raw-hex CLI argument. It doesn't — `-private-key` only accepts a hex string, no `-private-key-file`. Given that constraint, the private key was extracted using the same DER-slicing technique already proven safe for the public key (`openssl pkey -in key.pem -outform DER | tail -c 32 | od -An -tx1 | tr -d ' \n'` — 64 hex chars, confirmed by length check before use) rather than the more fragile `openssl pkey ... -text | grep -A3 "priv:"` text-parsing approach from the original plan, and the whole extract-and-login sequence was wrapped in `set +o history` / `set -o history` plus an explicit `unset` afterward, so the raw private key never touched Bash history.
4. **DNS login succeeded:**
   ```
   Logging in with dns...
   Signing in process using key algorithm ed25519
   Expected proof record:
   v=MCPv1; k=ed25519; p=IgKI9kNiSeEv2GmZTI7/6QT6wgVTLvt87V9RC/WkVuE=
   ✓ Successfully logged in
   ```
5. **Final `validate` re-run, clean:** `✅ server.json is valid` against the live registry, same as before.
6. **Published:**
   ```
   Publishing to https://registry.modelcontextprotocol.io...
   ✓ Successfully published
   ✓ Server com.theholisticcare/open-mindfulness version 1.0.0
   ```

**`com.theholisticcare/open-mindfulness` v1.0.0 is now live on the Official MCP Registry**, authenticated entirely via DNS domain ownership. No GitHub OAuth, no GitHub App installation, no GitHub issue/PR/fork/tag/release/workflow was created at any point in this entire registry-publishing arc.

**Still to do:** one single consolidated commit/push of `server.json`, `REGISTRY-PUBLISHING.md`, and `HANDOFF.md` (this file) to `github.com/mohanagc/thc-mindfulness-mcp` — deliberately held back until publish succeeded, to avoid generating multiple small GitHub events during an in-progress step. Also worth doing once convenient: confirm the listing shows up at the registry's public server-lookup UI/API from a real browser (the sandbox that prepared this work has no route to `registry.modelcontextprotocol.io`, so that specific check needs to happen from a machine with normal internet access). And: **back up `E:\THC-private-keys\mcp-registry\key.pem` securely and keep it somewhere durable** — the same key will be needed to publish any future version update to this server, and it exists nowhere else (it was never uploaded, transmitted, or copied into this repo).

## Content and security boundaries (recap — see SECURITY.md and LICENSING.md for full detail)

- No Sanity/database/payment access, ever, from this server.
- No premium content, no private PanchaVikas curriculum, no user data.
- No writes. No LLM calls made by this server itself. No arbitrary web access — only a fixed, small set of `api.theholisticcare.com` routes.
- Code is MIT; content returned by the tools is Copyright © The Holistic Care, all rights reserved unless stated otherwise (never Creative Commons).
