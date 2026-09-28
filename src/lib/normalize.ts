/**
 * Normalizes raw REST API records into one stable, MCP-facing shape.
 *
 * Per the project spec: never invent missing data, prefer omitting an
 * unavailable optional field over fabricating a value, and always preserve
 * the REST API's own stable public id — never substitute a raw Sanity id
 * (the upstream API has already stripped those; we simply must not
 * reintroduce anything id-shaped that didn't come from the API itself).
 */

import type {
  ApiBlogSummary,
  ApiGlossaryTerm,
  ApiMindfulnessGame,
  ApiPanchaVikasResource,
  ApiPractice,
  ApiResearchCitation,
  ApiResource,
} from "../types.js";

/** The public MCP resource model described in the project spec. */
export interface McpResource {
  id: string;
  type:
    | "blog"
    | "mindfulness_game"
    | "guided_practice"
    | "research"
    | "glossary_term"
    | "panchavikas_pathway"
    | "panchavikas_download";
  title: string;
  slug?: string;
  summary?: string;
  category?: string;
  tags?: string[];
  audiences?: string[];
  age_min?: number;
  age_max?: number;
  duration_minutes?: number;
  skills?: string[];
  access?: string;
  source_url?: string;
  canonical_url?: string;
}

/**
 * Drop null/undefined/empty-array optional fields rather than emitting them
 * as null. Constrained to `object` rather than `Record<string, unknown>` so
 * that concrete interfaces like `McpResource` (no index signature) can be
 * passed as an explicit type argument at each call site below — this is what
 * keeps `type: "mindfulness_game"` etc. as its literal type instead of being
 * widened to `string` when the object literal has no other contextual type.
 */
function omitEmpty<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out as T;
}

export function fromUnifiedResource(r: ApiResource): McpResource {
  const typeMap: Record<ApiResource["type"], McpResource["type"]> = {
    blog: "blog",
    mindfulness_game: "mindfulness_game",
    guided_practice: "guided_practice",
    research: "research",
    glossary: "glossary_term",
    panchavikas_pathway: "panchavikas_pathway",
    panchavikas_download: "panchavikas_download",
  };

  return omitEmpty<McpResource>({
    id: r.id ?? deriveFallbackId(r),
    type: typeMap[r.type],
    title: r.title,
    slug: r.slug ?? undefined,
    summary: r.summary ?? undefined,
    category: r.category ?? undefined,
    tags: r.tags ?? undefined,
    audiences: r.audiences ?? undefined,
    age_min: r.age_min ?? undefined,
    age_max: r.age_max ?? undefined,
    duration_minutes: r.duration_minutes ?? undefined,
    skills: r.skills ?? undefined,
    access: r.access ?? undefined,
    source_url: r.source_url,
    canonical_url: r.source_url,
  });
}

/**
 * The only place a fabricated id ever appears: as a last-resort, entirely
 * derived-from-public-data fallback (source_url), never a guess. In practice
 * /v1/resources already returns a real `id` for every family per the
 * 2026-09-25 fix, so this should not trigger — kept only so a future upstream
 * regression degrades gracefully instead of crashing this server.
 */
function deriveFallbackId(r: ApiResource): string {
  return `derived:${r.type}:${r.slug ?? r.source_url}`;
}

export function fromGame(g: ApiMindfulnessGame): McpResource {
  return omitEmpty<McpResource>({
    id: g.id,
    type: "mindfulness_game",
    title: g.title,
    slug: g.slug,
    summary: g.description ?? undefined,
    category: g.tag ?? undefined,
    tags: g.keywords ?? undefined,
    audiences: g.audiences ?? undefined,
    age_min: g.age_min ?? undefined,
    age_max: g.age_max ?? undefined,
    duration_minutes: g.duration_minutes ?? undefined,
    skills: g.skills ?? undefined,
    access: g.free ? "free" : undefined,
    source_url: g.url,
    canonical_url: g.url,
  });
}

export function fromPractice(p: ApiPractice): McpResource {
  return omitEmpty<McpResource>({
    id: p.id,
    type: "guided_practice",
    title: p.title,
    slug: p.slug,
    summary: p.excerpt ?? undefined,
    category: p.category ?? undefined,
    duration_minutes: p.read_time_minutes ?? undefined,
    access: "free", // /v1/practices only ever returns free tracks — double-gated upstream
    source_url: p.canonical_url,
    canonical_url: p.canonical_url,
  });
}

export function fromResearch(r: ApiResearchCitation): McpResource {
  return omitEmpty<McpResource>({
    id: r.id,
    type: "research",
    title: r.title,
    slug: r.slug,
    summary: r.summary ?? undefined,
    category: r.topic ?? undefined,
    source_url: r.source_url ?? undefined,
    canonical_url: r.source_url ?? undefined,
  });
}

export function fromGlossaryTerm(g: ApiGlossaryTerm): McpResource {
  return omitEmpty<McpResource>({
    id: g.id,
    type: "glossary_term",
    title: g.title,
    slug: g.slug,
    summary: g.summary ?? undefined,
    category: g.pillar ?? undefined,
  });
}

export function fromBlog(b: ApiBlogSummary): McpResource {
  // /v1/blog deliberately has no id/slug/type — derive a stable-enough id from
  // the canonical URL's own last path segment, exactly as the REST API's own
  // /v1/resources layer does internally, rather than inventing one differently.
  const slug = b.canonical_url.split("/").filter(Boolean).pop();
  return omitEmpty<McpResource>({
    id: slug ? `blog:${slug}` : `blog:${b.canonical_url}`,
    type: "blog",
    title: b.title,
    slug,
    summary: b.excerpt ?? undefined,
    tags: b.tags,
    source_url: b.canonical_url,
    canonical_url: b.canonical_url,
  });
}

export function fromPanchaVikas(p: ApiPanchaVikasResource): McpResource {
  return omitEmpty({
    id: p.id,
    type: p.type,
    title: p.title,
    summary: p.summary,
    source_url: p.download_url ?? p.source_url,
    canonical_url: p.source_url,
  });
}
