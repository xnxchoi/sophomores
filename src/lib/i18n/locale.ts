"use server";

import { cookies } from "next/headers";
import { locales, type Locale, defaultLocale } from "@/i18n/request";

const COOKIE_NAME = "NEXT_LOCALE";
const ONE_YEAR = 365 * 24 * 60 * 60;

/**
 * Persists the user's preferred language in the standard NEXT_LOCALE cookie
 * across the entire application domain without changing the URL pathname.
 */
export async function setUserLocale(locale: Locale): Promise<void> {
  if (!locales.includes(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: false, // Accessible by both client scripts and SSR
  });
}

/**
 * Retrieves the currently persisted user locale from cookie, or returns default.
 */
export async function getUserLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get(COOKIE_NAME)?.value;
    if (val && locales.includes(val as Locale)) {
      return val as Locale;
    }
  } catch {
    // Fall back to default
  }
  return defaultLocale;
}
