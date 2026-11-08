import en from "./messages/en.json";
import ko from "./messages/ko.json";

export const verificationLocales = ["en", "ko"] as const;
export type VerificationLocale = (typeof verificationLocales)[number];
export const messagesByLocale = { en, ko };
