/**
 * Ground-truth types for the THC Open Mindfulness REST API's response shapes,
 * as documented in api.theholisticcare.com's HANDOFF.md / OpenAPI spec
 * (audited 2026-09-28). Kept close to the wire shape; MCP-facing normalization
 * happens in src/lib/normalize.ts, not here.
 */

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface ApiMeta {
  generated_at: string;
  provider: string;
  source: string;
}

export interface ApiPagination {
  limit: number;
  offset: number;
  total: number;
}

export interface ApiSuccessList<T> {
  data: T[];
  pagination: ApiPagination;
  meta: ApiMeta;
}

export interface ApiSuccessDetail<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

// ---------------------------------------------------------------------------
// Unified resource shape — the contract shared by /v1/resources and /v1/search
// ---------------------------------------------------------------------------

/**
 * The `type` enum accepted/returned by /v1/resources and /v1/search.
 * NOTE: this differs from the `type` string each *dedicated* endpoint puts on
 * its own records (see DEDICATED_TYPE_LABEL in normalize.ts) — do not conflate
 * the two. This is the canonical cross-family taxonomy.
 */
export const UNIFIED_RESOURCE_TYPES = [
  "blog",
  "mindfulness_game",
  "guided_practice",
  "research",
  "glossary",
  "panchavikas_pathway",
  "panchavikas_download",
] as const;

export type UnifiedResourceType = (typeof UNIFIED_RESOURCE_TYPES)[number];

export interface ApiResource {
  id: string | null;
  title: string;
  slug: string | null;
  type: UnifiedResourceType;
  summary: string | null;
  category: string | null;
  tags: string[] | null;
  audiences: string[] | null;
  age_min: number | null;
  age_max: number | null;
  duration_minutes: number | null;
  skills: string[] | null;
  /** Observed values: "free" | "email-required". Never "paid" — no paid content is ever exposed. */
  access: string | null;
  source_url: string;
  updated_at: string | null;
}

// ---------------------------------------------------------------------------
// Dedicated endpoint shapes
// ---------------------------------------------------------------------------

export interface ApiMindfulnessGame {
  id: string; // "MG-###"
  slug: string;
  type: "mindfulness_game";
  api_id: string; // == id
  title: string;
  url: string;
  icon: string | null;
  tag: string | null;
  description: string | null;
  free: boolean;
  keywords: string[] | null;
  audiences: string[] | null;
  age_min: number | null;
  age_max: number | null;
  duration_minutes: number | null;
  skills: string[] | null;
  updated_at: string | null;
}

export interface ApiPractice {
  id: string; // "SL-###"
  slug: string;
  type: "practice";
  track_id: string; // == id
  title: string;
  category: string | null;
  excerpt: string | null;
  audio_url: string;
  read_time_minutes: number | null;
  canonical_url: string;
  updated_at: string | null;
  related_practices?: Array<{ slug: string; title: string }>;
}

export interface ApiResearchCitation {
  id: string; // "research:<slug>"
  slug: string;
  type: "research_citation";
  title: string;
  authors: string | null;
  year: number | null;
  journal: string | null;
  study_type: string | null;
  sample_size: number | null;
  topic: string | null;
  summary: string | null;
  key_finding: string | null;
  limitations: string | null;
  source_url: string | null;
  updated_at: string | null;
  related_posts?: Array<{ slug: string; title: string }>;
  related_terms?: Array<{ slug: string; title: string }>;
}

export interface ApiGlossaryTerm {
  id: string; // "glossary:<slug>"
  slug: string;
  type: "glossary_term";
  title: string;
  pillar: string | null;
  summary: string | null;
  etymology: string | null;
  also_known_as: string[] | null;
  updated_at: string | null;
  // Portable Text (Sanity structured rich text) — pass through as-is, never flatten silently.
  extended_explanation?: unknown[];
  related_terms?: Array<{ slug: string; title: string }>;
  related_posts?: Array<{ slug: string; title: string }>;
}

/** /v1/blog is deliberately minimal — no id, slug, type, or updated_at. */
export interface ApiBlogSummary {
  title: string;
  excerpt: string | null;
  tags: string[]; // always an array, never null
  canonical_url: string;
}

export interface ApiPanchaVikasResource {
  id: string; // "PV-pathway-<key>" | "PV-guide"
  type: "panchavikas_pathway" | "panchavikas_download";
  title: string;
  summary: string;
  source_url: string;
  download_url?: string;
}

// ---------------------------------------------------------------------------
// Query param enums the live REST API actually accepts (from the audit)
// ---------------------------------------------------------------------------

export const WHITEPAPER_TOPICS = [
  "mindfulness",
  "meditation",
  "yoga",
  "sleep",
  "nonduality",
  "children",
  "anxiety",
  "physiology",
] as const;

export const WHITEPAPER_STUDY_TYPES = [
  "rct",
  "meta-analysis",
  "observational",
  "cohort",
  "clinical-trial",
  "physiological",
  "guideline",
] as const;

export const GLOSSARY_PILLARS = [
  "nonduality",
  "yoga",
  "meditation",
  "kundalini",
  "ayurveda",
  "general-wisdom",
] as const;

export const GAME_AUDIENCES = ["children", "teens", "adults", "educators", "parents"] as const;

export const GAME_SKILLS = [
  "attention",
  "body-awareness",
  "breathwork",
  "cognitive-reframing",
  "emotional-regulation",
  "gratitude",
  "grounding",
  "loving-kindness",
  "mindful-listening",
  "nondual-awareness",
  "relaxation",
  "self-compassion",
  "sleep",
] as const;

export const PRACTICE_CATEGORIES = [
  "mindfulness",
  "children",
  "breathwork",
  "nondual-awareness",
  "yoga-nidra",
  "students",
  "sleep",
] as const;

/** Casing/identifiers as actually returned by GET /v1/panchavikas/resources. */
export const PANCHAVIKAS_ELEMENTS = ["prithvi", "jal", "agni", "vayu", "akash"] as const;
