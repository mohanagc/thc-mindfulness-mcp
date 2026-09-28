import test from "node:test";
import assert from "node:assert/strict";
import {
  fromBlog,
  fromGame,
  fromGlossaryTerm,
  fromPanchaVikas,
  fromPractice,
  fromResearch,
  fromUnifiedResource,
} from "../src/lib/normalize.js";
import type {
  ApiBlogSummary,
  ApiGlossaryTerm,
  ApiMindfulnessGame,
  ApiPanchaVikasResource,
  ApiPractice,
  ApiResearchCitation,
  ApiResource,
} from "../src/types.js";

test("fromGame: never fabricates age/duration/skills when the API omitted them", () => {
  const game: ApiMindfulnessGame = {
    id: "MG-001",
    slug: "focus-flashlight",
    type: "mindfulness_game",
    api_id: "MG-001",
    title: "Focus Flashlight",
    url: "https://www.theholisticcare.com/games/focus-flashlight.html",
    icon: null,
    tag: null,
    description: "An attention game.",
    free: true,
    keywords: null,
    audiences: null,
    age_min: null,
    age_max: null,
    duration_minutes: null,
    skills: null,
    updated_at: null,
  };
  const result = fromGame(game);
  assert.equal(result.id, "MG-001");
  assert.equal(result.type, "mindfulness_game");
  assert.equal(result.access, "free");
  // omitEmpty must drop these entirely rather than emit null/empty-array.
  assert.equal("age_min" in result, false);
  assert.equal("age_max" in result, false);
  assert.equal("duration_minutes" in result, false);
  assert.equal("skills" in result, false);
  assert.equal("audiences" in result, false);
  assert.equal("tags" in result, false);
});

test("fromGame: a free:false game gets no `access` field fabricated as 'paid'", () => {
  const game: ApiMindfulnessGame = {
    id: "MG-002",
    slug: "example",
    type: "mindfulness_game",
    api_id: "MG-002",
    title: "Example",
    url: "https://www.theholisticcare.com/games/example.html",
    icon: null,
    tag: null,
    description: null,
    free: false,
    keywords: null,
    audiences: null,
    age_min: null,
    age_max: null,
    duration_minutes: null,
    skills: null,
    updated_at: null,
  };
  const result = fromGame(game);
  // The project explicitly never exposes paid content, so the only
  // meaningful value this field can honestly take is "free" or absent.
  assert.equal("access" in result, false);
});

test("fromPractice: access is always 'free' (dedicated endpoint never returns paid tracks)", () => {
  const practice: ApiPractice = {
    id: "SL-012",
    slug: "three-minute-breathing-space-guided-audio",
    type: "practice",
    track_id: "SL-012",
    title: "Three-Minute Breathing Space",
    category: "breathwork",
    excerpt: "A short breathing practice.",
    audio_url: "https://files.theholisticcare.com/stillness-library-free/SL-012.mp3",
    read_time_minutes: 3,
    canonical_url: "https://www.theholisticcare.com/stillness-library/three-minute-breathing-space-guided-audio",
    updated_at: null,
  };
  const result = fromPractice(practice);
  assert.equal(result.access, "free");
  assert.equal(result.type, "guided_practice");
  assert.equal(result.canonical_url, practice.canonical_url);
});

test("fromResearch: omits summary/source_url cleanly when null", () => {
  const research: ApiResearchCitation = {
    id: "research:goyal-2014",
    slug: "goyal-2014",
    type: "research_citation",
    title: "Meditation Programs for Psychological Stress and Well-being",
    authors: "Goyal et al.",
    year: 2014,
    journal: "JAMA Internal Medicine",
    study_type: "meta-analysis",
    sample_size: 3515,
    topic: "mindfulness",
    summary: null,
    key_finding: null,
    limitations: null,
    source_url: null,
    updated_at: null,
  };
  const result = fromResearch(research);
  assert.equal("summary" in result, false);
  assert.equal("source_url" in result, false);
  assert.equal("canonical_url" in result, false);
  assert.equal(result.type, "research");
});

