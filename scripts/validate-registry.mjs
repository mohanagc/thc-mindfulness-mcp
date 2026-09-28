#!/usr/bin/env node
/**
 * Structural validation of server.json against the fields the MCP Registry
 * (registry.modelcontextprotocol.io) requires at publish time, per the
 * server.schema.json shape in effect as of this project's build (2026-09).
 *
 * Deliberately does NOT fetch the live schema over the network (this script
 * needs to run in offline/CI/sandboxed environments) — it checks the fields
 * and types the registry is documented to require. Before an actual
 * publish, also validate with the registry's own `mcp-publisher validate`
 * CLI (or equivalent), since the hosted schema can move faster than this
 * script. See REGISTRY-PUBLISHING.md.
 *
 * Exit code 0 = looks publishable; 1 = a required field is missing/wrong shape.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const serverJsonPath = path.join(rootDir, "server.json");

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`✓ ${message}`);
}

let raw;
try {
  raw = readFileSync(serverJsonPath, "utf8");
} catch (err) {
  fail(`Could not read server.json at ${serverJsonPath}: ${err.message}`);
  process.exit(1);
}

let doc;
try {
  doc = JSON.parse(raw);
} catch (err) {
  fail(`server.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

// --- Required top-level fields -------------------------------------------

const requiredStrings = ["name", "description", "version"];
for (const field of requiredStrings) {
  if (typeof doc[field] !== "string" || doc[field].trim().length === 0) {
    fail(`"${field}" must be a non-empty string.`);
  } else {
    ok(`"${field}" present: ${doc[field]}`);
  }
}

// name must be a reverse-DNS-style namespaced identifier, e.g. io.github.<user>/<name>
if (typeof doc.name === "string") {
  if (!/^[a-z0-9.-]+\/[a-z0-9._-]+$/i.test(doc.name)) {
    fail(`"name" ("${doc.name}") does not look like the required "<namespace>/<name>" shape (e.g. io.github.mohanagc/thc-open-mindfulness).`);
  } else {
    ok('"name" matches the namespaced "<namespace>/<name>" shape.');
  }
}

// version should be semver-ish
if (typeof doc.version === "string" && !/^\d+\.\d+\.\d+/.test(doc.version)) {
  fail(`"version" ("${doc.version}") does not look like semver (expected e.g. "1.0.0").`);
}

// --- repository -------------------------------------------------------------

if (!doc.repository || typeof doc.repository !== "object") {
  fail('"repository" must be an object with "url" and "source".');
} else {
  if (typeof doc.repository.url !== "string" || !doc.repository.url.startsWith("https://")) {
    fail('"repository.url" must be an https:// URL.');
  } else {
    ok(`"repository.url" present: ${doc.repository.url}`);
  }
  if (typeof doc.repository.source !== "string") {
    fail('"repository.source" must be a string (e.g. "github").');
  } else {
    ok(`"repository.source" present: ${doc.repository.source}`);
  }
}

// --- remotes: this is a remote-only server, so `remotes` must be present ---

if (!Array.isArray(doc.remotes) || doc.remotes.length === 0) {
  fail('"remotes" must be a non-empty array — this server has no local/packaged transport.');
} else {
  for (const [i, remote] of doc.remotes.entries()) {
    if (!remote || typeof remote !== "object") {
      fail(`remotes[${i}] must be an object.`);
      continue;
    }
    if (remote.type !== "streamable-http" && remote.type !== "sse") {
      fail(`remotes[${i}].type ("${remote.type}") must be "streamable-http" or "sse".`);
    } else {
      ok(`remotes[${i}].type: ${remote.type}`);
    }
    if (typeof remote.url !== "string" || !remote.url.startsWith("https://")) {
      fail(`remotes[${i}].url must be an https:// URL.`);
    } else {
      ok(`remotes[${i}].url: ${remote.url}`);
    }
  }
}

// --- Consistency with package.json -----------------------------------------

try {
  const pkg = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8"));
  if (pkg.version !== doc.version) {
    fail(`server.json version ("${doc.version}") does not match package.json version ("${pkg.version}").`);
  } else {
    ok(`version matches package.json (${doc.version}).`);
  }
} catch (err) {
  fail(`Could not cross-check package.json: ${err.message}`);
}

if (process.exitCode === 1) {
  console.error("\nserver.json failed validation — see ✗ lines above.");
} else {
  console.log("\nserver.json passed structural validation. Re-verify against the registry's live schema before actually publishing.");
}
