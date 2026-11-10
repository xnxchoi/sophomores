import { merge } from "lodash-es";
import en from "../../messages/en.json";
import ko from "../../messages/ko.json";

// Native next-intl messages, with the installed deep merge handling partial
// namespaces. Empty Korean strings deliberately remain empty until the owner's
// separate fallback breakpoint. Neither source catalogue is mutated.
export const messagesByLocale = { en, ko: merge({}, en, ko) };
