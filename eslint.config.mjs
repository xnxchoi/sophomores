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
    "providers/**",
    "utilities/**",
    "payload/**",
    "components/UX/**",
    "components/core/**",
    "components/Shells/**",
    "components/content/**",
    "components/three/**",
    "components/forms/**",
    "components/identity/**",
    "components/layouts/**",
    "components/ui/HA_*",
    "components/sections/BOTD/**",
    "components/sections/Credits/**",
    "components/sections/DayNNight/**",
    "components/sections/DayNNightGate/**",
    "components/sections/FeaturedHero/**",
    "components/sections/HeadlinersRail/**",
    "components/sections/Justification/**",
    "components/sections/ParallaxGrid/**",
    "components/sections/PriceCard/**",
    "components/sections/Pricing/**",
    "components/sections/Showcase/**",
    "components/sections/Starliner/**",
    "components/sections/StationHideaway/**",
    "components/sections/split-section/**",
    "components/auth/AuthCard.tsx",
    "components/auth/AuthCard.test.tsx",
    "components/auth/AuthShell.tsx",
    "components/auth/AuthShell.prerender.test.ts",
    "components/auth/AuthTextLink.tsx",
    "components/auth/ForgotPasswordForm.tsx",
    "components/auth/PasskeyButton.tsx",
    "components/auth/PasswordInput.tsx",
    "components/auth/ProviderButton.tsx",
    "components/auth/ProviderButton.test.tsx",
    "components/auth/ResetPasswordForm.tsx",
    "components/auth/SignInForm.tsx",
    "components/auth/SignUpForm.tsx",
    "components/auth/SignedIn.tsx",
    "components/auth/TwoFactorCard.tsx",
    "components/auth/UserAvatar.tsx",
    "components/auth/auth-styles.ts",
    "components/auth/icons.tsx",
    "components/auth/index.ts"
  ])
]);

export default eslintConfig;
