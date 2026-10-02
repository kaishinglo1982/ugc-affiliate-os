import { defineConfig, globalIgnores } from "eslint/config";

/*
 * TypeScript 7.0 is currently incompatible with the TypeScript-aware
 * eslint-config-next/typescript stack. TypeScript is therefore enforced by
 * the dedicated tsc --noEmit gate. Keep ESLint dependency-free here so CI
 * remains deterministic until a TS7-compatible parser stack is available.
 */
const eslintConfig = defineConfig([
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    rules: {},
  },
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
    "**/*.ts",
    "**/*.tsx",
  ]),
]);

export default eslintConfig;
