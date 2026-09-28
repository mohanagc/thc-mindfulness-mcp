/**
 * Unit tests for each tool's `.handler()` function, called directly (not
 * through the MCP protocol layer — that's covered by contract.test.ts).
 * Every network call is mocked; nothing here touches a real network.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { searchMindfulnessResourcesTool } from "../src/tools/searchMindfulnessResources.js";
import { getMindfulnessResourceTool } from "../src/tools/getMindfulnessResource.js";
import { findMindfulnessGamesTool } from "../src/tools/findMindfulnessGames.js";
import { findGuidedPracticesTool } from "../src/tools/findGuidedPractices.js";
import { searchMindfulnessResearchTool } from "../src/tools/searchMindfulnessResearch.js";
import { lookupMindfulnessTermTool } from "../src/tools/lookupMindfulnessTerm.js";
import { findPanchavikasResourcesTool } from "../src/tools/findPanchavikasResources.js";
import { AppError } from "../src/lib/errors.js";
import { jsonResponse, successDetail, successList, withMockFetch } from "./testUtils.js";
import type { ApiPanchaVikasResource, ApiResource } from "../src/types.js";

// ---------------------------------------------------------------------------
// search_mindfulness_resources
// ---------------------------------------------------------------------------

test("search_mindfulness_resources: hits /v1/search and normalizes results", async () => {
  const fixture: ApiResource[] = [
    {
      id: "MG-001",
      title: "Focus Flashlight",
      slug: "focus-flashlight",
      type: "mindfulness_game",
      summary: "An attention game.",
      category: "attention",
      tags: null,
      audiences: ["children"],
      age_min: 6,
      age_max: 12,
      duration_minutes: 5,
      skills: ["attention"],
      access: "free",
      source_url: "https://www.theholisticcare.com/games/focus-flashlight.html",
      updated_at: null,
    },
  ];
  let capturedUrl: string | undefined;
  await withMockFetch(
    async (url) => {
      capturedUrl = String(url);
      return jsonResponse(200, successList(fixture));
    },
    async () => {
      const results = await searchMindfulnessResourcesTool.handler({ query: "focus" } as any);
      assert.equal(results.length, 1);
      assert.equal(results[0]!.id, "MG-001");
      assert.equal(results[0]!.type, "mindfulness_game");
    },
  );
  const parsed = new URL(capturedUrl!);
  assert.equal(parsed.pathname, "/v1/search");
  assert.equal(parsed.searchParams.get("q"), "focus");
});

test("search_mindfulness_resources: resource_type/age filters are applied client-side, never sent to /v1/search", async () => {
  const fixture: ApiResource[] = [
    { id: "a", title: "Game A", slug: "a", type: "mindfulness_game", summary: null, category: null, tags: null, audiences: null, age_min: 6, age_max: 8, duration_minutes: null, skills: null, access: "free", source_url: "https://x/a", updated_at: null },
    { id: "b", title: "Blog B", slug: "b", type: "blog", summary: null, category: null, tags: null, audiences: null, age_min: null, age_max: null, duration_minutes: null, skills: null, access: null, source_url: "https://x/b", updated_at: null },
    { id: "c", title: "Game C (too old)", slug: "c", type: "mindfulness_game", summary: null, category: null, tags: null, audiences: null, age_min: 13, age_max: 18, duration_minutes: null, skills: null, access: "free", source_url: "https://x/c", updated_at: null },
  ];
  let capturedUrl: string | undefined;
  await withMockFetch(
    async (url) => {
      capturedUrl = String(url);
      return jsonResponse(200, successList(fixture));
    },
    async () => {
      const results = await searchMindfulnessResourcesTool.handler({
        query: "anything",
        resource_type: "mindfulness_game",
        age: 7,
      } as any);
      assert.deepEqual(results.map((r) => r.id), ["a"]);
    },
  );
  const parsed = new URL(capturedUrl!);
  assert.equal(parsed.searchParams.has("resource_type"), false);
  assert.equal(parsed.searchParams.has("age"), false);
});

// ---------------------------------------------------------------------------
// get_mindfulness_resource
// ---------------------------------------------------------------------------

test("get_mindfulness_resource: routes 'glossary' to GET /v1/glossary/{slug}", async () => {
  let capturedUrl: string | undefined;
  await withMockFetch(
    async (url) => {
      capturedUrl = String(url);
      return jsonResponse(
        200,
        successDetail({
          id: "glossary:aparigraha",
          slug: "aparigraha",
          type: "glossary_term",
          title: "Aparigraha",
          pillar: "yoga",
          summary: "Non-attachment / non-grasping.",
          etymology: null,
          also_known_as: null,
          updated_at: null,
        }),
      );
    },
    async () => {
      const result = await getMindfulnessResourceTool.handler({
        resource_type: "glossary",
        identifier: "aparigraha",
      } as any);
      assert.equal(result.id, "glossary:aparigraha");
      assert.equal(result.type, "glossary_term");
    },
  );
  assert.ok(capturedUrl!.endsWith("/v1/glossary/aparigraha"));
});

test("get_mindfulness_resource: panchavikas family matches by id + type against the fixed list, never by slug", async () => {
  const fixture: ApiPanchaVikasResource[] = [
    { id: "PV-pathway-jal", type: "panchavikas_pathway", title: "Jal Pathway", summary: "Water element.", source_url: "https://x/jal" },
    { id: "PV-guide", type: "panchavikas_download", title: "Public Guide", summary: "The guide.", source_url: "https://x/pv", download_url: "https://x/guide.pdf" },
  ];
  await withMockFetch(
    async () => jsonResponse(200, successList(fixture)),
    async () => {
      const result = await getMindfulnessResourceTool.handler({
        resource_type: "panchavikas_pathway",
        identifier: "PV-pathway-jal",
      } as any);
      assert.equal(result.id, "PV-pathway-jal");
    },
  );
});

test("get_mindfulness_resource: an id that exists but under the wrong resource_type is not_found (never cross-matched)", async () => {
  const fixture: ApiPanchaVikasResource[] = [
    { id: "PV-pathway-jal", type: "panchavikas_pathway", title: "Jal Pathway", summary: "Water element.", source_url: "https://x/jal" },
  ];
  await withMockFetch(
    async () => jsonResponse(200, successList(fixture)),
    async () => {
      await assert.rejects(
        () =>
          getMindfulnessResourceTool.handler({
            resource_type: "panchavikas_download", // wrong type for this id
            identifier: "PV-pathway-jal",
          } as any),
        (err: unknown) => err instanceof AppError && err.code === "not_found",
      );
    },
  );
});

test("get_mindfulness_resource: a genuine 404 from the upstream API surfaces as not_found", async () => {
  await withMockFetch(
    async () => jsonResponse(404, { error: { code: "not_found", message: "no such term" } }),
    async () => {
      await assert.rejects(
        () => getMindfulnessResourceTool.handler({ resource_type: "glossary", identifier: "not-a-real-term" } as any),
        (err: unknown) => err instanceof AppError && err.code === "not_found",
      );
    },
  );
});

// ---------------------------------------------------------------------------
// find_mindfulness_games
// ---------------------------------------------------------------------------

test("find_mindfulness_games: with no query, hits /v1/mindfulness-games directly with skill/audience server-side", async () => {
  let capturedUrl: string | undefined;
  await withMockFetch(
    async (url) => {
      capturedUrl = String(url);
      return jsonResponse(
        200,
        successList([
          {
            id: "MG-001", slug: "focus-flashlight", type: "mindfulness_game", api_id: "MG-001",
            title: "Focus Flashlight", url: "https://x/focus", icon: null, tag: null,
            description: null, free: true, keywords: null, audiences: ["children"],
            age_min: 6, age_max: 12, duration_minutes: 5, skills: ["attention"], updated_at: null,
          },
        ]),
      );
    },
    async () => {
      const results = await findMindfulnessGamesTool.handler({ skill: "attention", audience: "children" } as any);
      assert.equal(results.length, 1);
    },
  );
  const parsed = new URL(capturedUrl!);
  assert.equal(parsed.pathname, "/v1/mindfulness-games");
  assert.equal(parsed.searchParams.get("skill"), "attention");
  assert.equal(parsed.searchParams.get("audience"), "children");
});

test("find_mindfulness_games: age/duration filters never match a game with no stated metadata", async () => {
  await withMockFetch(
    async () =>
      jsonResponse(
        200,
        successList([
          {
            id: "MG-999", slug: "mystery-game", type: "mindfulness_game", api_id: "MG-999",
            title: "Mystery Game", url: "https://x/mystery", icon: null, tag: null,
            description: null, free: true, keywords: null, audiences: null,
            age_min: null, age_max: null, duration_minutes: null, skills: null, updated_at: null,
          },
        ]),
      ),
    async () => {
      const results = await findMindfulnessGamesTool.handler({ age: 9 } as any);
      assert.equal(results.length, 0, "a game with no stated age range must never be assumed to fit");
    },
  );
});

test("find_mindfulness_games: with a query, routes through /v1/search filtered to mindfulness_game", async () => {
  let capturedUrl: string | undefined;
  const fixture: ApiResource[] = [
    { id: "MG-001", title: "Game", slug: "game", type: "mindfulness_game", summary: null, category: null, tags: null, audiences: null, age_min: null, age_max: null, duration_minutes: null, skills: null, access: "free", source_url: "https://x", updated_at: null },
    { id: "b1", title: "Blog", slug: "b1", type: "blog", summary: null, category: null, tags: null, audiences: null, age_min: null, age_max: null, duration_minutes: null, skills: null, access: null, source_url: "https://x", updated_at: null },
  ];
  await withMockFetch(
    async (url) => {
      capturedUrl = String(url);
      return jsonResponse(200, successList(fixture));
    },
    async () => {
      const results = await findMindfulnessGamesTool.handler({ query: "grounding" } as any);
      assert.equal(results.length, 1);
      assert.equal(results[0]!.type, "mindfulness_game");
    },
  );
  const parsed = new URL(capturedUrl!);
  assert.equal(parsed.pathname, "/v1/search");
});

// ---------------------------------------------------------------------------
// find_guided_practices
// ---------------------------------------------------------------------------

test("find_guided_practices: every result carries access: 'free'", async () => {
  await withMockFetch(
    async () =>
      jsonResponse(
        200,
        successList([
          {
            id: "SL-012", slug: "three-minute-breathing-space-guided-audio", type: "practice",
            track_id: "SL-012", title: "Three-Minute Breathing Space", category: "breathwork",
            excerpt: "A short breathing practice.", audio_url: "https://files.x/SL-012.mp3",
            read_time_minutes: 3, canonical_url: "https://www.theholisticcare.com/stillness-library/three-minute-breathing-space-guided-audio",
            updated_at: null,
          },
        ]),
      ),
    async () => {
      const results = await findGuidedPracticesTool.handler({ category: "breathwork" } as any);
      assert.equal(results.length, 1);
      assert.equal(results[0]!.access, "free");
    },
  );
});

test("find_guided_practices: max_duration_minutes filters out longer practices client-side", async () => {
  await withMockFetch(
    async () =>
      jsonResponse(
        200,
        successList([
          { id: "SL-001", slug: "short", type: "practice", track_id: "SL-001", title: "Short", category: "mindfulness", excerpt: null, audio_url: "https://x/1.mp3", read_time_minutes: 3, canonical_url: "https://x/short", updated_at: null },
          { id: "SL-002", slug: "long", type: "practice", track_id: "SL-002", title: "Long", category: "mindfulness", excerpt: null, audio_url: "https://x/2.mp3", read_time_minutes: 20, canonical_url: "https://x/long", updated_at: null },
        ]),
      ),
    async () => {
      const results = await findGuidedPracticesTool.handler({ max_duration_minutes: 5 } as any);
      assert.deepEqual(results.map((r) => r.id), ["SL-001"]);
    },
  );
});

// ---------------------------------------------------------------------------
// search_mindfulness_research
// ---------------------------------------------------------------------------

test("search_mindfulness_research: no query hits /v1/whitepapers with topic/study_type server-side", async () => {
  let capturedUrl: string | undefined;
  await withMockFetch(
    async (url) => {
      capturedUrl = String(url);
      return jsonResponse(
        200,
        successList([
          {
            id: "research:goyal-2014", slug: "goyal-2014", type: "research_citation",
            title: "Meditation Programs for Psychological Stress", authors: "Goyal et al.",
            year: 2014, journal: "JAMA Internal Medicine", study_type: "meta-analysis",
            sample_size: 3515, topic: "mindfulness", summary: null, key_finding: null,
            limitations: null, source_url: null, updated_at: null,
          },
        ]),
      );
    },
    async () => {
      const results = await searchMindfulnessResearchTool.handler({ topic: "mindfulness", study_type: "meta-analysis" } as any);
      assert.equal(results.length, 1);
      assert.equal(results[0]!.type, "research");
    },
  );
  const parsed = new URL(capturedUrl!);
  assert.equal(parsed.pathname, "/v1/whitepapers");
  assert.equal(parsed.searchParams.get("topic"), "mindfulness");
  assert.equal(parsed.searchParams.get("study_type"), "meta-analysis");
});

test("search_mindfulness_research: with a query, study_type cannot be honestly applied and is silently NOT sent or filtered", async () => {
  let capturedUrl: string | undefined;
  const fixture: ApiResource[] = [
    { id: "research:x", title: "Some Research", slug: "x", type: "research", summary: null, category: "sleep", tags: null, audiences: null, age_min: null, age_max: null, duration_minutes: null, skills: null, access: null, source_url: "https://x", updated_at: null },
  ];
  await withMockFetch(
    async (url) => {
      capturedUrl = String(url);
      return jsonResponse(200, successList(fixture));
    },
    async () => {
      const results = await searchMindfulnessResearchTool.handler({ query: "sleep", study_type: "rct" } as any);
      // study_type can't be verified against the unified shape, so it must
      // not silently drop a legitimate match either.
      assert.equal(results.length, 1);
    },
  );
  const parsed = new URL(capturedUrl!);
  assert.equal(parsed.searchParams.has("study_type"), false);
});

// ---------------------------------------------------------------------------
// lookup_mindfulness_term
// ---------------------------------------------------------------------------

test("lookup_mindfulness_term: exact slug hit short-circuits before any search fallback", async () => {
  let callCount = 0;
  await withMockFetch(
    async (url) => {
      callCount += 1;
      assert.ok(String(url).endsWith("/v1/glossary/yoga-nidra"));
      return jsonResponse(
        200,
        successDetail({
          id: "glossary:yoga-nidra", slug: "yoga-nidra", type: "glossary_term", title: "Yoga Nidra",
          pillar: "yoga", summary: "A guided relaxation practice.", etymology: null, also_known_as: null, updated_at: null,
        }),
      );
    },
    async () => {
      const result = await lookupMindfulnessTermTool.handler({ term: "Yoga Nidra" } as any);
      assert.ok(result);
      assert.equal(result!.id, "glossary:yoga-nidra");
    },
  );
  assert.equal(callCount, 1, "an exact slug hit must not also call the search fallback");
});

test("lookup_mindfulness_term: falls back to search on a 404, and never invents a definition when nothing matches", async () => {
  let call = 0;
  await withMockFetch(
    async (url) => {
      call += 1;
      if (call === 1) {
        assert.ok(String(url).includes("/v1/glossary/"));
        return jsonResponse(404, { error: { code: "not_found", message: "no such term" } });
      }
      assert.ok(String(url).includes("/v1/search"));
      return jsonResponse(200, successList<ApiResource>([]));
    },
    async () => {
      const result = await lookupMindfulnessTermTool.handler({ term: "not a real term at all" } as any);
      assert.equal(result, null);
    },
  );
  assert.equal(call, 2);
});

test("lookup_mindfulness_term: pillar filter on the fallback path can legitimately return null", async () => {
  const fixture: ApiResource[] = [
    { id: "glossary:x", title: "X", slug: "x", type: "glossary", summary: "def", category: "ayurveda", tags: null, audiences: null, age_min: null, age_max: null, duration_minutes: null, skills: null, access: null, source_url: "https://x", updated_at: null },
  ];
  await withMockFetch(
    async (url) => {
      if (String(url).includes("/v1/glossary/")) return jsonResponse(404, { error: { code: "not_found", message: "x" } });
      return jsonResponse(200, successList(fixture));
    },
    async () => {
      const result = await lookupMindfulnessTermTool.handler({ term: "x", pillar: "yoga" } as any);
      assert.equal(result, null, "the only candidate is 'ayurveda', filtering for 'yoga' must yield no match");
    },
  );
});

// ---------------------------------------------------------------------------
// find_panchavikas_resources
// ---------------------------------------------------------------------------

test("find_panchavikas_resources: element filter matches only that pathway's id pattern", async () => {
  const fixture: ApiPanchaVikasResource[] = [
    { id: "PV-pathway-jal", type: "panchavikas_pathway", title: "Jal Pathway", summary: "Water.", source_url: "https://x/jal" },
    { id: "PV-pathway-agni", type: "panchavikas_pathway", title: "Agni Pathway", summary: "Fire.", source_url: "https://x/agni" },
    { id: "PV-guide", type: "panchavikas_download", title: "Guide", summary: "The public guide.", source_url: "https://x/pv", download_url: "https://x/guide.pdf" },
  ];
  await withMockFetch(
    async () => jsonResponse(200, successList(fixture)),
    async () => {
      const results = await findPanchavikasResourcesTool.handler({ element: "jal" } as any);
      assert.deepEqual(results.map((r) => r.id), ["PV-pathway-jal"]);
    },
  );
});

test("find_panchavikas_resources: never returns anything beyond the fixed public list, regardless of query", async () => {
  const fixture: ApiPanchaVikasResource[] = [
    { id: "PV-pathway-jal", type: "panchavikas_pathway", title: "Jal Pathway", summary: "Water element pathway.", source_url: "https://x/jal" },
  ];
  await withMockFetch(
    async () => jsonResponse(200, successList(fixture)),
    async () => {
      // A query designed to look like it's probing for private curriculum
      // content must still only ever be able to match the public list above.
      const results = await findPanchavikasResourcesTool.handler({ query: "216-session curriculum teacher script" } as any);
      assert.equal(results.length, 0);
    },
  );
});
