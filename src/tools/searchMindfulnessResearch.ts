/**
 * Tool 5: search_mindfulness_research
 *
 * Backend: GET /v1/whitepapers (server-side: topic, study_type, limit/
 * offset). `query` routes through GET /v1/search filtered to
 * type === "research" when supplied, since /v1/whitepapers has no free-text
 * parameter of its own.
 *
 * Content boundary: these are plain-language summaries of published research,
 * not medical guidance. This tool must never let a summary read as a
 * diagnosis, a treatment claim, or a guarantee of outcome — it passes through
 * only the summary/key_finding/limitations text the API itself already
 * provides, and never adds interpretive claims on top of it.
 */
import { getJson } from "../lib/apiClient";
import { fromResearch, fromUnifiedResource, type McpResource } from "../lib/normalize";
import { searchMindfulnessResearchInput, type SearchMindfulnessResearchInput } from "../schemas";
import type { ApiResearchCitation, ApiResource, ApiSuccessList } from "../types";
import { DEFAULT_RESULT_LIMIT, MAX_RESULT_LIMIT } from "../lib/constants";

export const searchMindfulnessResearchTool = {
  name: "search_mindfulness_research",
  config: {
    title: "Search mindfulness research summaries",
    description:
      "Finds plain-language summaries of published research behind The Holistic " +
      "Care's mindfulness, meditation, and yoga content — e.g. 'research on yoga " +
      "nidra and sleep' or 'meta-analyses on mindfulness for anxiety'. Each result " +
      "is a summary of a real study (with authors, year, journal, and a stated " +
      "limitations note where available), never a THC-authored medical claim. This " +
      "tool does not provide medical advice, diagnosis, or treatment guidance, and " +
      "study findings should not be read as guarantees of outcome for any " +
      "individual.",
    inputSchema: searchMindfulnessResearchInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  handler: async (input: SearchMindfulnessResearchInput): Promise<McpResource[]> => {
    const finalLimit = input.limit ?? DEFAULT_RESULT_LIMIT;

    if (input.query) {
      const fetchLimit = input.topic || input.study_type ? Math.min(MAX_RESULT_LIMIT * 3, 60) : finalLimit;
      const { data } = await getJson<ApiSuccessList<ApiResource>>("/v1/search", {
        q: input.query,
        limit: fetchLimit,
      });
      let results = data.data.filter((r) => r.type === "research").map(fromUnifiedResource);
      if (input.topic) {
        results = results.filter((r) => r.category === input.topic);
      }
      // Note: the unified /v1/search shape carries no study_type field, so
      // study_type cannot be honestly post-filtered on this path. If both
      // `query` and `study_type` are supplied, study_type is not applied —
      // documented here rather than silently pretending it was.
      return results.slice(0, finalLimit);
    }

    const { data } = await getJson<ApiSuccessList<ApiResearchCitation>>("/v1/whitepapers", {
      limit: finalLimit,
      topic: input.topic,
      study_type: input.study_type,
    });
    return data.data.map(fromResearch);
  },
};
