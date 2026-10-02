import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

/*
 * TypeScript 7.0 intentionally has no stable Compiler API yet. The current
 * typescript-eslint line still imports that API and crashes on TS 7 with
 * "Cannot read properties of undefined (reading 'Cjs')".
 *
 * Keep ESLint on the runtime-safe JS/JSX surface for now. TypeScript remains
 * enforced by the dedicated typecheck gate. Re-enable TS linting once the
 * TypeScript 7-compatible typescript-eslint stack is available.
 */
const eslintConfig = defineConfig([
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
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
