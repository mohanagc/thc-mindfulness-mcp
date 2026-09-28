#!/usr/bin/env node
/**
 * Production smoke test for the deployed MCP server (Task #200 / HANDOFF.md).
 *
 * Run after every deploy: `npm run smoke:production`.
 *
 * Unlike tests/*.test.ts (which mock every network call), this script makes
 * REAL requests to a REAL, deployed MCP endpoint, speaking the actual MCP
 * Streamable HTTP wire protocol via the SDK's Client + StreamableHTTPClientTransport
 * — the same client stack any real MCP host (Claude, an IDE, etc.) would use.
 * It never runs against localhost by default and is never part of the CI
 * unit-test suite.
 */
import { Client } from "@modelcontextprotocol/sdk/client";
// @ts-expect-error -- resolved via the wildcard "./*" export; confirmed
// present on disk at dist/esm/client/streamableHttp.js.
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = process.env.SMOKE_MCP_URL || "https://mcp.theholisticcare.com/mcp";

const EXPECTED_TOOL_NAMES = [
  "search_mindfulness_resources",
  "get_mindfulness_resource",
  "find_mindfulness_games",
  "find_guided_practices",
  "search_mindfulness_research",
  "lookup_mindfulness_term",
  "find_panchavikas_resources",
].sort();

const EXPECTED_RESOURCE_URIS = [
  "thc://about",
  "thc://taxonomy",
  "thc://usage",
  "thc://content-rights",
  "thc://panchavikas/framework",
].sort();

let failed = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ok  - ${name}`);
  } else {
    failed++;
    console.error(`FAIL - ${name}`);
    if (detail) console.error(`       ${detail}`);
  }
}

async function main() {
  console.log(`Smoke-testing MCP server at ${MCP_URL}\n`);

  // --- 1. Plain HTTP health check first (no MCP protocol needed) ---
  // The Next.js app also serves a plain GET /health outside the MCP handler
  // (see app/health/route.ts) for uptime monitors that don't speak MCP.
  try {
    const healthUrl = new URL("/health", MCP_URL).toString();
    const res = await fetch(healthUrl, { headers: { Accept: "application/json" } });
    const body = await res.json().catch(() => null);
    check("GET /health returns 200 with status: ok", res.status === 200 && body?.status === "ok", `got status ${res.status}, body ${JSON.stringify(body)}`);
  } catch (err) {
    check("GET /health returns 200 with status: ok", false, `request failed: ${(err as Error).message}`);
  }

  // --- 2. Real MCP protocol handshake + tools/list + resources/list ---
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client({ name: "thc-mcp-smoke-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    check("MCP initialize handshake succeeds", true);

    const { tools } = await client.listTools();
    const names = tools.map((t: { name: string }) => t.name).sort();
    check(
      "tools/list returns exactly the 7 documented tools",
      JSON.stringify(names) === JSON.stringify(EXPECTED_TOOL_NAMES),
      `got: ${JSON.stringify(names)}`,
    );

    const { resources } = await client.listResources();
    const uris = resources.map((r: { uri: string }) => r.uri).sort();
    check(
      "resources/list returns exactly the 5 documented resources",
      JSON.stringify(uris) === JSON.stringify(EXPECTED_RESOURCE_URIS),
      `got: ${JSON.stringify(uris)}`,
    );

    // --- 3. One real end-to-end tool call against the live upstream API ---
    const searchResult = await client.callTool({
      name: "search_mindfulness_resources",
      arguments: { query: "breathing", resource_type: "guided_practice" },
    });
    check(
      "tools/call search_mindfulness_resources succeeds against live upstream API",
      searchResult.isError !== true,
      `isError: ${searchResult.isError}, content: ${JSON.stringify(searchResult.content).slice(0, 300)}`,
    );

    // --- 4. A resources/read call ---
    const aboutResult = await client.readResource({ uri: "thc://about" });
    const [aboutContent] = aboutResult.contents as Array<{ text?: string }>;
    check(
      "resources/read thc://about returns non-empty text",
      typeof aboutContent?.text === "string" && aboutContent.text.length > 0,
    );

    // --- 5. Confirm the server never exposes prompts, even live ---
    try {
      const { prompts } = await client.listPrompts();
      check("live server exposes zero prompts", Array.isArray(prompts) && prompts.length === 0, `got ${JSON.stringify(prompts)}`);
    } catch {
      check("live server exposes zero prompts (capability unsupported)", true);
    }
  } catch (err) {
    check("MCP protocol checks", false, `unexpected error: ${(err as Error).message}`);
  } finally {
    await client.close().catch(() => {});
  }

  console.log(`\n${failed === 0 ? "All" : "Not all"} checks passed against ${MCP_URL}`);
  if (failed > 0) {
    console.error(`${failed} check(s) failed.`);
    process.exit(1);
  }
}

main();
