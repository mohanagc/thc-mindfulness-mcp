import { SERVER_VERSION } from "../../src/lib/constants.js";

export const runtime = "nodejs";

/** Never depends on Sanity or the upstream REST API — a static, always-answerable check. */
export function GET(): Response {
  return Response.json(
    { status: "ok", service: "thc-open-mindfulness-mcp", version: SERVER_VERSION },
    { headers: { "Cache-Control": "no-store" } },
  );
}
