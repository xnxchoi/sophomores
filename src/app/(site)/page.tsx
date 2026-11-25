import { cookies, draftMode, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import config from "@payload-config";
import { getPayload } from "payload";
import type { HomePageContent } from "@/components/teaser/content-provider";
import { homePageDefaultsResponse } from "@/lib/teaser/home-page-defaults";
import { homePageDraftViewer, homePageLocale, resolveHomePageCopy } from "@/lib/teaser/home-page-copy";
import { HomeView } from "./_home/home-view";
import { DropEntryMarker } from "./_home/drop-entry-marker";
import { defaultHomeHref, warpEntryCookie } from "@/lib/content/home";
import { warpHomeForRequest } from "@/lib/content/home-entry.server";

type HomeSearch = Promise<{ locale?: string | string[]; draftId?: string | string[] }>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * The copy is resolved on the server, so it is in the first paint (The Hideaway: (site)/page.tsx). Live
 * preview keeps working: on save LivePreviewRefresh refreshes the route and the server reads the draft.
 * Drafts only for a staff session verified on this request while draft mode is on (homePageDraftViewer);
 * a draft-mode cookie alone gets the public copy.
 */
export default async function Home({ searchParams }: { searchParams: HomeSearch }) {
  const [search, siteLocale, draft, requestHeaders, jar] = await Promise.all([searchParams, getLocale(), draftMode(), headers(), cookies()]);
  const raw = one(search.locale);
  const locale = homePageLocale(raw === "en" || raw === "ko" ? raw : siteLocale);
  let payload: Awaited<ReturnType<typeof getPayload>> | null = null;
  let staff: Awaited<ReturnType<typeof homePageDraftViewer>> = null;
  try {
    payload = await getPayload({ config });
    staff = await homePageDraftViewer(payload, { draftMode: draft.isEnabled, headers: requestHeaders });
  } catch {
    // An unreadable store: the window reads as closed below, so the visitor gets the default home.
  }
  // The Warp home is shown only inside the owner's window, after an entry link, or to staff previewing it
  // (src/lib/content/home-entry.server.ts). A cookie-less "/" never reaches this page: next.config.ts sends it to the
  // home-entry gate, which redirects before anything renders. This check covers a client navigation to "/" and a
  // cookie that no longer holds (forged, or a window pass after the window closed).
  if (!payload || !(await warpHomeForRequest({ payload, passCookie: jar.get(warpEntryCookie)?.value, staff: staff !== null }))) {
    redirect(defaultHomeHref);
  }
  let copy: Record<string, unknown> | null = null;
  try {
    copy = await resolveHomePageCopy(payload, { locale, staff, draftId: staff ? one(search.draftId) : null });
  } catch {
    // As the copy route did, an unreadable copy store shows the built defaults.
    console.error("Home page copy is unavailable; showing the built defaults.");
  }
  return (
    <>
      <DropEntryMarker />
      <HomeView content={(copy ?? homePageDefaultsResponse(locale)) as HomePageContent} />
    </>
  );
}
