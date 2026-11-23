import { pick } from "lodash-es";
import { messagesByLocale } from "@/i18n/messages";
import { verificationNamespaces, type VerificationCatalogues } from "./i18n";

/** Both locales of the phone verification copy, picked on the server so no client bundle imports a catalogue. */
export function verificationCatalogues(): VerificationCatalogues {
  return {
    en: pick(messagesByLocale.en, verificationNamespaces),
    ko: pick(messagesByLocale.ko, verificationNamespaces)
  };
}
