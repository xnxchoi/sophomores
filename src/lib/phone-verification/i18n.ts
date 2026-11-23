import type { AbstractIntlMessages } from "next-intl";

export const verificationLocales = ["en", "ko"] as const;
export type VerificationLocale = (typeof verificationLocales)[number];

/**
 * The copy the phone verification flow reads (its copy button included). It switches language itself, so it
 * receives both locales. tests/phone-verification/verification-messages.test.ts checks this covers the flow.
 */
export const verificationNamespaces = [
  "Common",
  "Interface",
  "Verification",
  "VerificationTrial"
] as const;
export type VerificationCatalogues = Record<
  VerificationLocale,
  AbstractIntlMessages
>;
