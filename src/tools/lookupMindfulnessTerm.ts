/**
 * Tool 6: lookup_mindfulness_term
 *
 * Strategy:
 *  1. Try an exact detail lookup at GET /v1/glossary/{slugified(term)} — this
 *     is the richest response (includes etymology, extended_explanation,
 *     related terms/posts) and covers the common case of a caller already
 *     knowing (or guessing correctly) the term's slug.
 *  2. On a 404, fall back to GET /v1/search?q={term}, filtered client-side to
 *     type === "glossary". This covers synonyms, alternate spellings, and
 *     multi-word phrasing that wouldn't slugify to a real term.
 *  3. `pillar` is applied as a post-filter on the fallback path only
 *     (comparing against the unified resource's `category` field). If it
 *     filters every candidate out, that is a legitimate, honest "no results"
 *     — never a fabricated definition.
 *
 * This tool must NEVER invent a definition for a term the API doesn't have.
 */
import { getJson } from "../lib/apiClient.js";
import { AppError } from "../lib/errors.js";
import { slugify } from "../lib/filters.js";
import { fromGlossaryTerm, fromUnifiedResource, type McpResource } from "../lib/normalize.js";
import { lookupMindfulnessTermInput, type LookupMindfulnessTermInput } from "../schemas.js";
import type { ApiGlossaryTerm, ApiResource, ApiSuccessDetail, ApiSuccessList } from "../types.js";

export const lookupMindfulnessTermTool = {
  name: "lookup_mindfulness_term",
  config: {
    title: "Look up a mindfulness/yoga/nonduality term",
    description:
      "Looks up the definition of a single mindfulness, yoga, meditation, " +
      "kundalini, ayurveda, or nonduality term from The Holistic Care's public " +
      "glossary — e.g. 'What does aparigraha mean?' or 'define yoga nidra'. Returns " +
      "at most one best-matching term with its plain-language definition and, when " +
      "available, etymology and related terms. If the term genuinely isn't in the " +
      "glossary, this returns a clear no-match result rather than a guessed or " +
      "invented definition.",
    inputSchema: lookupMindfulnessTermInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  handler: async (input: LookupMindfulnessTermInput): Promise<McpResource | null> => {
    try {
      const { data } = await getJson<ApiSuccessDetail<ApiGlossaryTerm>>(
        `/v1/glossary/${encodeURIComponent(slugify(input.term))}`,
      );
      return fromGlossaryTerm(data.data);
    } catch (err) {
      if (!(err instanceof AppError) || err.code !== "not_found") throw err;
    }

    const { data } = await getJson<ApiSuccessList<ApiResource>>("/v1/search", {
      q: input.term,
      limit: 20,
    });
    let candidates = data.data.filter((r) => r.type === "glossary").map(fromUnifiedResource);
    if (input.pillar) {
      candidates = candidates.filter((r) => r.category === input.pillar);
    }
    return candidates[0] ?? null;
  },
};
