"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from "react";
import { useRouter } from "next/navigation";
import {
  RefreshRouteOnSave,
  useLivePreview
} from "@payloadcms/live-preview-react";
import {
  messages as defaultMessages,
  principles as defaultPrinciples,
  stories as defaultStories,
  teaser as defaultTeaser,
  values as defaultValues
} from "@/lib/teaser/content";

export type HomePageContent = Record<string, unknown> & {
  brandWordmark?: string;
  preludeTitleLeft?: string;
  preludeTitleRight?: string;
  warpPassageLine1?: string;
  warpPassageLine2?: string;
  notice1Sender?: string;
  notice1Time?: string;
  notice1Body?: string;
  notice2Sender?: string;
  notice2Time?: string;
  notice2Body?: string;
  centerHeadline?: string;
  storyLabel?: string;
  typingNotice?: string;
  stories?: Array<{ title?: string; body?: string; tone?: string }>;
  principles?: Array<{ title?: string; body?: string; color?: string }>;
  messages?: Array<{ from?: string; text?: string }>;
  peopleHeadline?: string;
  values?: Array<{ body?: string; image?: string }>;
  invitationHeadline?: string;
  rsvpButtonLabel?: string;
  rsvpButtonSubtext?: string;
  footerCopyright?: string;
  footerDomain?: string;
  modalHeading?: string;
  modalLead?: string;
  modalDisclaimer1?: string;
  modalDisclaimer2?: string;
  modalReturnButton?: string;
};

const TeaserContentContext = createContext<HomePageContent | null>(null);

function pick(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function resolveClientLocale(searchParams: URLSearchParams): "en" | "ko" {
  const rawLocale = searchParams.get("locale");
  if (rawLocale === "ko" || rawLocale === "en") return rawLocale;
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(ko|en)/);
    if (cookieMatch?.[1] === "ko" || cookieMatch?.[1] === "en") {
      return cookieMatch[1];
    }
    if (document.documentElement.lang?.toLowerCase().startsWith("ko")) {
      return "ko";
    }
  }
  return "en";
}

function LivePreviewRefreshInner({ serverURL }: { serverURL: string }) {
  const { refresh } = useRouter();
  return (
    <RefreshRouteOnSave
      refresh={refresh}
      serverURL={serverURL}
    />
  );
}

function LivePreviewRefresh({ serverURL }: { serverURL: string }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted || !serverURL) return null;
  return <LivePreviewRefreshInner serverURL={serverURL} />;
}

