import type { McpResource } from "./normalize";

/** Case-insensitive substring match, tolerant of undefined haystacks. */
export function textIncludes(haystack: string | undefined, needle: string): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * True if a resource's own text fields (title/summary/category/tags) contain
 * the query substring — the same fields /v1/search itself matches against,
 * so this is the client-side equivalent used when we already have a batch of
 * results in hand and need a second, narrower pass (e.g. after fetching from
 * an endpoint that has no free-text query parameter of its own).
 */
export function resourceMatchesQuery(resource: McpResource, query: string): boolean {
  if (
    textIncludes(resource.title, query) ||
    textIncludes(resource.summary, query) ||
    textIncludes(resource.category, query)
  ) {
    return true;
  }
  return (resource.tags ?? []).some((tag) => textIncludes(tag, query));
}

/**
 * True only when the resource's own published age range genuinely covers the
 * requested age. A resource with no age metadata never matches — we never
 * infer an age range that the upstream data doesn't actually state.
 */
export function ageRangeCovers(resource: McpResource, age: number): boolean {
  if (resource.age_min === undefined || resource.age_max === undefined) return false;
  return age >= resource.age_min && age <= resource.age_max;
}

/**
 * True only when the resource has a real duration and it fits the cap. A
 * resource with no duration metadata never matches a duration filter — we
 * never pretend it fits.
 */
export function durationFits(resource: McpResource, maxMinutes: number): boolean {
  if (resource.duration_minutes === undefined) return false;
  return resource.duration_minutes <= maxMinutes;
}

/** Lowercase, hyphen-normalized slug candidate from free text — used only as a lookup attempt, never displayed. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
