import { mergeWith } from "lodash-es";
import en from "../../messages/en.json";
import ko from "../../messages/ko.json";

// One native next-intl catalogue for client and server consumers. The owner
// activated empty-Korean fallback on 2026-11-13; neither source is mutated.
export const messagesByLocale = {
  en,
  ko: mergeWith({}, en, ko, (englishValue: unknown, koreanValue: unknown) =>
    koreanValue === "" ? englishValue : undefined,
  ),
};
