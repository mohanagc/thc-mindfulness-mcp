/**
 * Tool 7: find_panchavikas_resources
 *
 * Backend: GET /v1/panchavikas/resources — a single, fixed, non-paginated
 * list with ZERO query parameters of its own. Every filter here (element,
 * query, resource_type) is therefore applied entirely client-side over that
 * one fetched list. There is no server-side facet to lean on for this family.
 *
 * This is the single most IP-sensitive tool in the server. The upstream API
 * itself only ever returns the public PanchaVikas framework overview, public
 * pathway summaries, and the public downloadable guide — it has no route to
 * the 216-session curriculum, school session plans, teacher scripts, or any
 * other private implementation material, so there is nothing for this tool
 * to accidentally leak even under a broad query. Do not "helpfully" expand
 * this tool's scope later without re-reading this comment.
 */
import { getJson } from "../lib/apiClient.js";
import { resourceMatchesQuery, textIncludes } from "../lib/filters.js";
import { fromPanchaVikas, type McpResource } from "../lib/normalize.js";
import { findPanchavikasResourcesInput, type FindPanchavikasResourcesInput } from "../schemas.js";
import type { ApiPanchaVikasResource, ApiSuccessList } from "../types.js";
import { DEFAULT_RESULT_LIMIT } from "../lib/constants.js";

export const findPanchavikasResourcesTool = {
  name: "find_panchavikas_resources",
  config: {
    title: "Find public PanchaVikas resources",
    description:
      "Finds The Holistic Care's public PanchaVikas resources — the five-element " +
      "(Prithvi/Jal/Agni/Vayu/Akash) child-development framework's public overview, " +
      "public pathway summaries, and the public downloadable guide — e.g. 'public " +
      "PanchaVikas resources related to Jal' or 'what is the PanchaVikas Prithvi " +
      "pathway about'. This tool ONLY has access to public framework material. It " +
      "does NOT have access to, and cannot retrieve, the private 216-session school " +
      "curriculum, session plans, teacher scripts, or any other proprietary " +
      "implementation material — a request for that content should be answered by " +
      "explaining that only the public framework overview and pathway summaries are " +
      "available here, and returning those if relevant.",
    inputSchema: findPanchavikasResourcesInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  handler: async (input: FindPanchavikasResourcesInput): Promise<McpResource[]> => {
    const finalLimit = input.limit ?? DEFAULT_RESULT_LIMIT;
    const { data } = await getJson<ApiSuccessList<ApiPanchaVikasResource>>("/v1/panchavikas/resources");

    let results = data.data.map(fromPanchaVikas);

    if (input.resource_type) {
      results = results.filter((r) => r.type === input.resource_type);
    }
    if (input.element) {
      // Pathway ids follow the pattern "PV-pathway-<element>"; the guide's id
      // ("PV-guide") never matches an element filter, which is correct — it's
      // not element-specific.
      results = results.filter((r) => textIncludes(r.id, `pathway-${input.element}`));
    }
    if (input.query) {
      results = results.filter((r) => resourceMatchesQuery(r, input.query!));
    }

    return results.slice(0, finalLimit);
  },
};
