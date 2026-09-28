/**
 * Tool 4: find_guided_practices
 *
 * Backend: GET /v1/practices (server-side: category, limit/offset). This
 * endpoint deliberately only ever returns FREE tracks from the Stillness
 * Library — the paid catalog is never exposed by the upstream REST API, so
 * this tool structurally cannot leak a paid resource. There is no `audience`
 * field on practices (per the live contract), so no audience filter is
 * offered here — filtering by the "children" category is the closest honest
 * equivalent, since that is a real category value. `query` routes through
 * GET /v1/search filtered to type === "guided_practice" when supplied, since
 * /v1/practices itself has no free-text parameter.
 */
import { getJson } from "../lib/apiClient.js";
import { durationFits } from "../lib/filters.js";
import { fromPractice, fromUnifiedResource, type McpResource } from "../lib/normalize.js";
import { findGuidedPracticesInput, type FindGuidedPracticesInput } from "../schemas.js";
import type { ApiPractice, ApiResource, ApiSuccessList } from "../types.js";
import { DEFAULT_RESULT_LIMIT, MAX_RESULT_LIMIT } from "../lib/constants.js";

export const findGuidedPracticesTool = {
  name: "find_guided_practices",
  config: {
    title: "Find free guided practices",
    description:
      "Finds free guided audio practices from The Holistic Care's Stillness Library " +
      "(short guided meditations, breathing practices, and Yoga Nidra sessions) — " +
      "e.g. 'a free practice for someone upset after an argument' or 'a short " +
      "breathing practice for children'. Every result returned by this tool is free; " +
      "paid Stillness Library tracks are never exposed through the public API this " +
      "server relies on. There is no audience metadata on practices — use " +
      "category: 'children' for child-appropriate practices, and treat other " +
      "audience assumptions as unsupported rather than inferred.",
    inputSchema: findGuidedPracticesInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  handler: async (input: FindGuidedPracticesInput): Promise<McpResource[]> => {
    const finalLimit = input.limit ?? DEFAULT_RESULT_LIMIT;
    const needsPostFilter = input.max_duration_minutes !== undefined;
    const fetchLimit = needsPostFilter ? Math.min(MAX_RESULT_LIMIT * 3, 60) : finalLimit;

    let results: McpResource[];

    if (input.query) {
      const { data } = await getJson<ApiSuccessList<ApiResource>>("/v1/search", {
        q: input.query,
        limit: fetchLimit,
      });
      results = data.data
        .filter((r) => r.type === "guided_practice")
        .map(fromUnifiedResource);
      if (input.category) {
        results = results.filter((r) => r.category === input.category);
      }
    } else {
      const { data } = await getJson<ApiSuccessList<ApiPractice>>("/v1/practices", {
        limit: fetchLimit,
        category: input.category,
      });
      results = data.data.map(fromPractice);
    }

    if (input.max_duration_minutes !== undefined) {
      results = results.filter((r) => durationFits(r, input.max_duration_minutes!));
    }

    return results.slice(0, finalLimit);
  },
};
