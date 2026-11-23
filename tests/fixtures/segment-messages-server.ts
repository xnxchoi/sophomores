import { messagesByLocale } from "@/i18n/messages";

/** Request-free stand-in for next-intl/server's getMessages: the resolved Korean catalogue (English fallback). */
export async function getMessages() {
  return messagesByLocale.ko;
}
