/**
 * Tool 3: find_mindfulness_games
 *
 * Backend: GET /v1/mindfulness-games (server-side: limit/offset only — no
 * audience/skill/age/duration query params exist on this endpoint per the
 * live OpenAPI contract). When `query` is supplied we instead route through
 * GET /v1/search and filter down to type === "mindfulness_game", since that's
 * the only server-side free-text entry point available. audience/skill/age/
 * max_duration_minutes are always applied as an honest client-side filter
 * over whichever batch was fetched — never inferred when the game's own
 * metadata doesn't state an age range or duration.
 */
import { getJson } from "../lib/apiClient.js";
import { ageRangeCovers, durationFits, textIncludes } from "../lib/filters.js";
import { fromGame, fromUnifiedResource, type McpResource } from "../lib/normalize.js";
import { findMindfulnessGamesInput, type FindMindfulnessGamesInput } from "../schemas.js";
import type { ApiMindfulnessGame, ApiResource, ApiSuccessList } from "../types.js";
import { DEFAULT_RESULT_LIMIT, MAX_RESULT_LIMIT } from "../lib/constants.js";

export const findMindfulnessGamesTool = {
  name: "find_mindfulness_games",
  config: {
    title: "Find mindfulness games",
    description:
      "Finds interactive mindfulness games for children, teens, or adults from The " +
      "Holistic Care's public games library — e.g. 'a grounding game for a 9-year-old' " +
      "or 'a short breathing game under 5 minutes'. `age` and `max_duration_minutes` " +
      "only match games whose own published metadata actually states an age range or " +
      "duration; a game with no stated age range is never assumed to fit. Most games " +
      "in this library are free; a small number require an email to access — check " +
      "each result's `access` field rather than assuming.",
    inputSchema: findMindfulnessGamesInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  handler: async (input: FindMindfulnessGamesInput): Promise<McpResource[]> => {
    const finalLimit = input.limit ?? DEFAULT_RESULT_LIMIT;
    const needsPostFilter = Boolean(
      input.age !== undefined || input.max_duration_minutes !== undefined || input.audience,
    );
    const fetchLimit = needsPostFilter ? Math.min(MAX_RESULT_LIMIT * 3, 60) : finalLimit;

    let results: McpResource[];

    if (input.query) {
      const { data } = await getJson<ApiSuccessList<ApiResource>>("/v1/search", {
        q: input.query,
        limit: fetchLimit,
      });
      results = data.data
        .filter((r) => r.type === "mindfulness_game")
        .map(fromUnifiedResource);
      if (input.skill) {
        results = results.filter((r) => (r.skills ?? []).some((s) => textIncludes(s, input.skill!)));
      }
    } else {
      const { data } = await getJson<ApiSuccessList<ApiMindfulnessGame>>("/v1/mindfulness-games", {
        limit: fetchLimit,
        skill: input.skill,
        audience: input.audience,
      });
      results = data.data.map(fromGame);
    }

    if (input.audience) {
      results = results.filter((r) => (r.audiences ?? []).some((a) => textIncludes(a, input.audience!)));
    }
    if (input.age !== undefined) {
      results = results.filter((r) => ageRangeCovers(r, input.age!));
    }
    if (input.max_duration_minutes !== undefined) {
      results = results.filter((r) => durationFits(r, input.max_duration_minutes!));
    }

    return results.slice(0, finalLimit);
  },
};
