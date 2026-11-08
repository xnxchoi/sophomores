"use client";

import { UserAvatar } from "@/hideaway/components/auth";
import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hideaway/providers/Notifications";
import { useHasRadio } from "@/hideaway/providers/HideawayFM/hooks";
import { useRPStore } from "@/hideaway/providers/RP_Pro";
import { useTheme } from "@/hideaway/providers/Theme";
import type { ControlbarView } from "@/hideaway/stores/RP_Ui";
import { Bell, Moon, Search, Sun, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import * as m from "motion/react-m";
import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { CheckInButton } from "../Header/CheckInButton";
import { PlayPauseButton } from "@/hideaway/components/UX/TapePlayer";

/**
 * Bottom strip of the Vaul drawer on touch-mobile.
 *
 * Zones — left | center | right:
 *   Left:   PlayPauseButton (when a radio session is loaded) → falls back
 *           to ThemeButton when no radio. Toggles audio in place; never
 *           changes the controlbar view or opens the drawer.
 *   Center: Search pill — flips to the "search" view.
 *   Right:  Signed-in → NotificationsTrigger (bell + unread badge) +
 *           AccountTrigger (avatar). Notifications flips to the "notifications"
 *           view, account to the "account" view.
 *           Signed-out → CheckInButton (auth entry).
 *
 * The drawer's middle slot is view-driven via `controlbarView` in RP_Ui.
 * Tapping a view-trigger flips the view and opens the drawer; tapping the
 * active trigger collapses back to the default (nav links) view.
 */

const ZONE_BTN =
  "inline-flex size-12 items-center justify-center rounded-full touch-manipulation text-foreground/75 active:bg-foreground/[0.06] active:text-foreground transition-colors";
const ZONE_BTN_ACTIVE = "text-foreground bg-foreground/[0.06]";

export const Controlbar = () => {
  const t = useTranslations("Controlbar");
  const userId = useRPSession(useShallow((r) => r.id));
  const isSignedIn = Boolean(userId);
  const hasRadio = useHasRadio();

  const view = useRPStore(useShallow((s) => s.controlbarView));
  const toggleView = useRPStore((s) => s.toggleControlbarView);
  const setSideDrawerOpen = useRPStore((s) => s.setSideDrawerOpen);
  const sidebarOpen = useRPStore(useShallow((s) => s.sidebarOpen));
  const searchSheetOpen = useRPStore(useShallow((s) => s.searchSheetOpen));
  const toggleSearchSheetOpen = useRPStore((s) => s.toggleSearchSheetOpen);

  const select = useCallback(
    (next: ControlbarView) => {
      // If we're closed, opening to the requested view.
      // If we're open, tapping the active button collapses to default
      // (and stays open at default), tapping a different button swaps view.
      toggleView(next);
      if (!sidebarOpen) setSideDrawerOpen(true);
    },
    [toggleView, setSideDrawerOpen, sidebarOpen]
  );

  // Search has its own full-screen overlay (`SearchSheet`) — the legacy
  // in-drawer "search" controlbar view stays in the type union for
  // back-compat but is no longer triggered from here.
  const onSearch = useCallback(
    () => toggleSearchSheetOpen(),
    [toggleSearchSheetOpen]
  );

  return (
    <m.nav
      data-tour="controlbar"
      role="navigation"
      aria-label={t("account")}
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 16, opacity: 0 }}
      transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
      className={cn(
        "relative w-full flex-none",
        "border-t border-border/20",
        "bg-nav-background/95 backdrop-blur-xl",
        "pb-[calc(env(safe-area-inset-bottom)+12px)]"
      )}
    >
      <div className="mx-auto grid h-16 max-w-[640px] grid-cols-[auto_1fr_auto] items-center gap-2 px-3">
        <LeftZone hasRadio={hasRadio} themeLabel={t("theme")} />

        <button
          type="button"
          aria-label={t("search")}
          aria-pressed={searchSheetOpen}
          onClick={onSearch}
          className={cn(
            "group inline-flex h-12 items-center gap-3 rounded-full px-5",
            "border border-border/30",
            "touch-manipulation transition-colors",
            searchSheetOpen
              ? "bg-foreground/[0.09] text-foreground"
              : "bg-foreground/[0.04] text-foreground/65 active:bg-foreground/[0.08]"
          )}
        >
          <Search
            aria-hidden="true"
            className="size-[18px]"
            strokeWidth={1.5}
          />
          <span className="font-sans text-sm font-normal">{t("search")}</span>
        </button>

        {isSignedIn ? (
          <div className="flex items-center gap-1">
            <NotificationsTrigger
              active={view === "notifications"}
              onClick={() => select("notifications")}
              label={t("notifications")}
            />
            <AccountTrigger
              active={view === "account"}
              onClick={() => select("account")}
              label={t("account")}
            />
          </div>
        ) : (
          <CheckInButton className="size-12 rounded-full" />
        )}
      </div>
    </m.nav>
  );
};

const LeftZone = ({
  hasRadio,
  themeLabel
}: {
  hasRadio: boolean;
  themeLabel: string;
}) => {
  if (hasRadio) {
    // PlayPauseButton owns its own click → useRadioControls.toggle().
    // Wrapped in a 48×48 frame to match adjacent tap targets.
    return (
      <span className="inline-flex size-12 items-center justify-center">
        <PlayPauseButton size={44} />
      </span>
    );
  }
  return <ThemeButton label={themeLabel} />;
};

const ThemeButton = ({ label }: { label: string }) => {
  const toggleTheme = useTheme((s) => s.toggleTheme);
  const theme = useTheme((s) => s.theme);
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={toggleTheme}
      className={ZONE_BTN}
    >
      {isDark ? (
        <Sun aria-hidden="true" className="size-5" strokeWidth={1.5} />
      ) : (
        <Moon aria-hidden="true" className="size-5" strokeWidth={1.5} />
      )}
    </button>
  );
};

const NotificationsTrigger = ({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) => {
  const { notifications } = useNotifications();
  const unread = useMemo(
    () => notifications.filter((n) => !n.read && !n.dismissed).length,
    [notifications]
  );
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(ZONE_BTN, "relative", active && ZONE_BTN_ACTIVE)}
    >
      <Bell aria-hidden="true" className="size-5" strokeWidth={1.5} />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-2 right-2 inline-flex min-w-[18px] items-center justify-center",
            "rounded-full bg-foreground px-1 py-0.5",
            "font-sans text-[10px] leading-none text-background tabular-nums"
          )}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
};

const AccountTrigger = ({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) => {
  const sessionUser = useRPSession(
    useShallow((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      image: r.image,
      displayUsername: r.displayUsername
    }))
  );
  const hasAvatar = Boolean(sessionUser.image);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-full",
        "touch-manipulation transition-all active:scale-[0.96]",
        active ? "ring-2 ring-foreground/60" : "ring-1 ring-border/40"
      )}
    >
      {hasAvatar ? (
        <UserAvatar
          user={{
            id: sessionUser.id,
            name: sessionUser.name ?? sessionUser.displayUsername ?? "",
            email: sessionUser.email ?? "",
            image: sessionUser.image ?? undefined
          }}
          className="size-9 rounded-full"
        />
      ) : (
        <UserRound
          aria-hidden="true"
          className="size-5 text-foreground/75"
          strokeWidth={1.5}
        />
      )}
    </button>
  );
};
