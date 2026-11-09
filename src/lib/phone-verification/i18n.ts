export { messagesByLocale } from "@/i18n/messages";

export const verificationLocales = ["en", "ko"] as const;
export type VerificationLocale = (typeof verificationLocales)[number];
