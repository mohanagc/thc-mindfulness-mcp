/**
 * Builds a fresh McpServer instance for one serving unit (one HTTP request
 * under createMcpHandler's stateless model). Deliberately cheap to construct
 * — no I/O happens here, only registration of the seven tools and five
 * resources against in-memory definitions.
 */
import { McpServer } from "@modelcontextprotocol/server";
import {
  MAIN_SITE_URL,
  SERVER_INSTRUCTIONS,
  SERVER_NAME,
  SERVER_TITLE,
  SERVER_VERSION,
} from "./lib/constants";
import { registerAllTools } from "./tools/index";
import { registerAllResources } from "./resources/index";

export function buildMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      title: SERVER_TITLE,
      version: SERVER_VERSION,
      description:
        "Read-only MCP server providing structured mindfulness games, free guided " +
        "practices, research resources, glossary concepts, PanchaVikas public " +
        "resources and cross-resource discovery from The Holistic Care.",
      websiteUrl: MAIN_SITE_URL,
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  registerAllTools(server);
  registerAllResources(server);

  return server;
}
