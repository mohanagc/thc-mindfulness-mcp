/**
 * Tool 8: find_podcast_episodes (added 2026-10-21)
 *
 * Backend: GET /v1/podcast/episodes, which accepts `lang` (en|hi), `season`,
 * `limit` and `offset` server-side. It has no free-text parameter, so when
 * `query` is supplied we fetch the (small) filtered catalog and match every
 * query word against each episode's title, short title, summary, key
 * question and season title on the client. Results stay newest-season-last,
 * in the API's own order (season, episode, language).
 *
 * The REST API exposes discovery metadata only — never the transcript or
 * companion guide — so this tool cannot return them either.
 */
import { getJson } from "../lib/apiClient";
import { fromPodcastEpisode, type McpResource } from "../lib/normalize";
import { findPodcastEpisodesInput, type FindPodcastEpisodesInput } from "../schemas";
import type { ApiPodcastEpisode, ApiSuccessList } from "../types";
import { DEFAULT_RESULT_LIMIT } from "../lib/constants";

/** Upstream page size (the REST API's own maximum) and a hard page cap. */
const UPSTREAM_PAGE_SIZE = 100;
const MAX_UPSTREAM_PAGES = 5;

function episodeMatchesQuery(e: ApiPodcastEpisode, query: string): boolean {
  const haystack = [e.title, e.short_title, e.summary, e.key_question, e.season_title, e.audience]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  return words.every((w) => haystack.includes(w));
}

export const findPodcastEpisodesTool = {
  name: "find_podcast_episodes",
  config: {
    title: "Find podcast episodes",
    description:
      "Finds episodes of The Holistic Care Podcast: short episodes for parents, " +
      "teachers and caregivers on children's emotional wellbeing, published in English " +
      "('en') and Hindi ('hi'). Examples: 'an episode about a child's anger', 'all " +
      "Hindi episodes in season 2'. Filter with `language` and `season`; `query` " +
      "matches every word against the episode title, summary and key question. Each " +
      "result gives the episode's summary, duration, release date, the episode page " +
      "(canonical_url) and the YouTube video (video_url). Transcripts and companion " +
      "guides are not available through this server — link to the episode page instead. " +
      "Use get_mindfulness_resource with resource_type 'podcast_episode' and an id such " +
      "as 'PC-S02E03-EN' to fetch one episode.",
    inputSchema: findPodcastEpisodesInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  handler: async (input: FindPodcastEpisodesInput): Promise<McpResource[]> => {
    const finalLimit = input.limit ?? DEFAULT_RESULT_LIMIT;

    const episodes: ApiPodcastEpisode[] = [];
    for (let page = 0; page < MAX_UPSTREAM_PAGES; page++) {
      const { data } = await getJson<ApiSuccessList<ApiPodcastEpisode>>("/v1/podcast/episodes", {
        lang: input.language,
        season: input.season,
        limit: input.query ? UPSTREAM_PAGE_SIZE : finalLimit,
        offset: page * UPSTREAM_PAGE_SIZE,
      });
      episodes.push(...data.data);
      // Without a query the first page already holds more than we return.
      if (!input.query || episodes.length >= data.pagination.total || data.data.length === 0) break;
    }

    const matched = input.query ? episodes.filter((e) => episodeMatchesQuery(e, input.query!)) : episodes;
    return matched.slice(0, finalLimit).map(fromPodcastEpisode);
  },
};
