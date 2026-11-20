import { draftMode, headers } from "next/headers";
import { getLocale } from "next-intl/server";
import config from "@payload-config";
import { getPayload } from "payload";
import type { HomePageContent } from "@/components/teaser/content-provider";
import { homePageDefaultsResponse } from "@/lib/teaser/home-page-defaults";
import { homePageDraftViewer, homePageLocale, resolveHomePageCopy } from "@/lib/teaser/home-page-copy";
import { HomeView } from "./_home/home-view";

type HomeSearch = Promise<{ locale?: string | string[]; draftId?: string | string[] }>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * The copy is resolved on the server, so it is in the first paint (The Hideaway: (site)/page.tsx). Live
 * preview keeps working: on save LivePreviewRefresh refreshes the route and the server reads the draft.
 * Drafts only for a staff session verified on this request while draft mode is on (homePageDraftViewer);
 * a draft-mode cookie alone gets the public copy.
 */
export default async function Home({ searchParams }: { searchParams: HomeSearch }) {
  const [search, siteLocale, draft, requestHeaders] = await Promise.all([searchParams, getLocale(), draftMode(), headers()]);
  const raw = one(search.locale);
  const locale = homePageLocale(raw === "en" || raw === "ko" ? raw : siteLocale);
  let copy: Record<string, unknown> | null = null;
  try {
    const payload = await getPayload({ config });
    const staff = await homePageDraftViewer(payload, { draftMode: draft.isEnabled, headers: requestHeaders });
    copy = await resolveHomePageCopy(payload, { locale, staff, draftId: staff ? one(search.draftId) : null });
  } catch {
    // As the copy route did, an unreadable copy store shows the built defaults.
    console.error("Home page copy is unavailable; showing the built defaults.");
  }
  return <HomeView content={(copy ?? homePageDefaultsResponse(locale)) as HomePageContent} />;
}
