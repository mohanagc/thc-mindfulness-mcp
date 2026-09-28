/**
 * Tool 2: get_mindfulness_resource
 *
 * Retrieves ONE known resource by type + identifier, routed to the correct
 * dedicated detail endpoint per the live OpenAPI contract:
 *   blog              -> GET /v1/blog/{slug}
 *   mindfulness_game  -> GET /v1/mindfulness-games/{slug}
 *   guided_practice   -> GET /v1/practices/{slug}
 *   research          -> GET /v1/whitepapers/{slug}
 *   glossary          -> GET /v1/glossary/{slug}
 *   panchavikas_pathway / panchavikas_download ->
 *       no per-item detail route exists upstream. GET /v1/panchavikas/resources
 *       (the one, fixed, non-paginated list) and match by the resource's own
 *       stable `id` (e.g. "PV-pathway-jal"), since that family has no slug field.
 *
 * A private or genuinely missing resource behave IDENTICALLY here (404 ->
 * not_found) — this endpoint never distinguishes "exists but is private" from
 * "does not exist," so it cannot be used to enumerate private content by
 * probing.
 */
import { getJson } from "../lib/apiClient";
import { notFound } from "../lib/errors";
import {
  fromBlog,
  fromGame,
  fromGlossaryTerm,
  fromPanchaVikas,
  fromPractice,
  fromResearch,
  type McpResource,
} from "../lib/normalize";
import { getMindfulnessResourceInput, type GetMindfulnessResourceInput } from "../schemas";
import type {
  ApiBlogSummary,
  ApiGlossaryTerm,
  ApiMindfulnessGame,
  ApiPanchaVikasResource,
  ApiPractice,
  ApiResearchCitation,
  ApiSuccessDetail,
  ApiSuccessList,
} from "../types";

export const getMindfulnessResourceTool = {
  name: "get_mindfulness_resource",
  config: {
    title: "Get one mindfulness resource",
    description:
      "Fetches the full detail record for ONE specific, already-identified public " +
      "resource — use this after search_mindfulness_resources or another find/search " +
      "tool has surfaced a slug or id you now want the complete record for (e.g. a " +
      "glossary term's full extended explanation, or a game's full description). " +
      "For blog/mindfulness_game/guided_practice/research/glossary, `identifier` is " +
      "the resource's slug. For panchavikas_pathway/panchavikas_download, " +
      "`identifier` is the resource's stable id (e.g. 'PV-pathway-jal'), since that " +
      "family has no slug. A resource that does not exist and a resource that exists " +
      "but is private behave identically here (a clean not-found result) — this tool " +
      "never confirms or denies the existence of private content.",
    inputSchema: getMindfulnessResourceInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  handler: async (input: GetMindfulnessResourceInput): Promise<McpResource> => {
    switch (input.resource_type) {
      case "blog": {
        const { data } = await getJson<ApiSuccessDetail<ApiBlogSummary>>(
          `/v1/blog/${encodeURIComponent(input.identifier)}`,
        );
        return fromBlog(data.data);
      }
      case "mindfulness_game": {
        const { data } = await getJson<ApiSuccessDetail<ApiMindfulnessGame>>(
          `/v1/mindfulness-games/${encodeURIComponent(input.identifier)}`,
        );
        return fromGame(data.data);
      }
      case "guided_practice": {
        const { data } = await getJson<ApiSuccessDetail<ApiPractice>>(
          `/v1/practices/${encodeURIComponent(input.identifier)}`,
        );
        return fromPractice(data.data);
      }
      case "research": {
        const { data } = await getJson<ApiSuccessDetail<ApiResearchCitation>>(
          `/v1/whitepapers/${encodeURIComponent(input.identifier)}`,
        );
        return fromResearch(data.data);
      }
      case "glossary": {
        const { data } = await getJson<ApiSuccessDetail<ApiGlossaryTerm>>(
          `/v1/glossary/${encodeURIComponent(input.identifier)}`,
        );
        return fromGlossaryTerm(data.data);
      }
      case "panchavikas_pathway":
      case "panchavikas_download": {
        const { data } = await getJson<ApiSuccessList<ApiPanchaVikasResource>>("/v1/panchavikas/resources");
        const match = data.data.find((r) => r.id === input.identifier && r.type === input.resource_type);
        if (!match) throw notFound("PanchaVikas resource");
        return fromPanchaVikas(match);
      }
      default: {
        // Exhaustiveness guard — the Zod enum already prevents reaching here.
        throw notFound("resource");
      }
    }
  },
};
