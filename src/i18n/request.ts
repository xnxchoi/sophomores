import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const locales = ["ko", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    try {
      const cookieStore = await cookies();
      const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

      if (cookieLocale && locales.includes(cookieLocale as Locale)) {
        locale = cookieLocale;
      } else {
        const headerStore = await headers();
        const acceptLang = headerStore.get("accept-language")?.toLowerCase() || "";
        if (acceptLang.startsWith("en") || (acceptLang.includes("en") && !acceptLang.includes("ko"))) {
          locale = "en";
        } else {
          locale = defaultLocale;
        }
      }
    } catch {
      // In static render contexts or environments where cookies/headers are unavailable
      locale = defaultLocale;
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
