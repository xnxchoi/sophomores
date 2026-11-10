import { createTranslator } from "next-intl";
import messages from "../../messages/en.json";

/** Request-free server boundary; native ICU formatting and canonical English stay real. */
export async function getTranslations(namespace: keyof typeof messages) {
  return createTranslator({ locale: "en", messages, namespace });
}
