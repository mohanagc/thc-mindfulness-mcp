import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { logToolCall } from "../lib/logger";
import { AppError } from "../lib/errors";
import type { McpResource } from "../lib/normalize";

import { searchMindfulnessResourcesTool } from "./searchMindfulnessResources";
import { getMindfulnessResourceTool } from "./getMindfulnessResource";
import { findMindfulnessGamesTool } from "./findMindfulnessGames";
import { findGuidedPracticesTool } from "./findGuidedPractices";
import { searchMindfulnessResearchTool } from "./searchMindfulnessResearch";
import { lookupMindfulnessTermTool } from "./lookupMindfulnessTerm";
import { findPanchavikasResourcesTool } from "./findPanchavikasResources";

/** Shared output schema for every list-returning tool. */
const resourceOutputSchema = z.object({
  results: z.array(z.record(z.string(), z.unknown())),
  count: z.number(),
});

/** Shared output schema for the single-resource tool. */
const singleResourceOutputSchema = z.object({
  found: z.boolean(),
  resource: z.record(z.string(), z.unknown()).nullable(),
});

function summarizeList(results: McpResource[]): string {
  if (results.length === 0) {
    return "No matching public resources were found.";
  }
  const lines = results.map((r, i) => {
    const bits = [`${i + 1}. ${r.title}`, `[${r.type}]`];
    if (r.canonical_url) bits.push(r.canonical_url);
    return bits.join(" — ");
  });
  return `Found ${results.length} resource(s):\n${lines.join("\n")}`;
}

function summarizeOne(resource: McpResource | null): string {
  if (!resource) return "No matching public resource was found.";
  const bits = [resource.title, `[${resource.type}]`];
  if (resource.summary) bits.push(resource.summary);
  if (resource.canonical_url) bits.push(resource.canonical_url);
  return bits.join(" — ");
}

type ListTool<TInput> = {
  name: string;
  config: Record<string, unknown> & { inputSchema: z.ZodType<TInput> };
  handler: (input: TInput) => Promise<McpResource[]>;
};

type SingleTool<TInput> = {
  name: string;
  config: Record<string, unknown> & { inputSchema: z.ZodType<TInput> };
  handler: (input: TInput) => Promise<McpResource | null | McpResource>;
};

function registerListTool<TInput>(server: McpServer, tool: ListTool<TInput>): void {
  // Cast the config through `any` at this one call site only: registerTool's
  // overloads infer their callback's argument type from `inputSchema`'s own
  // concrete Zod type, which our shared `ListTool<TInput>` abstraction
  // deliberately erases to `z.ZodType<TInput>` so every tool file can share
  // one registration helper. Full type safety is preserved anyway — every
  // input is re-validated via `tool.config.inputSchema.parse(rawInput)`
  // immediately below, using the same schema, before it ever reaches
  // `tool.handler`.
  server.registerTool(
    tool.name,
    { ...tool.config, outputSchema: resourceOutputSchema } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    async (rawInput: unknown) => {
      const started = Date.now();
      try {
        const input = tool.config.inputSchema.parse(rawInput);
        const results = await tool.handler(input);
        logToolCall({
          tool: tool.name,
          duration_ms: Date.now() - started,
          result_count: results.length,
          ok: true,
        });
        const structured = { results, count: results.length };
        return {
          content: [{ type: "text" as const, text: summarizeList(results) }],
          structuredContent: structured,
        };
      } catch (err) {
        return handleToolError(tool.name, started, err);
      }
    },
  );
}

function registerSingleTool<TInput>(server: McpServer, tool: SingleTool<TInput>): void {
  // See the comment in registerListTool above — same reasoning applies here.
  server.registerTool(
    tool.name,
    { ...tool.config, outputSchema: singleResourceOutputSchema } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    async (rawInput: unknown) => {
      const started = Date.now();
      try {
        const input = tool.config.inputSchema.parse(rawInput);
        const resource = await tool.handler(input);
        logToolCall({
          tool: tool.name,
          duration_ms: Date.now() - started,
          result_count: resource ? 1 : 0,
          ok: true,
        });
        const structured = { found: Boolean(resource), resource: resource ?? null };
        return {
          content: [{ type: "text" as const, text: summarizeOne(resource ?? null) }],
          structuredContent: structured,
        };
      } catch (err) {
        return handleToolError(tool.name, started, err);
      }
    },
  );
}

function handleToolError(toolName: string, started: number, err: unknown) {
  if (err instanceof z.ZodError) {
    logToolCall({
      tool: toolName,
      duration_ms: Date.now() - started,
      ok: false,
      error_code: "invalid_input",
    });
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Invalid input: ${err.issues.map((i) => i.message).join("; ")}`,
        },
      ],
    };
  }
  if (err instanceof AppError) {
    logToolCall({
      tool: toolName,
      duration_ms: Date.now() - started,
      ok: false,
      error_code: err.code,
    });
    return {
      isError: true,
      content: [{ type: "text" as const, text: err.message }],
    };
  }
  logToolCall({
    tool: toolName,
    duration_ms: Date.now() - started,
    ok: false,
    error_code: "internal_error",
  });
  return {
    isError: true,
    content: [{ type: "text" as const, text: "An internal error occurred while handling this request." }],
  };
}

/** Registers all seven V1 tools on a freshly constructed McpServer instance. */
export function registerAllTools(server: McpServer): void {
  registerListTool(server, searchMindfulnessResourcesTool);
  registerSingleTool(server, getMindfulnessResourceTool);
  registerListTool(server, findMindfulnessGamesTool);
  registerListTool(server, findGuidedPracticesTool);
  registerListTool(server, searchMindfulnessResearchTool);
  registerSingleTool(server, lookupMindfulnessTermTool);
  registerListTool(server, findPanchavikasResourcesTool);
}
