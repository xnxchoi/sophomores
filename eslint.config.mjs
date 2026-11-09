import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tailwindComponentStyling from "./scripts/eslint/tailwind-component-styling.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      local: {
        rules: { "tailwind-component-styling": tailwindComponentStyling }
      }
    },
    rules: { "local/tailwind-component-styling": "error" }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Captured third-party references and generated deployment snapshots are not source.
    "artifacts/**",
    ".deployment/**",
    ".history/**",
    ".output/**",
    "docs/design/references/**",
    "src/hideaway/**"
  ])
]);

export default eslintConfig;
