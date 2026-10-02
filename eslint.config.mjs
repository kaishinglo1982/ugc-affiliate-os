import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

/*
 * TypeScript 7.0 is not yet compatible with the TypeScript-aware ESLint
 * parser shipped by the current Next.js config. Keep ESLint on the stable
 * Next.js JavaScript/JSX ruleset; TypeScript remains enforced by tsc --noEmit.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/prisma/**",
    "playwright-report/**",
    "graphify-out/**",
    "coverage/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
