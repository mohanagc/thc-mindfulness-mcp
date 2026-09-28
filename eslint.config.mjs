import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Standard Next.js flat-config setup (matches what `create-next-app`
// generates for a TypeScript project). `next/typescript` is what makes the
// existing `// eslint-disable-line @typescript-eslint/no-explicit-any`
// comments in src/tools/index.ts meaningful — those two casts are the
// server's only intentional `any` usage (documented in HANDOFF.md) and are
// expected to need that disable once real linting is wired up, which is
// exactly what this config does.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["tests/**", "scripts/**", ".next/**", "node_modules/**"],
  },
];

export default eslintConfig;
