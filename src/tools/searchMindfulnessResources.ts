/**
 * Tool 1: search_mindfulness_resources
 *
 * Backend: GET /v1/search (q, limit, offset only — no server-side type/
 * category/audience/skill/age filters exist on this endpoint per the live
 * OpenAPI contract). resource_type/category/audience/skill/age are therefore
 * applied as an honest CLIENT-SIDE post-filter over the search results, never
 * pretended to be server-side facets. This is deliberately documented in the
 * tool description below so a calling model understands the limitation.
 */
import { getJson } from "../lib/apiClient.js";
import { ageRangeCovers, textIncludes } from "../lib/filters.js";
import { fromUnifiedResource, type McpResource } from "../lib/normalize.js";
import { searchMindfulnessResourcesInput, type SearchMindfulnessResourcesInput } from "../schemas.js";
import type { ApiResource, ApiSuccessList } from "../types.js";
import { DEFAULT_RESULT_LIMIT, MAX_RESULT_LIMIT } from "../lib/constants.js";

export const searchMindfulnessResourcesTool = {
  name: "search_mindfulness_resources",
  config: {
    title: "Search mindfulness resources",
    description:
      "Free-text search across every public resource family on The Holistic Care " +
      "(blog articles, mindfulness games, free guided practices, research summaries, " +
      "glossary terms, and public PanchaVikas resources). Use this as the general " +
      "entry point when a request doesn't clearly belong to one specific family — " +
      "e.g. 'Find something about breathing for anxiety' or 'What has THC published " +
      "about nondual awareness?'. `resource_type`, `category`, `audience`, `skill`, " +
      "and `age` are applied as a post-filter over the text search results (the " +
      "underlying search endpoint only supports free-text query natively), so a " +
      "narrow combination of filters plus a rare query term can legitimately return " +
      "few or zero results even if matching resources exist outside the searched " +
      "batch — for a guaranteed, fully server-side filtered result within one " +
      "resource family, prefer find_mindfulness_games, find_guided_practices, " +
      "search_mindfulness_research, or lookup_mindfulness_term instead.",
    inputSchema: searchMindfulnessResourcesInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  handler: async (input: SearchMindfulnessResourcesInput): Promise<McpResource[]> => {
    const finalLimit = input.limit ?? DEFAULT_RESULT_LIMIT;
    const needsPostFilter = Boolean(
      input.resource_type || input.category || input.audience || input.skill || input.age !== undefined,
    );
    // Over-fetch when post-filtering so filtering-out doesn't starve the result
    // set, capped well below anything resembling a bulk dump.
    const fetchLimit = needsPostFilter ? Math.min(MAX_RESULT_LIMIT * 3, 60) : finalLimit;

    const { data } = await getJson<ApiSuccessList<ApiResource>>("/v1/search", {
      q: input.query,
      limit: fetchLimit,
    });

    let results = data.data.map(fromUnifiedResource);

    if (input.resource_type) {
      results = results.filter((r) => r.type === input.resource_type);
    }
    if (input.category) {
      results = results.filter((r) => textIncludes(r.category, input.category!));
    }
    if (input.audience) {
      results = results.filter((r) => (r.audiences ?? []).some((a) => textIncludes(a, input.audience!)));
    }
    if (input.skill) {
      results = results.filter((r) => (r.skills ?? []).some((s) => textIncludes(s, input.skill!)));
    }
    if (input.age !== undefined) {
      results = results.filter((r) => ageRangeCovers(r, input.age!));
    }

    return results.slice(0, finalLimit);
  },
};
