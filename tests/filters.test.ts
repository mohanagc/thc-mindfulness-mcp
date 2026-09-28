import test from "node:test";
import assert from "node:assert/strict";
import { ageRangeCovers, durationFits, resourceMatchesQuery, slugify, textIncludes } from "../src/lib/filters.js";
import type { McpResource } from "../src/lib/normalize.js";

function baseResource(overrides: Partial<McpResource> = {}): McpResource {
  return { id: "x", type: "mindfulness_game", title: "Example", ...overrides };
}

test("textIncludes: case-insensitive substring match", () => {
  assert.equal(textIncludes("Focus Flashlight", "flashlight"), true);
  assert.equal(textIncludes("Focus Flashlight", "FLASH"), true);
  assert.equal(textIncludes("Focus Flashlight", "zzz"), false);
});

test("textIncludes: undefined haystack never matches", () => {
  assert.equal(textIncludes(undefined, "anything"), false);
});

test("ageRangeCovers: a resource with no stated age range never matches, regardless of age", () => {
  const r = baseResource(); // no age_min/age_max at all
  assert.equal(ageRangeCovers(r, 9), false);
});

test("ageRangeCovers: matches strictly within the stated inclusive range", () => {
  const r = baseResource({ age_min: 6, age_max: 10 });
  assert.equal(ageRangeCovers(r, 6), true);
  assert.equal(ageRangeCovers(r, 10), true);
  assert.equal(ageRangeCovers(r, 5), false);
  assert.equal(ageRangeCovers(r, 11), false);
});

test("durationFits: a resource with no stated duration never matches", () => {
  const r = baseResource();
  assert.equal(durationFits(r, 30), false);
});

test("durationFits: matches when duration_minutes <= max", () => {
  const r = baseResource({ duration_minutes: 5 });
  assert.equal(durationFits(r, 5), true);
  assert.equal(durationFits(r, 10), true);
  assert.equal(durationFits(r, 4), false);
});

test("resourceMatchesQuery: matches on title, summary, category, or any tag", () => {
  const r = baseResource({
    title: "Rainbow Relaxation",
    summary: "A progressive muscle relaxation game.",
    category: "relaxation",
    tags: ["calm", "bedtime"],
  });
  assert.equal(resourceMatchesQuery(r, "rainbow"), true);
  assert.equal(resourceMatchesQuery(r, "progressive muscle"), true);
  assert.equal(resourceMatchesQuery(r, "relaxation"), true);
  assert.equal(resourceMatchesQuery(r, "bedtime"), true);
  assert.equal(resourceMatchesQuery(r, "kundalini"), false);
});

test("slugify: lowercases, replaces non-alphanumerics with hyphens, trims edge hyphens", () => {
  assert.equal(slugify("Yoga Nidra"), "yoga-nidra");
  assert.equal(slugify("  What is Aparigraha?  "), "what-is-aparigraha");
  assert.equal(slugify("Non-Duality"), "non-duality");
  assert.equal(slugify("Multiple   Spaces"), "multiple-spaces");
});
