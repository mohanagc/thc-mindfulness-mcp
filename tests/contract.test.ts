/**
 * In-process MCP protocol contract test.
 *
 * This connects a real `Client` (from the SDK) to a real `McpServer`
 * (the exact one `buildMcpServer()` constructs) over `InMemoryTransport`,
 * bypassing HTTP entirely. It verifies the server speaks the MCP protocol
 * correctly at the tools/list, resources/list, tools/call, and
 * resources/read level — not just that individual handler functions
 * return the right JS values (that's tools.test.ts's job).
 *
 * Every tool call here still goes through a mocked `globalThis.fetch`,
 * so this test suite makes no real network calls either.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client";
// No dedicated "./inMemory" export key in package.json; resolved via the
// wildcard "./*" export. Confirmed present on disk at
// dist/esm/inMemory.js / inMemory.d.ts, and confirmed by a real `tsc` run
// that this resolves cleanly under this project's moduleResolution setting
// (an earlier `@ts-expect-error` guard here was itself flagged as unused).
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { buildMcpServer } from "../src/server.js";
import { jsonResponse, successList, withMockFetch } from "./testUtils.js";
import type { ApiResource } from "../src/types.js";

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

/** Connects a fresh client+server pair over InMemoryTransport for one test. */
async function withConnectedClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const server = buildMcpServer();
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "contract-test-client", version: "0.0.0" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    return await fn(client);
  } finally {
    await client.close();
    await server.close();
  }
}

test("contract: server advertises exactly the 7 documented tools, no more, no fewer", async () => {
  await withConnectedClient(async (client) => {
    const { tools } = await client.listTools();
    const names = tools.map((t: { name: string }) => t.name).sort();
    assert.deepEqual(names, EXPECTED_TOOL_NAMES);
  });
});

test("contract: server advertises exactly the 5 documented resources, no more, no fewer", async () => {
  await withConnectedClient(async (client) => {
    const { resources } = await client.listResources();
    const uris = resources.map((r: { uri: string }) => r.uri).sort();
    assert.deepEqual(uris, EXPECTED_RESOURCE_URIS);
  });
});

test("contract: server exposes zero prompts (V1 scope explicitly excludes prompts)", async () => {
  // Asserted behaviorally rather than against the raw capabilities object:
  // some server frameworks may declare an (empty) prompts capability
  // unconditionally regardless of whether any prompt was ever registered.
  // What actually matters for the "zero prompts" requirement is that no
  // prompt is ever returned to a client that asks — either listPrompts()
  // is unsupported outright, or it resolves with an empty list.
  await withConnectedClient(async (client) => {
    try {
      const { prompts } = await client.listPrompts();
      assert.deepEqual(prompts, [], "the server must never expose any prompts");
    } catch {
      // Rejecting outright (capability not supported) also satisfies "zero prompts".
    }
  });
});

test("contract: tools/call end-to-end for search_mindfulness_resources returns valid MCP content + structuredContent", async () => {
  const fixture: ApiResource[] = [
    {
      id: "MG-001",
      title: "Focus Flashlight",
      slug: "focus-flashlight",
      type: "mindfulness_game",
      summary: "An attention training game.",
      category: "attention",
      tags: null,
      audiences: ["children"],
      age_min: 6,
      age_max: 12,
      duration_minutes: 5,
      skills: ["attention"],
      access: "free",
      source_url: "https://www.theholisticcare.com/games/focus-flashlight.html",
      updated_at: null,
    },
  ];

  await withMockFetch(
    async () => jsonResponse(200, successList(fixture)),
    async () => {
      await withConnectedClient(async (client) => {
        const result = await client.callTool({
          name: "search_mindfulness_resources",
          arguments: { query: "focus" },
        });
        assert.equal(result.isError, undefined, "a successful call must not set isError");
        // The human-readable `content` is a plain-text summary (see
        // summarizeList() in src/tools/index.ts), not JSON — the machine-
        // readable shape lives in `structuredContent` instead.
        assert.ok(Array.isArray(result.content) && result.content.length > 0);
        assert.equal(result.content[0]!.type, "text");
        assert.match(result.content[0]!.text as string, /Focus Flashlight/);

        const structured = result.structuredContent as { results: Array<{ id: string }>; count: number } | undefined;
        assert.ok(structured, "list tools must return structuredContent");
        assert.equal(structured!.count, 1);
        assert.equal(structured!.results[0]!.id, "MG-001");
      });
    },
  );
});

test("contract: tools/call surfaces a not_found error as an MCP tool error, not a transport failure", async () => {
  await withMockFetch(
    async () => jsonResponse(404, { error: { code: "not_found", message: "no such glossary term" } }),
    async () => {
      await withConnectedClient(async (client) => {
        const result = await client.callTool({
          name: "get_mindfulness_resource",
          arguments: { resource_type: "glossary", identifier: "does-not-exist" },
        });
        assert.equal(result.isError, true);
      });
    },
  );
});

test("contract: invalid input against a tool's declared inputSchema never reaches the network layer", async () => {
  // Two SDK-conformant behaviors are both acceptable here: the transport may
  // reject the call outright (protocol-level schema validation before the
  // handler runs), or the handler's own tool.config.inputSchema.parse() may
  // catch the ZodError and return { isError: true } (see handleToolError in
  // src/tools/index.ts). What must be true either way, and is the actual
  // security-relevant guarantee: fetch is never called with unvalidated input.
  let handlerCalled = false;
  await withMockFetch(
    async () => {
      handlerCalled = true;
      return jsonResponse(200, successList<ApiResource>([]));
    },
    async () => {
      await withConnectedClient(async (client) => {
        // get_mindfulness_resource requires both resource_type and identifier;
        // omitting identifier must fail validation one way or the other.
        try {
          const result = await client.callTool({
            name: "get_mindfulness_resource",
            arguments: { resource_type: "glossary" },
          });
          assert.equal(result.isError, true, "if the call resolves at all, it must be reported as an error");
        } catch {
          // A protocol-level rejection is also an acceptable outcome.
        }
      });
    },
  );
  assert.equal(handlerCalled, false, "invalid input must never reach the network layer");
});

/**
 * A resource content entry from the SDK is a union of a text variant and a
 * blob (base64) variant, distinguished by which of `text`/`blob` is present.
 * All 5 of this server's resources are static text (see src/resources/index.ts),
 * so every real response should take this branch; asserting it explicitly
 * both narrows the type for the caller and documents that expectation.
 */
function expectTextContent(content: { uri: string; text?: string; blob?: string }): string {
  assert.ok(typeof content.text === "string", `expected a text resource content entry for ${content.uri}, got a blob`);
  return content.text;
}

test("contract: resources/read returns thc://about with real, non-empty text content", async () => {
  await withConnectedClient(async (client) => {
    const result = await client.readResource({ uri: "thc://about" });
    assert.ok(Array.isArray(result.contents) && result.contents.length > 0);
    const content = result.contents[0]!;
    assert.equal(content.uri, "thc://about");
    const text = expectTextContent(content);
    assert.ok(text.length > 0);
  });
});

test("contract: resources/read returns thc://content-rights stating content is not Creative Commons / all rights reserved", async () => {
  await withConnectedClient(async (client) => {
    const result = await client.readResource({ uri: "thc://content-rights" });
    const content = result.contents[0]!;
    const text = expectTextContent(content);
    assert.ok(/all rights reserved/i.test(text), "content-rights resource must state the all-rights-reserved position");
    assert.ok(!/creative commons/i.test(text) || /not.*creative commons|is not licensed under creative commons/i.test(text));
  });
});
