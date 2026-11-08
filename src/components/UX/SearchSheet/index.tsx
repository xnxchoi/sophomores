"use client";

import { Drawer } from "@/components/ui/vaul";
import {
  getCollectionLabel,
  getResultLabel,
  type SearchAPIResponse
} from "@/components/UX/CommandKey/Commando";
import { useRecentsTracker } from "@/components/UX/CommandKey/useRecents";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/providers/MiddleMan";
import { useRPStore } from "@/providers/RP_Pro";
import { useDebounce } from "@/utilities/useDebounce";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Search as SearchIcon, X } from "lucide-react";
import * as m from "motion/react-m";
import { useTransitionRouter } from "next-transition-router";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode
} from "react";
import { useShallow } from "zustand/shallow";

/**
 * Full-screen mobile search sheet. Opens from the Controlbar search button
 * on touch-mobile and overlays the entire viewport. Independent of CMDK
 * and the SideDrawer view machine — owns its own input state, fetches via
 * `/api/search`, and dismisses on result selection.
 *
 * Architecture:
 *  - Vaul `Drawer.Root` with snapPoint=1 (full-screen) and `direction="bottom"`
 *  - Self-gates on `isMobile && isTouch` so it stays inert on desktop
 *  - Local controlled `value` state — no coupling to `useSearchBar`
 *  - Debounced query via `@tanstack/react-query`, mirrors the data shape
 *    of `useSearchQuery` so result rendering stays consistent
 *  - Renders recents (default state) → loading → results → empty
 *  - All taps route via `next-transition-router` and close the sheet
 *
 * Why not extend the existing in-drawer `SearchView`? The SideDrawer is
 * height-clamped to 65dvh, intercepts touches via the Vaul handle, and
 * shares an open-bit with the nav menu. A dedicated sheet sidesteps all
 * three: full keyboard real-estate, dedicated touch surface, decoupled
 * state.
 */
export const SearchSheet = () => {
  const { isMobile, isTouch } = useIsMobile();
  const open = useRPStore(useShallow((s) => s.searchSheetOpen));
  const setOpen = useRPStore((s) => s.setSearchSheetOpen);
  const setSideDrawerOpen = useRPStore((s) => s.setSideDrawerOpen);
  const setControlbarView = useRPStore((s) => s.setControlbarView);

  // When the sheet opens, dismiss the SideDrawer + reset its view so the
  // user returns to a clean default state on close. The sheet is its own
  // surface; the drawer should not coexist behind it.
  useEffect(() => {
    if (open) {
      setSideDrawerOpen(false);
      setControlbarView("default");
    }
  }, [open, setSideDrawerOpen, setControlbarView]);

  // Gate entirely on touch-mobile. On desktop / coarse-window resizes the
  // CommandKey/SearchBar handles search via CMDK.
  if (!(isMobile && isTouch)) return null;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={setOpen}
      direction="bottom"
      // Modal so the body locks behind the sheet — no double-scrolling.
      modal={true}
      // Disable drag-to-dismiss. The sheet has its own X button (and the
      // input has an "enter to /search" route), so the user always has a
      // close path; swiping down would otherwise compete with iOS scroll
      // physics over the results list and feel broken.
      dismissible={false}
      // No snap points — full-screen overlay only.
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[260] bg-background/40 backdrop-blur-md" />
        <Drawer.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-[261] flex h-[100dvh] w-full",
            "flex-col bg-nav-background outline-none",
            // Vaul transitions handle the slide-up
            "data-[vaul-drawer-direction=bottom]:!translate-y-0"
          )}
        >
          <Drawer.Title className="sr-only">Search</Drawer.Title>
          <SheetBody onClose={() => setOpen(false)} />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

// ─── Sheet body ─────────────────────────────────────────────────────────────

