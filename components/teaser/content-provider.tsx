"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
    const rawLocale = searchParams.get("locale");
    const locale =
      rawLocale && rawLocale !== "[object Object]" ? rawLocale : "en";
    const draftId = searchParams.get("draftId") || "";
    const draftParam = searchParams.get("draft") || "true";
    const query = new URLSearchParams({
      locale,
      draft: draftParam,
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

  return {
    brandWordmark: content?.brandWordmark || defaultTeaser.name,
    preludeTitleLeft: content?.preludeTitleLeft || "Experienced.",
    preludeTitleRight: content?.preludeTitleRight || "Not Finished.",
    warpPassageLine1:
      content?.warpPassageLine1 || "Lorem ipsum dolor sit amet,",
    warpPassageLine2:
      content?.warpPassageLine2 || "consectetur adipiscing elit sed do.",
    notice1Sender: content?.notice1Sender || "From: sophomores",
    notice1Time: (content?.notice1Time as string) || "Now",
    notice1Body: content?.notice1Body || defaultTeaser.introduction,
    notice2Sender: content?.notice2Sender || "Ticket sales open",
    notice2Time: content?.notice2Time || defaultTeaser.launchHint,
    notice2Body: content?.notice2Body || defaultTeaser.notification,
    centerHeadline: content?.centerHeadline || defaultTeaser.headline,
    storyLabel: (content?.storyLabel as string) || "Our story",
    typingNotice:
      (content?.typingNotice as string) ||
      `${content?.brandWordmark || "Sophomores"} is typing`,
    stories:
      content?.stories && content.stories.length > 0
        ? content.stories.map((s, i) => ({
            ...defaultStories[i],
            title: s.title || defaultStories[i]?.title || "",
            body: s.body || defaultStories[i]?.body || "",
            tone: s.tone || defaultStories[i]?.tone || "dark"
          }))
        : defaultStories,
    principles:
      content?.principles && content.principles.length > 0
        ? content.principles.map((p, i) => ({
            ...defaultPrinciples[i],
            title: p.title || defaultPrinciples[i]?.title || "",
            body: p.body || defaultPrinciples[i]?.body || "",
            color: p.color || defaultPrinciples[i]?.color || "#ff4c25"
          }))
        : defaultPrinciples,
    messages:
      content?.messages && content.messages.length > 0
        ? content.messages.map((m, i) => ({
            ...defaultMessages[i],
            from: m.from || defaultMessages[i]?.from || "From: sophomores",
            text: m.text || defaultMessages[i]?.text || ""
          }))
        : defaultMessages,
    peopleHeadline:
      content?.peopleHeadline ||
      defaultTeaser.peopleHeadline ||
      "Experienced Enough To Know Better. Curious Enough To Go Anyway.",
    values:
      content?.values && content.values.length > 0
        ? content.values.map((v, i) => ({
            image: defaultValues[i]?.image || "/teaser/orb-blue.webp",
            body: v.body || defaultValues[i]?.body || ""
          }))
        : defaultValues,
    invitationHeadline:
      content?.invitationHeadline ||
      defaultTeaser.invitation ||
      "Go Ahead, Light Me Up",
    rsvpButtonLabel: content?.rsvpButtonLabel || "The first invitation",
    rsvpButtonSubtext: content?.rsvpButtonSubtext || defaultTeaser.launchHint,
    footerCopyright: content?.footerCopyright || "© sophomores 2026",
    footerDomain:
      content?.footerDomain || defaultTeaser.domain || "sophomores.co",
    modalHeading: content?.modalHeading || "The first invitation",
    modalLead:
      content?.modalLead ||
      `Ticket sales open ${defaultTeaser.launchHint.toLowerCase()}.`,
    modalDisclaimer1:
      content?.modalDisclaimer1 ||
      "Date to be announced. Ticket sales are not open yet.",
    modalDisclaimer2:
      content?.modalDisclaimer2 ||
      "Preview only. No email is collected and no reservation is made.",
    modalReturnButton: content?.modalReturnButton || "Back to the story →"
  };
}