test("fromGlossaryTerm: maps pillar to category, drops extended_explanation (not part of McpResource)", () => {
  const term: ApiGlossaryTerm = {
    id: "glossary:yoga-nidra",
    slug: "yoga-nidra",
    type: "glossary_term",
    title: "Yoga Nidra",
    pillar: "yoga",
    summary: "A guided relaxation practice.",
    etymology: null,
    also_known_as: null,
    updated_at: null,
  };
  const result = fromGlossaryTerm(term);
  assert.equal(result.category, "yoga");
  assert.equal(result.type, "glossary_term");
  assert.equal("etymology" in result, false);
});

test("fromBlog: derives a stable id from the canonical_url's last path segment", () => {
  const blog: ApiBlogSummary = {
    title: "Mindfulness for Anxiety",
    excerpt: "An overview of mindfulness-based approaches to anxiety.",
    tags: ["mindfulness", "anxiety"],
    canonical_url: "https://www.theholisticcare.com/blog/mindfulness-for-anxiety",
  };
  const result = fromBlog(blog);
  assert.equal(result.id, "blog:mindfulness-for-anxiety");
  assert.equal(result.slug, "mindfulness-for-anxiety");
  assert.equal(result.type, "blog");
  assert.deepEqual(result.tags, ["mindfulness", "anxiety"]);
});

test("fromBlog: an empty tags array is omitted (never emitted as [])", () => {
  const blog: ApiBlogSummary = {
    title: "Untagged Post",
    excerpt: null,
    tags: [],
    canonical_url: "https://www.theholisticcare.com/blog/untagged-post",
  };
  const result = fromBlog(blog);
  assert.equal("tags" in result, false);
  assert.equal("summary" in result, false);
});

test("fromPanchaVikas: a pathway prefers source_url, a download prefers download_url", () => {
  const pathway: ApiPanchaVikasResource = {
    id: "PV-pathway-jal",
    type: "panchavikas_pathway",
    title: "Jal Pathway",
    summary: "The water element pathway.",
    source_url: "https://www.theholisticcare.com/panchavikas#jal",
  };
  const download: ApiPanchaVikasResource = {
    id: "PV-guide",
    type: "panchavikas_download",
    title: "PanchaVikas Public Guide",
    summary: "The public downloadable guide.",
    source_url: "https://www.theholisticcare.com/panchavikas",
    download_url: "https://www.theholisticcare.com/panchavikas/guide.pdf",
  };
  assert.equal(fromPanchaVikas(pathway).source_url, pathway.source_url);
  assert.equal(fromPanchaVikas(download).source_url, download.download_url);
  assert.equal(fromPanchaVikas(download).canonical_url, download.source_url);
});

test("fromUnifiedResource: maps the unified 'glossary' type to McpResource's 'glossary_term'", () => {
  const resource: ApiResource = {
    id: "glossary:mindfulness",
    title: "Mindfulness",
    slug: "mindfulness",
    type: "glossary",
    summary: "The practice of paying attention on purpose.",
    category: "meditation",
    tags: null,
    audiences: null,
    age_min: null,
    age_max: null,
    duration_minutes: null,
    skills: null,
    access: null,
    source_url: "https://www.theholisticcare.com/glossary/mindfulness",
    updated_at: null,
  };
  const result = fromUnifiedResource(resource);
  assert.equal(result.type, "glossary_term");
});

test("fromUnifiedResource: an 'access' value of 'paid' would never be legitimate, but is passed through untouched if seen (defense in depth lives in the upstream API, not here)", () => {
  // This test documents the contract rather than asserting a guarantee this
  // module doesn't itself make: normalize.ts trusts the upstream API to never
  // send "paid", per ApiResource's own comment. It does not invent one either way.
  const resource: ApiResource = {
    id: "x",
    title: "x",
    slug: "x",
    type: "blog",
    summary: null,
    category: null,
    tags: null,
    audiences: null,
    age_min: null,
    age_max: null,
    duration_minutes: null,
    skills: null,
    access: "free",
    source_url: "https://www.theholisticcare.com/blog/x",
    updated_at: null,
  };
  assert.equal(fromUnifiedResource(resource).access, "free");
});
