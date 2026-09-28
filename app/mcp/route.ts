/**
 * The Streamable HTTP MCP endpoint: POST/GET/DELETE https://mcp.theholisticcare.com/mcp
 *
 * Security posture (do not weaken):
 *  - A fresh McpServer is built per request via buildMcpServer() (true
 *    statelessness — nothing about one caller's request can leak into
 *    another's, and there is no session state to attack).
 *  - Host and Origin headers are validated in front of the handler, per the
 *    SDK's own documented pattern for bare-mounted deployments. A missing
 *    Origin header (the normal case for non-browser MCP clients — Claude
 *    Desktop, Claude Code, MCP Inspector, server-to-server callers) is
 *    allowed through by validateOriginHeader's own documented behavior; only
 *    a *present-but-disallowed* Origin is rejected. This satisfies the
 *    project requirement that non-browser clients keep working while still
 *    defending against DNS-rebinding/CSRF-style attacks from a browser
 *    context.
 *  - The allowed hostname list is the production domain plus localhost (for
 *    local development only) — never a wildcard.
 */
import { createMcpHandler, hostHeaderValidationResponse, originValidationResponse } from "@modelcontextprotocol/server";
import { buildMcpServer } from "../../src/server";

const PRODUCTION_HOSTNAME = "mcp.theholisticcare.com";

const ALLOWED_HOSTNAMES =
  process.env.NODE_ENV === "production"
    ? [PRODUCTION_HOSTNAME]
    : [PRODUCTION_HOSTNAME, "localhost", "127.0.0.1"];

const handler = createMcpHandler(() => buildMcpServer(), {
  legacy: "stateless",
});

async function handle(request: Request): Promise<Response> {
  const rejected =
    hostHeaderValidationResponse(request, ALLOWED_HOSTNAMES) ??
    originValidationResponse(request, ALLOWED_HOSTNAMES);
  if (rejected) return rejected;

  return handler.fetch(request);
}

export const runtime = "nodejs";

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
