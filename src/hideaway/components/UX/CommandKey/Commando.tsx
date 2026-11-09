"use client";

import { HA_CommandItem as CommandItem } from "@/components/ui/command";
import { IndexedCollections } from "@/payload/search/beforeSync";
import { useSearchBar } from "@/hideaway/providers/RP_Pro";
import { useVoyageur } from "@/hideaway/stores/Routing/RP_Voyageur";
import { useDebounce } from "@/hideaway/utilities/useDebounce";
import { useQuery } from "@tanstack/react-query";
import { useLenis } from "lenis/react";
import { useTransitionRouter } from "next-transition-router";
import { type ReactNode, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SearchAPIResult = {
  id: string;
  title?: string;
  name?: string;
  username?: string;
  slug: string;
  collection_type: IndexedCollections;
  url: string;
  score: number;
  type: "content";
  subtitle?: string;
  artist?: string;
  bio?: string;
  published_at?: string;
};

export type SearchAPIResponse = {
  results: SearchAPIResult[];
  query: string;
  collections: string[];
  total: number;
};

// ─── Labels ──────────────────────────────────────────────────────────────────

export const COLLECTION_LABELS: Record<string, string> = {
  posts: "Essay",
  surf: "Surf",
  profile: "Person",
  albums: "Album",
  tracks: "Track",
  playlists: "Playlist",
  pages: "Page"
};

export function getResultLabel(result: SearchAPIResult): string {
  return result.title ?? result.name ?? result.username ?? result.slug;
}

export function getCollectionLabel(collectionType: string): string {
  return COLLECTION_LABELS[collectionType] ?? collectionType;
}

// ─── Data hook ───────────────────────────────────────────────────────────────

export function useSearchQuery() {
  const value = useSearchBar((l) => l.value);
  const open = useSearchBar((l) => l.open);
  const debouncedValue = useDebounce(value, 280);

  const query = useQuery<SearchAPIResponse>({
    queryKey: ["search", debouncedValue],
    queryFn: async () => {
      const res = await fetch(
        "/api/search/?q=" + encodeURIComponent(debouncedValue),
        { method: "GET" }
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json() as Promise<SearchAPIResponse>;
    },
    enabled: open && debouncedValue.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    gcTime: 60_000,
    // Keep previous results visible while new ones load
    placeholderData: (prev) => prev
  });

  return { ...query, debouncedValue };
}

// ─── Components ──────────────────────────────────────────────────────────────

export const LinkedCommandItem = ({
  href,
  title,
  value,
  type,
  children,
  ...rest
}: {
  href: string;
  title: string;
  value?: string;
  type?: string;
  children?: ReactNode;
  [x: string]: any;
}) => {
  const lenis = useLenis();
  const router = useTransitionRouter();
  const setOpen = useSearchBar((l) => l.setOpen);
  const url = useVoyageur((l) => l.url);
  const pathName = useVoyageur((l) => l.pathName);
  const isAnchor = href === url || href.startsWith(`${pathName}#`);

  const handleClick = useCallback(() => {
    setOpen(false);
    if (isAnchor) {
      lenis?.scrollTo(href);
    } else {
      router.push(decodeURIComponent(href));
    }
  }, [setOpen, isAnchor, lenis, href, router]);

  return (
    <CommandItem
      data-themed={"color,background-color"}
      value={value ?? href}
      onSelect={handleClick}
      {...rest}
    >
      {children}
      <span className="flex-1 truncate">{title}</span>
      {type && <span className="rp_tag ml-2 shrink-0 opacity-50">{type}</span>}
    </CommandItem>
  );
};

export const SearchResultItem = ({ result }: { result: SearchAPIResult }) => (
  <LinkedCommandItem
    href={result.url}
    title={getResultLabel(result)}
    value={result.id}
    type={getCollectionLabel(result.collection_type)}
  />
);

// ─── Legacy export ───────────────────────────────────────────────────────────

export const LinkedItem = ({
  doc,
  content
}: {
  doc: { relationTo: string; value: string };
  content: any;
}) => (
  <LinkedCommandItem
    href={`/${doc.relationTo}/${content?.slug ?? doc.value}`}
    title={content?.name ?? content?.title ?? content?.username ?? doc.value}
    value={doc.value}
    type={getCollectionLabel(doc.relationTo)}
  />
);