export function TeaserContentProvider({
  initialContent,
  children
}: {
  initialContent?: HomePageContent | null;
  children: React.ReactNode;
}) {
  const [fetchedContent, setFetchedContent] = useState<HomePageContent | null>(
    null
  );
  const serverURL = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    const searchParams = new URLSearchParams(window.location.search);
    const locale = resolveClientLocale(searchParams);
    const draftId = searchParams.get("draftId") || "";
    const isDraft =
      searchParams.get("draft") === "true" || Boolean(draftId);
    const query = new URLSearchParams({
      locale,
      draft: isDraft ? "true" : "false",
      depth: "1"
    });
    if (draftId) query.set("draftId", draftId);

    fetch(`/api/globals/home-page?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json && typeof json === "object" && !("errors" in json)) {
          setFetchedContent(json as HomePageContent);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const effectiveInitial = initialContent || fetchedContent || {};

  const { data } = useLivePreview<HomePageContent>({
    initialData: effectiveInitial,
    serverURL,
    depth: 1
  });

  const content = useMemo(() => {
    if (
      data &&
      Object.keys(data).length > 0 &&
      (data.brandWordmark || data.centerHeadline || data.preludeTitleLeft)
    ) {
      return data;
    }
    if (fetchedContent && Object.keys(fetchedContent).length > 0) {
      return fetchedContent;
    }
    return initialContent ?? null;
  }, [data, fetchedContent, initialContent]);

  return (
    <TeaserContentContext.Provider value={content}>
      <LivePreviewRefresh serverURL={serverURL} />
      {children}
    </TeaserContentContext.Provider>
  );
}

export function useTeaserContent() {
  const content = useContext(TeaserContentContext);
  const brandWordmark = pick(content?.brandWordmark, defaultTeaser.name);

  return {
    brandWordmark,
    preludeTitleLeft: pick(
      content?.preludeTitleLeft,
      defaultTeaser.preludeTitleLeft
    ),
    preludeTitleRight: pick(
      content?.preludeTitleRight,
      defaultTeaser.preludeTitleRight
    ),
    warpPassageLine1: pick(
      content?.warpPassageLine1,
      defaultTeaser.warpPassageLine1
    ),
    warpPassageLine2: pick(
      content?.warpPassageLine2,
      defaultTeaser.warpPassageLine2
    ),
    notice1Sender: pick(content?.notice1Sender, "From: sophomores"),
    notice1Time: pick(content?.notice1Time, "Now"),
    notice1Body: pick(content?.notice1Body, defaultTeaser.introduction),
    notice2Sender: pick(content?.notice2Sender, "Ticket sales open"),
    notice2Time: pick(content?.notice2Time, defaultTeaser.launchHint),
    notice2Body: pick(content?.notice2Body, defaultTeaser.notification),
    centerHeadline: pick(content?.centerHeadline, defaultTeaser.headline),
    storyLabel: pick(content?.storyLabel, "Our story"),
    typingNotice: pick(content?.typingNotice, `${brandWordmark} is typing`),
    stories:
      content?.stories && content.stories.length > 0
        ? content.stories.map((s, i) => ({
            ...defaultStories[i],
            title: pick(s.title, defaultStories[i]?.title || ""),
            body: pick(s.body, defaultStories[i]?.body || ""),
            tone: pick(s.tone, defaultStories[i]?.tone || "dark") as
              | "blue"
              | "dark"
              | "green"
              | "portrait"
          }))
        : defaultStories,
    principles:
      content?.principles && content.principles.length > 0
        ? content.principles.map((p, i) => ({
            ...defaultPrinciples[i],
            title: pick(p.title, defaultPrinciples[i]?.title || ""),
            body: pick(p.body, defaultPrinciples[i]?.body || ""),
            color: pick(p.color, defaultPrinciples[i]?.color || "#ff4c25")
          }))
        : defaultPrinciples,
    messages:
      content?.messages && content.messages.length > 0
        ? content.messages.map((m, i) => ({
            ...defaultMessages[i],
            from: pick(m.from, defaultMessages[i]?.from || "From: sophomores"),
            text: pick(m.text, defaultMessages[i]?.text || "")
          }))
        : defaultMessages,
    peopleHeadline: pick(
      content?.peopleHeadline,
      defaultTeaser.peopleHeadline
    ),
    values:
      content?.values && content.values.length > 0
        ? content.values.map((v, i) => ({
            image: defaultValues[i]?.image || "/teaser/orb-blue.webp",
            body: pick(v.body, defaultValues[i]?.body || "")
          }))
        : defaultValues,
    invitationHeadline: pick(
      content?.invitationHeadline,
      defaultTeaser.invitation
    ),
    rsvpButtonLabel: pick(content?.rsvpButtonLabel, "The first invitation"),
    rsvpButtonSubtext: pick(
      content?.rsvpButtonSubtext,
      defaultTeaser.launchHint
    ),
    footerCopyright: pick(content?.footerCopyright, "© sophomores 2026"),
    footerDomain: pick(content?.footerDomain, defaultTeaser.domain),
    modalHeading: pick(content?.modalHeading, "The first invitation"),
    modalLead: pick(
      content?.modalLead,
      `Ticket sales open ${defaultTeaser.launchHint.toLowerCase()}.`
    ),
    modalDisclaimer1: pick(
      content?.modalDisclaimer1,
      "Date to be announced. Ticket sales are not open yet."
    ),
    modalDisclaimer2: pick(
      content?.modalDisclaimer2,
      "Preview only. No email is collected and no reservation is made."
    ),
    modalReturnButton: pick(
      content?.modalReturnButton,
      "Back to the story →"
    )
  };
}
