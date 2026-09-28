/**
 * Zod input schemas for all seven MCP tools, built directly against the live
 * OpenAPI contract at https://api.theholisticcare.com/openapi/openapi.yaml.
 */
import { z } from "zod";
import {
  GAME_AUDIENCES,
  GAME_SKILLS,
  GLOSSARY_PILLARS,
  PANCHAVIKAS_ELEMENTS,
  PRACTICE_CATEGORIES,
  UNIFIED_RESOURCE_TYPES,
  WHITEPAPER_STUDY_TYPES,
  WHITEPAPER_TOPICS,
} from "./types";
import { MAX_QUERY_LENGTH, MAX_RESULT_LIMIT } from "./lib/constants";

const query = z
  .string()
  .trim()
  .min(1, "query must not be empty")
  .max(MAX_QUERY_LENGTH, `query must be ${MAX_QUERY_LENGTH} characters or fewer`);

const optionalQuery = query.optional();

const limit = z.coerce.number().int().min(1).max(MAX_RESULT_LIMIT).optional();

const age = z.coerce.number().int().min(0).max(120).optional();

const maxDurationMinutes = z.coerce.number().int().min(1).max(600).optional();

// Tool 1: search_mindfulness_resources
export const searchMindfulnessResourcesInput = z.object({
  query,
  resource_type: z.enum(UNIFIED_RESOURCE_TYPES).optional(),
  category: z.string().trim().max(80).optional(),
  audience: z.string().trim().max(80).optional(),
  skill: z.string().trim().max(80).optional(),
  age,
  limit,
});
export type SearchMindfulnessResourcesInput = z.infer<typeof searchMindfulnessResourcesInput>;

// Tool 2: get_mindfulness_resource
export const getMindfulnessResourceInput = z.object({
  resource_type: z.enum(UNIFIED_RESOURCE_TYPES),
  identifier: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .describe(
      "The resource's slug for blog/mindfulness_game/guided_practice/research/glossary. " +
        "The resource's stable id (e.g. 'PV-pathway-jal') for panchavikas_pathway/panchavikas_download.",
    ),
});
export type GetMindfulnessResourceInput = z.infer<typeof getMindfulnessResourceInput>;

// Tool 3: find_mindfulness_games
export const findMindfulnessGamesInput = z.object({
  query: optionalQuery,
  age,
  skill: z.enum(GAME_SKILLS).optional(),
  audience: z.enum(GAME_AUDIENCES).optional(),
  max_duration_minutes: maxDurationMinutes,
  limit,
});
export type FindMindfulnessGamesInput = z.infer<typeof findMindfulnessGamesInput>;

// Tool 4: find_guided_practices
export const findGuidedPracticesInput = z.object({
  query: optionalQuery,
  category: z.enum(PRACTICE_CATEGORIES).optional(),
  max_duration_minutes: maxDurationMinutes,
  limit,
});
export type FindGuidedPracticesInput = z.infer<typeof findGuidedPracticesInput>;

// Tool 5: search_mindfulness_research
export const searchMindfulnessResearchInput = z.object({
  query: optionalQuery,
  topic: z.enum(WHITEPAPER_TOPICS).optional(),
  study_type: z.enum(WHITEPAPER_STUDY_TYPES).optional(),
  limit,
});
export type SearchMindfulnessResearchInput = z.infer<typeof searchMindfulnessResearchInput>;

// Tool 6: lookup_mindfulness_term
export const lookupMindfulnessTermInput = z.object({
  term: z.string().trim().min(1).max(120),
  pillar: z.enum(GLOSSARY_PILLARS).optional(),
});
export type LookupMindfulnessTermInput = z.infer<typeof lookupMindfulnessTermInput>;

// Tool 7: find_panchavikas_resources
export const findPanchavikasResourcesInput = z.object({
  element: z.enum(PANCHAVIKAS_ELEMENTS).optional(),
  query: optionalQuery,
  resource_type: z.enum(["panchavikas_pathway", "panchavikas_download"]).optional(),
  limit,
});
export type FindPanchavikasResourcesInput = z.infer<typeof findPanchavikasResourcesInput>;
