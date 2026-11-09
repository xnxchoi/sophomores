"use client";

import { MotionPillButton, RP_Btn } from "@/hideaway/components/core/Button";
import { HA_CommandDialog as CommandDialog, HA_CommandGroup as CommandGroup, HA_CommandItem as CommandItem, HA_CommandList as CommandList, HA_CommandSeparator as CommandSeparator, HA_KMDInput as KMDInput } from "@/components/ui/command";
import { HA_DialogTitle as DialogTitle } from "@/components/ui/dialog";
import { HA_PopoverRoot as PopoverRoot, HA_PopoverTrigger as PopoverTrigger } from "@/components/ui/popover";
import {
  LinkedCommandItem,
  SearchAPIResult,
  SearchResultItem,
  useSearchQuery
} from "@/hideaway/components/UX/CommandKey/Commando";
import {
  DISCOVER_JUMPS,
  Jump,
  SETTINGS_JUMPS,
  SIGNED_IN_JUMPS,
  SIGNED_OUT_JUMPS
} from "@/hideaway/components/UX/CommandKey/jumps";
import { useRecentsTracker } from "@/hideaway/components/UX/CommandKey/useRecents";
import { useRPSession } from "@/hideaway/lib/auth/session/RP_SessionProvider";
import { cn } from "@/lib/utils";
import { useRPStore, useSearchBar } from "@/hideaway/providers/RP_Pro";
import "@/styles/__searchBar.scss";
import { useTheme } from "@/hideaway/providers/Theme";
import { setLocaleAction } from "@/app/(frontend)/(site)/(auth)/me/settings/_helpers/setLocale";
import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import { Command as CommandPrimitive, Command as Commands } from "cmdk";
import {
  ArrowRight,
  Clock,
  Compass,
  Copy,
  Globe,
  LogOut,
  Sparkles,
  Sun,
  UserSquare
} from "lucide-react";
import { useLocale } from "next-intl";
import { HTMLMotionProps, useMotionValue, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { nanoid } from "nanoid";
import { useTransitionRouter } from "next-transition-router";
import {
  ComponentPropsWithoutRef,
  Fragment,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react"; // ─── Constants ────────────────────────────────────────────────────────────────

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_POPUP_RESULTS = 5;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SearchSkeleton() {
  return (
    <div className="px-1 py-2" aria-hidden="true" role="presentation">
      {([62, 78, 50, 69] as const).map((width, i) => (
        <div
          key={i}
          className="flex min-h-[2.5rem] items-center gap-3 rounded-sm px-3.5 py-2.5 md:min-h-[2.5rem]"
          style={{ minHeight: "clamp(2.5rem, 6vw, 3rem)" }}
        >
          <div
            className="h-2 animate-pulse rounded-full bg-current opacity-[0.07]"
            style={{ width: `${width}%` }}
          />
          <div className="ml-auto h-2 w-10 shrink-0 animate-pulse rounded-full bg-current opacity-[0.07]" />
        </div>
      ))}
    </div>
  );
}

// ─── SearchBar ────────────────────────────────────────────────────────────────

export const SearchBar = ({
  className,
  style,
  ...props
}: HTMLMotionProps<"button">) => {
  const navIsOpen = useRPStore((store) => store.navIsOpen);
  const setValue = useSearchBar((l) => l.setValue);
  const value = useSearchBar((l) => l.value);
  const toggleTheme = useTheme((store) => store.toggleTheme);
  const theme = useTheme((store) => store.theme);
  const open = useSearchBar((l) => l.open);
  const setOpen = useSearchBar((l) => l.setOpen);
  const toggleOpen = useSearchBar((l) => l.toggleOpen);
  const inputRef = useRef<HTMLInputElement>(null!);
  const listRef = useRef<HTMLUListElement>(null!);
  const setNav = useRPStore((store) => store.setNavIsOpen);
  const user = useRPSession((l) => l);
  const uid = useId();
  const router = useTransitionRouter();
  const vValue = useMotionValue(value);
  useEffect(() => {
    vValue.set(value);
  }, [value, vValue]);
  // ── Search data ─────────────────────────────────────────────────────────────
  const { data, isFetching, debouncedValue } = useSearchQuery();
  const iFetching = useMotionValue(isFetching);
  useEffect(() => {
    iFetching.set(isFetching);
  }, [isFetching, iFetching]);
  const debouncedValued = useMotionValue(debouncedValue);
  useEffect(() => {
    debouncedValued.set(debouncedValue);
  }, [debouncedValued, debouncedValue]);

  const isDebouncing = useTransform(() => {
    const v = vValue.get();
    const dbd = debouncedValued.get();
    return v.length > 0 && v !== dbd;
  });
  const isLoading = useTransform(
    () =>
      isDebouncing.get() ||
      (debouncedValued.get().length > 0 && iFetching.get())
  );
  const [results, setResults] = useState<SearchAPIResult[]>([]);
  const resultsValue = useMotionValue(data?.results ?? []);
  useEffect(() => {
    const re = data?.results || [];
    re.length > 0 && setResults((r) => Array.from(new Set([...r, ...re])));
  }, [data]);
  const total = results.length;
  const isInit = value.length === 0;
  const hasResults = !isLoading && data?.results && data.results.length > 0;
  const isEmpty =
    !isLoading &&
    debouncedValue.length > 0 &&
    !isFetching &&
    data &&
    data.results.length === 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleClick = useCallback(() => toggleOpen(), [toggleOpen]);

  const handleViewAll = useCallback(() => {
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(debouncedValue)}`);
  }, [setOpen, router, debouncedValue]);

  const onValueChange = useCallback((v: string) => setValue(v), [setValue]);

  // ── Recents + Quick actions ──────────────────────────────────────────────────
  const recents = useRecentsTracker();
  const locale = useLocale();
  const handleSwitchLocale = useCallback(() => {
    const next = locale === "ko" ? "en" : "ko";
    setOpen(false);
    void setLocaleAction(next);
  }, [locale, setOpen]);
  const handleSignOut = useCallback(async () => {
    setOpen(false);
    await fetch("/api/users/logout", {
      method: "POST",
      headers: { "content-type": "application/json" }
    });
    location.reload();
  }, [setOpen]);
  const handleCopyLink = useCallback(async () => {
    setOpen(false);
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // permission denied or unsupported — silent
    }
  }, [setOpen]);
  const handleToggleTheme = useCallback(() => {
    setOpen(false);
    toggleTheme();
  }, [setOpen, toggleTheme]);

  // ── Global ⌘K shortcut ───────────────────────────────────────────────────────
  useEffect(() => {}, [toggleOpen]);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Open effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setNav(false);
      // slight delay lets the dialog animation settle before focusing
      focusTimeoutRef.current && clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, setNav]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    if (open) {
      document.addEventListener("keydown", handler);
    } else {
      setValue("");
      document.removeEventListener("keydown", handler);
    }
    return () => document.removeEventListener("keydown", handler);
  }, [open, setOpen, setValue]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Fragment>
      {/* ── Trigger button ── */}
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <MotionPillButton
              key={uid}
              data-tour="searchbar"
              className={cn(
                "rp_btn bt_sm gap-x-1 hover:border-current! hover:bg-transparent! data-[state=true]:border-current!",
                className
              )}
              {...(props as HTMLMotionProps<"button">)}
              onClick={handleClick}
              data-themed={"color,background-color,fill"}
              aria-controls="h-dropdown"
              aria-label="Open search"
              data-state={navIsOpen}
              style={{ ...style }}
            >
              <m.svg
                viewBox="0 0 24 24"
                data-themed={"fill"}
                width="10"
                height="10"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M17.908 14.755c3.918 0 6.092 1.654 6.092 4.745 0 2.755-1.745 4.5-4.5 4.5-3.092 0-4.745-2.173-4.745-6.092v-1.806h-5.51v1.806C9.245 21.826 7.592 24 4.5 24 1.745 24 0 22.255 0 19.5c0-3.092 2.173-4.745 6.092-4.745h1.806v-5.51H6.092C2.173 9.245 0 7.592 0 4.5 0 1.745 1.745 0 4.5 0c3.092 0 4.745 2.173 4.745 6.092v1.806h5.51V6.092C14.755 2.174 16.408 0 19.5 0 22.255 0 24 1.745 24 4.5c0 3.092-2.173 4.745-6.092 4.745h-1.806v5.51zM7.898 7.898V6.092c0-3.215-1.132-4.745-3.398-4.745-2.02 0-3.153 1.133-3.153 3.153 0 2.265 1.531 3.398 4.745 3.398zm0 8.204H6.092c-3.214 0-4.745 1.132-4.745 3.398 0 2.021 1.133 3.153 3.153 3.153 2.265 0 3.398-1.531 3.398-4.745zm1.347-1.347h5.51v-5.51h-5.51zm6.857-6.857h1.806c3.214 0 4.745-1.132 4.745-3.398 0-2.02-1.132-3.153-3.153-3.153-2.265 0-3.398 1.531-3.398 4.745zM22.653 19.5c0-2.265-1.531-3.398-4.745-3.398h-1.806v1.806c0 3.215 1.133 4.745 3.398 4.745 2.02 0 3.153-1.132 3.153-3.153"
                />
              </m.svg>
              {/* Mobile-only label: makes the purpose clear without hotkey knowledge */}
              <span className="sr-only hidden text-[11px] font-medium tracking-widest uppercase sm:not-sr-only sm:hidden">
                Search
              </span>
            </MotionPillButton>
          }
        />
        {/* Tooltip only meaningful on desktop (pointer devices) */}
        <Tooltip.Portal className={"z-300"}>
          <Tooltip.Positioner side="bottom" align="center" sideOffset={25}>
            <Tooltip.Popup
              className={
                "relative z-300 hidden max-w-[calc(100vw-24px)] origin-(--transform-origin) flex-col items-center overflow-hidden rounded-[6px] bg-muted-faded-background/50 px-3 py-2 text-sm leading-[1.4] whitespace-nowrap text-faded-foreground outline outline-1 outline-muted-faded-foreground/50 transition-[transform,scale,opacity] data-ending-style:scale-90 data-ending-style:opacity-0 data-instant:transition-none data-starting-style:scale-90 data-starting-style:opacity-0 md:flex dark:-outline-offset-1 dark:outline-muted-faded-foreground/90"
              }
            >
              ⌘ + K
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>

      {/* ── Dialog ── */}
      <CommandDialog open={open} onOpenChange={setOpen} key={"commando-dialog"}>
        <DialogTitle className="sr-only">Search</DialogTitle>

        {/* Input row + loading bar */}
        <m.div
          className={cn(
            "relative z-1 flex w-full items-center p-[8px]",
            isLoading && "loading"
          )}
          cmdk-rp-courier={""}
          data-slot="command-input-wrapper"
        >
          <KMDInput
            data-slot="command-input"
            ref={inputRef}
            className="flex h-[32px] w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:opacity-50 sm:h-[40px] sm:text-base"
            data-themed={"color, background-color"}
            onValueChange={onValueChange}
            value={value}
            placeholder="Search for anything…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </m.div>

        {/* List content — state machine */}
        <CommandList>
          {isInit ? (
            /* ── Default state ── */
            <>
              {recents.length > 0 && (
                <CommandGroup heading="Recent">
                  {recents.slice(0, 5).map((r) => (
                    <LinkedCommandItem
                      key={r.path}
                      href={r.path}
                      title={r.label}
                      value={`recent-${r.path}`}
                    >
                      <Clock className="!size-[1em] shrink-0 opacity-60" />
                    </LinkedCommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandGroup heading="Discover">
                {DISCOVER_JUMPS.map((j) => (
                  <JumpItem key={j.id} jump={j}>
                    <Compass className="!size-[1em] shrink-0 opacity-60" />
                  </JumpItem>
                ))}
              </CommandGroup>

              {user ? (
                <>
                  <CommandGroup heading="Yours">
                    {SIGNED_IN_JUMPS(user.slug ?? "").map((j) => (
                      <JumpItem key={j.id} jump={j}>
                        <UserSquare className="!size-[1em] shrink-0 opacity-60" />
                      </JumpItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Settings">
                    {SETTINGS_JUMPS.map((j) => (
                      <JumpItem key={j.id} jump={j}>
                        <Sparkles className="!size-[1em] shrink-0 opacity-60" />
                      </JumpItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Quick actions">
                    <CommandItem
                      value="action-theme"
                      onSelect={handleToggleTheme}
                    >
                      <Sun className="!size-[1em] shrink-0 opacity-60" />
                      <span className="flex-1 truncate">
                        Switch to {theme === "light" ? "dark" : "light"} mode
                      </span>
                    </CommandItem>
                    <CommandItem
                      value="action-locale"
                      onSelect={handleSwitchLocale}
                    >
                      <Globe className="!size-[1em] shrink-0 opacity-60" />
                      <span className="flex-1 truncate">
                        {locale === "ko"
                          ? "Switch to English"
                          : "한국어로 전환"}
                      </span>
                    </CommandItem>
                    <CommandItem value="action-copy" onSelect={handleCopyLink}>
                      <Copy className="!size-[1em] shrink-0 opacity-60" />
                      <span className="flex-1 truncate">Copy current link</span>
                    </CommandItem>
                    <CommandItem
                      value="action-signout"
                      onSelect={handleSignOut}
                    >
                      <LogOut className="!size-[1em] shrink-0 opacity-60" />
                      <span className="flex-1 truncate">Sign out</span>
                    </CommandItem>
                  </CommandGroup>
                </>
              ) : (
                <>
                  <CommandGroup heading="Get started">
                    {SIGNED_OUT_JUMPS.map((j) => (
                      <JumpItem key={j.id} jump={j}>
                        <Sparkles className="!size-[1em] shrink-0 opacity-60" />
                      </JumpItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Quick actions">
                    <CommandItem
                      value="action-theme"
                      onSelect={handleToggleTheme}
                    >
                      <Sun className="!size-[1em] shrink-0 opacity-60" />
                      <span className="flex-1 truncate">
                        Switch to {theme === "light" ? "dark" : "light"} mode
                      </span>
                    </CommandItem>
                    <CommandItem
                      value="action-locale"
                      onSelect={handleSwitchLocale}
                    >
                      <Globe className="!size-[1em] shrink-0 opacity-60" />
                      <span className="flex-1 truncate">
                        {locale === "ko"
                          ? "Switch to English"
                          : "한국어로 전환"}
                      </span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </>
          ) : isLoading ? (
            /* ── Loading state ── */
            <SearchSkeleton />
          ) : hasResults ? (
            /* ── Results state ── */
            <CommandGroup heading="Results">
              {data.results.slice(0, MAX_POPUP_RESULTS).map((result) => (
                <SearchResultItem key={result.id} result={result} />
              ))}
              <CommandSeparator />
              <CommandItem
                value={`__all__${debouncedValue}`}
                className="mt-0.5 justify-between text-sm text-faded-foreground/70"
                onSelect={handleViewAll}
              >
                <span>
                  {total > MAX_POPUP_RESULTS
                    ? `View all ${total} results for \u201c${debouncedValue}\u201d`
                    : `Open search page for \u201c${debouncedValue}\u201d`}
                </span>
                <ArrowRight className="ml-auto !size-4 shrink-0 opacity-60" />
              </CommandItem>
            </CommandGroup>
          ) : isEmpty ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
              <p className="text-sm text-faded-foreground/60">
                Nothing found for &ldquo;{debouncedValue}&rdquo;
              </p>
              <RP_Btn
                className="text-[11px] tracking-widest text-faded-foreground/40 uppercase underline underline-offset-4 transition-colors hover:text-faded-foreground/70"
                onClick={handleViewAll}
              >
                Try the full archive &rarr;
              </RP_Btn>
            </div>
          ) : null}
        </CommandList>

        {/* Footer: actions + theme toggle */}
        <div
          cmdk-raycast-footer=""
          className="absolute right-0 bottom-0 left-0 z-[56] flex w-full items-center gap-[4px] bg-faded-background/30 p-[8px]"
        >
          <SubCommand inputRef={inputRef} listRef={listRef} />
          <CommandItem
            value={"switch theme"}
            cmdk-action-trigger=""
            data-themed={"color, background-color"}
            onClick={toggleTheme}
            onSelect={toggleTheme}
          >
            To {theme === "light" ? "Dark" : "Light"} Mode
            <kbd>⌘</kbd>
            <kbd>H</kbd>
          </CommandItem>
        </div>
      </CommandDialog>
    </Fragment>
  );
};

// ─── JumpItem ─────────────────────────────────────────────────────────────────

function JumpItem({ jump, children }: { jump: Jump; children?: ReactNode }) {
  return (
    <LinkedCommandItem
      href={jump.href}
      title={jump.title}
      value={jump.id}
      type={jump.hint}
    >
      {children}
    </LinkedCommandItem>
  );
}

// ─── SubCommand ───────────────────────────────────────────────────────────────

function SubCommand({
  inputRef,
  listRef
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLElement | null>;
}) {
  const toggleSubMenuOpen = useSearchBar((l) => l.toggleSubMenuOpen);
  const subMenuOpen = useSearchBar((l) => l.subMenuOpen);
  const setValue = useSearchBar((l) => l.setValue);
  const user = useRPSession((l) => l);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "i" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSubMenuOpen();
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [toggleSubMenuOpen]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    if (subMenuOpen) {
      el.style.overflow = "hidden";
    } else {
      el.style.overflow = "";
    }
  }, [subMenuOpen, listRef]);

  const kv = useMemo(
    () => ({ b: `CV${nanoid()}`, u: `Find${nanoid()}`, a: `Login${nanoid()}` }),
    []
  );
  const keys = Object.keys(kv) as (keyof typeof kv)[];

  useEffect(() => {
    const dispatcher = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        for (const key of keys) {
          if (e.key === key) {
            e.preventDefault();
            setValue(kv[key]);
          }
        }
      }
    };
    document.addEventListener("keydown", dispatcher, { capture: true });
    return () =>
      document.removeEventListener("keydown", dispatcher, { capture: true });
  }, [keys, kv, setValue]);

  return (
    <PopoverRoot
      open={subMenuOpen}
      onOpenChange={toggleSubMenuOpen}
      modal={false}
    >
      <PopoverTrigger
        render={({ children, ...p }) => (
          <MotionPillButton
            {...(p as HTMLMotionProps<"button">)}
            cmdk-raycast-subcommand-trigger={""}
          >
            {children}
          </MotionPillButton>
        )}
        onClick={() => setValue("actions")}
        aria-expanded={subMenuOpen}
        value={"actions"}
        onSelect={toggleSubMenuOpen}
        data-themed={"color, background-color"}
      >
        Actions
        <kbd>⌘</kbd>
        <kbd>I</kbd>
      </PopoverTrigger>

      <Popover.Portal>
        <Popover.Positioner className={"z-250"} side="top" align="start">
          <Popover.Popup
            data-slot="popover-content"
            className={cn(
              "commando-submenu z-[250] w-fit border-none bg-transparent p-0 shadow-none backdrop-blur-none outline-none"
            )}
          >
            <Commands>
              <CommandList>
                <CommandGroup
                  heading={"Commands"}
                  data-state={subMenuOpen ? "open" : "closed"}
                >
                  {user && (
                    <>
                      <SubItem link={`/@${user.slug}`} shortcut="⌘ B">
                        My Profile
                      </SubItem>
                      <SubItem link={`/me/settings`} shortcut="⌘ U">
                        Settings
                      </SubItem>
                    </>
                  )}
                </CommandGroup>
              </CommandList>
              <CommandPrimitive.Input
                cmdk-input=""
                placeholder="Search for actions…"
                className="text-off-foreground placeholder:text-faded-foreground"
              />
            </Commands>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </PopoverRoot>
  );
}

// ─── SubItem ──────────────────────────────────────────────────────────────────

function SubItem({
  children,
  shortcut,
  link,
  ...props
}: {
  children: ReactNode;
  shortcut: string;
  link?: string;
} & ComponentPropsWithoutRef<typeof CommandPrimitive.Item>) {
  if (link)
    return (
      <LinkedSubItem shortcut={shortcut} link={link} {...props}>
        {children}
      </LinkedSubItem>
    );
  return (
    <CommandItem {...props}>
      {children}
      <div cmdk-raycast-submenu-shortcuts="">
        {shortcut.split(" ").map((key) => (
          <kbd key={key}>{key}</kbd>
        ))}
      </div>
    </CommandItem>
  );
}

const LinkedSubItem = ({
  link,
  shortcut,
  children,
  ...rest
}: {
  children: ReactNode;
  shortcut: string;
  link: string;
} & ComponentPropsWithoutRef<typeof CommandPrimitive.Item>) => {
  const router = useTransitionRouter();
  const selectCallback = useCallback(() => router.push(link), [link, router]);
  return (
    <CommandItem value={link} onSelect={selectCallback} {...rest}>
      {children}
      <div cmdk-raycast-submenu-shortcuts="">
        {shortcut.split(" ").map((key) => (
          <kbd key={key}>{key}</kbd>
        ))}
      </div>
    </CommandItem>
  );
};