const SheetBody = ({ onClose }: { onClose: () => void }) => {
  const t = useTranslations("Controlbar");
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const debounced = useDebounce(value, 280);

  // Focus the input once the sheet finishes its enter animation. A 60ms
  // delay sidesteps iOS Safari's quirk where focusing mid-translate fails
  // to summon the keyboard.
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, []);

  const router = useTransitionRouter();
  const recents = useRecentsTracker();

  const { data, isFetching } = useQuery<SearchAPIResponse>({
    queryKey: ["search-sheet", debounced],
    queryFn: async () => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debounced)}`,
        { method: "GET" }
      );
      if (!res.ok) throw new Error("Search failed");
      return (await res.json()) as SearchAPIResponse;
    },
    enabled: debounced.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    gcTime: 60_000,
    placeholderData: (prev) => prev
  });

  const results = useMemo(() => (data?.results ?? []).slice(0, 10), [data]);
  const isDebouncing = value.length > 0 && value !== debounced;
  const isLoading = isDebouncing || (debounced.length > 0 && isFetching);
  const isInit = value.length === 0;
  const isEmpty =
    !isLoading && debounced.length > 0 && data && data.results.length === 0;

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    []
  );

  const goTo = useCallback(
    (href: string) => {
      onClose();
      // Defer navigation until after the close animation begins so the
      // sheet doesn't visibly stick around through the route change.
      window.setTimeout(() => router.push(href), 80);
    },
    [onClose, router]
  );

  const handleViewAll = useCallback(() => {
    goTo(`/search?q=${encodeURIComponent(debounced)}`);
  }, [goTo, debounced]);

  return (
    <>
      <Header
        value={value}
        onChange={onChange}
        onClose={onClose}
        inputRef={inputRef}
      />

      <m.div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          // Respect the iOS keyboard inset — keeps the scroll list above the
          // floating keyboard when results overflow.
          paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)"
        }}
      >
        {isInit ? (
          <DefaultState recents={recents} onPick={(href) => goTo(href)} />
        ) : isLoading && results.length === 0 ? (
          <LoadingState />
        ) : results.length > 0 ? (
          <ResultsList
            value={debounced}
            results={results}
            total={data?.total ?? results.length}
            onPick={(href) => goTo(href)}
            onViewAll={handleViewAll}
          />
        ) : isEmpty ? (
          <EmptyState value={debounced} onViewAll={handleViewAll} />
        ) : null}
      </m.div>
    </>
  );
};

// ─── Header (input + close) ─────────────────────────────────────────────────

const Header = ({
  value,
  onChange,
  onClose,
  inputRef
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) => {
  const t = useTranslations("Controlbar");
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-border/20 px-4",
        "pt-[calc(env(safe-area-inset-top)+14px)] pb-3"
      )}
    >
      <SearchIcon
        aria-hidden="true"
        className="size-[18px] flex-none text-foreground/55"
        strokeWidth={1.5}
      />
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={onChange}
        placeholder={t("search")}
        aria-label={t("search")}
        className={cn(
          "flex-1 bg-transparent text-base font-light tracking-tight text-foreground",
          "placeholder:text-muted-foreground/40",
          "focus:outline-none"
        )}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label={t("closeSearch")}
        className={cn(
          "inline-flex size-9 flex-none items-center justify-center rounded-full",
          "touch-manipulation text-foreground/70",
          "transition-colors active:bg-foreground/[0.06]"
        )}
      >
        <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </button>
    </div>
  );
};

// ─── States ─────────────────────────────────────────────────────────────────

const DefaultState = ({
  recents,
  onPick
}: {
  recents: ReturnType<typeof useRecentsTracker>;
  onPick: (href: string) => void;
}) => {
  // Per project i18n rule: presentational primitives that need
  // translations are client components that call `useTranslations`
  // directly, not callers that thread a `t` prop through.
  const t = useTranslations("Controlbar");
  return (
    <>
      {recents.length > 0 && (
        <Section label="Recent">
          {recents.slice(0, 6).map((r) => (
            <Row
              key={r.path}
              onSelect={() => onPick(r.path)}
              leading={
                <Clock
                  className="size-[16px] text-foreground/55"
                  strokeWidth={1.5}
                />
              }
              title={r.label}
            />
          ))}
        </Section>
      )}
      <div className="flex flex-col items-center px-8 py-16 text-center">
        <p className="font-sans text-sm font-light text-foreground/65">
          {t("search")} essays, surf, music, members
        </p>
        <p className="mt-1 font-sans text-[11px] tracking-widest text-muted-foreground/55 uppercase">
          Type to begin
        </p>
      </div>
    </>
  );
};

const LoadingState = () => (
  <div className="px-3 pt-3" aria-hidden="true">
    {([62, 78, 50, 69, 55] as const).map((width) => (
      <div
        key={width}
        className="flex min-h-[3.25rem] items-center gap-3 rounded-xl px-3 py-3"
      >
        <div className="size-4 animate-pulse rounded-full bg-foreground/10" />
        <div
          className="h-2 animate-pulse rounded-full bg-foreground/10"
          style={{ width: `${width}%` }}
        />
      </div>
    ))}
  </div>
);

const ResultsList = ({
  value,
  results,
  total,
  onPick,
  onViewAll
}: {
  value: string;
  results: SearchAPIResponse["results"];
  total: number;
  onPick: (href: string) => void;
  onViewAll: () => void;
}) => (
  <>
    <Section label="Results">
      {results.map((r) => (
        <Row
          key={r.id}
          onSelect={() => onPick(r.url)}
          title={getResultLabel(r)}
          subtitle={getCollectionLabel(r.collection_type)}
          trailing={
            <ArrowRight
              aria-hidden="true"
              className="size-4 text-foreground/40"
              strokeWidth={1.5}
            />
          }
        />
      ))}
    </Section>
    <div className="px-3 pb-3">
      <button
        type="button"
        onClick={onViewAll}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-border/30 px-4 py-3",
          "font-sans text-[11px] tracking-widest text-foreground/75 uppercase",
          "touch-manipulation transition-colors active:bg-foreground/[0.05]"
        )}
      >
        {total > results.length
          ? `View all ${total} results for "${value}"`
          : `Open search page for "${value}"`}
        <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  </>
);

const EmptyState = ({
  value,
  onViewAll
}: {
  value: string;
  onViewAll: () => void;
}) => (
  <div className="flex flex-col items-center px-8 py-16 text-center">
    <span className="mb-4 font-sans text-5xl opacity-10">○</span>
    <p className="font-sans text-base font-light text-foreground/70">
      Nothing matched &ldquo;{value}&rdquo;
    </p>
    <button
      type="button"
      onClick={onViewAll}
      className={cn(
        "mt-6 font-sans text-[11px] tracking-widest uppercase",
        "text-foreground/55 underline underline-offset-4",
        "transition-colors active:text-foreground/85"
      )}
    >
      Try the full archive →
    </button>
  </div>
);

// ─── Atoms ──────────────────────────────────────────────────────────────────

const Section = ({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="pt-3">
    <div className="px-5 pb-2 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/55 uppercase">
      {label}
    </div>
    <ul className="flex flex-col px-2">{children}</ul>
  </div>
);

const Row = ({
  onSelect,
  leading,
  trailing,
  title,
  subtitle
}: {
  onSelect: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  title: string;
  subtitle?: string;
}) => (
  <li>
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left",
        "touch-manipulation transition-colors active:bg-foreground/[0.05]"
      )}
    >
      {leading && <span className="flex-none">{leading}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium tracking-tight text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="font-sans text-[10px] tracking-widest text-muted-foreground/55 uppercase">
            {subtitle}
          </span>
        )}
      </span>
      {trailing && <span className="flex-none">{trailing}</span>}
    </button>
  </li>
);
