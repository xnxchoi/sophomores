"use client";

import { Link, MotionLink } from "@/components/core/Link/Link";
import {
  getCollectionLabel,
  getResultLabel,
  useSearchQuery
} from "@/components/UX/CommandKey/Commando";
import { signOut } from "@/lib/auth/client";
import { UserAvatar } from "@/components/auth";
import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import { cn } from "@/lib/utils";
import { useHumanTime } from "@/hooks/useLocaleDate";
import { useNotifications } from "@/providers/Notifications";
import { useRPStore, useSearchBar } from "@/providers/RP_Pro";
import {
  ArrowRight,
  Bookmark,
  CheckCheck,
  LogOut,
  Search as SearchIcon,
  Settings as SettingsIcon,
  UserRound
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Variants } from "motion/react";
import * as m from "motion/react-m";
import { type ChangeEvent, useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/shallow";

// Motion variants — McAlpine-style stagger reveal, applied per-view container.
// Keep low-amplitude and quick; the drawer itself does the heavier opening motion.
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.06 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", bounce: 0.15, duration: 0.4 }
  }
};

// ─── Notifications ──────────────────────────────────────────────────────────

export const NotificationsView = () => {
  const t = useTranslations("Controlbar");
  const setView = useRPStore((s) => s.setControlbarView);
  const setSideDrawerOpen = useRPStore((s) => s.setSideDrawerOpen);
  const { notifications, setAllRead } = useNotifications();
  const items = useMemo(
    () =>
      notifications
        .filter((n) => !n.dismissed)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 8),
    [notifications]
  );
  const unread = items.filter((n) => !n.read).length;

  const closeOnSelect = useCallback(() => {
    setView("default");
    setSideDrawerOpen(false);
  }, [setSideDrawerOpen, setView]);

  return (
    <m.div
      key="view-notifications"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col"
    >
      <m.div
        variants={itemVariants}
        className="flex items-center justify-between px-6 pt-2 pb-3"
      >
        <span className="font-sans text-[11px] tracking-widest text-foreground/55 uppercase">
          {t("notifications")}
        </span>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => setAllRead()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
              "font-sans text-[10px] tracking-widest uppercase",
              "text-foreground/70 active:bg-foreground/[0.06]",
              "touch-manipulation transition-colors"
            )}
          >
            <CheckCheck className="size-3.5" strokeWidth={1.5} />
            Mark all
          </button>
        )}
      </m.div>

      {items.length === 0 ? (
        <m.div
          variants={itemVariants}
          className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"
        >
          <span className="mb-3 font-sans text-3xl opacity-15">○</span>
          <p className="font-sans text-sm font-light text-foreground/70">
            No notifications yet
          </p>
          <p className="mt-1 font-sans text-[11px] text-muted-foreground/55">
            Replies and mentions appear here
          </p>
        </m.div>
      ) : (
        <m.ul className="flex-1 overflow-y-auto px-3 pb-4">
          {items.map((n) => (
            <m.li key={n.createdAt + (n.title || "")} variants={itemVariants}>
              <NotificationRow
                title={n.title || "Notification"}
                content={n.content || ""}
                href={n.actionLink?.url || "/me/notifications"}
                read={!!n.read}
                createdAt={n.createdAt as unknown as string}
                onSelect={closeOnSelect}
              />
            </m.li>
          ))}
        </m.ul>
      )}

      <m.div variants={itemVariants} className="px-3 pb-3">
        <MoreLink
          href="/me/notifications"
          label="View all notifications"
          onSelect={closeOnSelect}
        />
      </m.div>
    </m.div>
  );
};

const NotificationRow = ({
  title,
  content,
  href,
  read,
  createdAt,
  onSelect
}: {
  title: string;
  content: string;
  href: string;
  read: boolean;
  createdAt: string;
  onSelect: () => void;
}) => {
  const when = useHumanTime(createdAt);
  return (
    <Link
      href={href}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-xl px-3 py-3",
        "touch-manipulation transition-colors",
        "active:bg-foreground/[0.05]"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-2 inline-block size-2 flex-none rounded-full",
          read ? "bg-foreground/15" : "bg-foreground"
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium tracking-tight text-foreground">
          {title}
        </span>
        {content && (
          <span className="line-clamp-2 font-sans text-[13px] leading-snug text-foreground/65">
            {content}
          </span>
        )}
        <span className="mt-0.5 font-sans text-[10px] text-muted-foreground/55">
          {when}
        </span>
      </span>
    </Link>
  );
};

// ─── Search ─────────────────────────────────────────────────────────────────

export const SearchView = () => {
  const t = useTranslations("Controlbar");
  const setView = useRPStore((s) => s.setControlbarView);
  const setSideDrawerOpen = useRPStore((s) => s.setSideDrawerOpen);

  const value = useSearchBar((l) => l.value);
  const setValue = useSearchBar((l) => l.setValue);
  const setOpen = useSearchBar((l) => l.setOpen);

  // Drive useSearchQuery — it gates on (open && value.length > 0).
  useEffect(() => {
    setOpen(true);
    return () => {
      setOpen(false);
    };
  }, [setOpen]);

  const { data, isLoading } = useSearchQuery();

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    [setValue]
  );

  const results = useMemo(() => (data?.results ?? []).slice(0, 10), [data]);

  const closeOnSelect = useCallback(() => {
    setView("default");
    setSideDrawerOpen(false);
  }, [setSideDrawerOpen, setView]);

  return (
    <m.div
      key="view-search"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col"
    >
      <m.div
        variants={itemVariants}
        className="flex items-center gap-3 border-b border-border/20 px-5 pt-2 pb-3"
      >
        <SearchIcon
          aria-hidden="true"
          className="size-4 text-foreground/55"
          strokeWidth={1.5}
        />
        <input
          autoFocus
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={onChange}
          placeholder={t("search")}
          className={cn(
            "flex-1 bg-transparent text-base font-light tracking-tight",
            "placeholder:text-muted-foreground/40",
            "focus:outline-none"
          )}
          aria-label={t("search")}
        />
      </m.div>

      {value.length === 0 ? (
        <m.div
          variants={itemVariants}
          className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"
        >
          <p className="font-sans text-sm font-light text-foreground/65">
            Search essays, surf, music, members
          </p>
          <p className="mt-1 font-sans text-[11px] text-muted-foreground/55">
            Type to begin
          </p>
        </m.div>
      ) : isLoading && results.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <span className="font-sans text-[11px] tracking-widest text-muted-foreground/55 uppercase">
            …searching
          </span>
        </div>
      ) : results.length === 0 ? (
        <m.div
          variants={itemVariants}
          className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"
        >
          <p className="font-sans text-sm font-light text-foreground/70">
            Nothing matched “{value}”
          </p>
        </m.div>
      ) : (
        <m.ul className="flex-1 overflow-y-auto px-3 py-2">
          {results.map((r) => (
            <m.li key={r.id} variants={itemVariants}>
              <SearchResultRow
                href={r.url}
                title={getResultLabel(r)}
                type={getCollectionLabel(r.collection_type)}
                onSelect={closeOnSelect}
              />
            </m.li>
          ))}
        </m.ul>
      )}

      {value.length > 0 && (results.length > 0 || !isLoading) && (
        <m.div variants={itemVariants} className="px-3 pb-3">
          <MoreLink
            href={`/search?q=${encodeURIComponent(value)}`}
            label={`More results for "${value}"`}
            onSelect={closeOnSelect}
          />
        </m.div>
      )}
    </m.div>
  );
};

const SearchResultRow = ({
  href,
  title,
  type,
  onSelect
}: {
  href: string;
  title: string;
  type?: string;
  onSelect: () => void;
}) => (
  <Link
    href={href}
    onClick={onSelect}
    className={cn(
      "flex items-center gap-3 rounded-xl px-3 py-3",
      "touch-manipulation transition-colors active:bg-foreground/[0.05]"
    )}
  >
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate text-sm font-medium tracking-tight text-foreground">
        {title}
      </span>
      {type && (
        <span className="font-sans text-[10px] tracking-widest text-muted-foreground/55 uppercase">
          {type}
        </span>
      )}
    </span>
    <ArrowRight
      aria-hidden="true"
      className="size-4 flex-none text-foreground/40"
      strokeWidth={1.5}
    />
  </Link>
);

// ─── Account ────────────────────────────────────────────────────────────────

export const AccountView = () => {
  const t = useTranslations("Controlbar");
  const setView = useRPStore((s) => s.setControlbarView);
  const setSideDrawerOpen = useRPStore((s) => s.setSideDrawerOpen);

  const sessionUser = useRPSession(
    useShallow((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      image: r.image,
      username: r.username,
      displayUsername: r.displayUsername
    }))
  );

  const close = useCallback(() => {
    setView("default");
    setSideDrawerOpen(false);
  }, [setSideDrawerOpen, setView]);

  const onSignOut = useCallback(async () => {
    close();
    await signOut();
  }, [close]);

  const avatarUser = useMemo(
    () => ({
      id: sessionUser.id,
      name: sessionUser.name ?? sessionUser.displayUsername ?? "",
      email: sessionUser.email ?? "",
      image: sessionUser.image ?? undefined
    }),
    [sessionUser]
  );

  const profileHref = sessionUser.username
    ? `/@${sessionUser.username}`
    : "/me";

  return (
    <m.div
      key="view-account"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col"
    >
      <m.header
        variants={itemVariants}
        className="flex items-center gap-3 px-6 pt-3 pb-5"
      >
        <UserAvatar
          user={avatarUser}
          className="size-12 rounded-full ring-1 ring-border/30"
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-medium tracking-tight text-foreground">
            {avatarUser.name || "—"}
          </span>
          {avatarUser.email && (
            <span className="truncate font-sans text-[11px] text-muted-foreground/65">
              {avatarUser.email}
            </span>
          )}
        </div>
      </m.header>

      <m.ul className="flex-1 px-3">
        <m.li variants={itemVariants}>
          <AccountRow
            href={profileHref}
            icon={<UserRound className="size-[18px]" strokeWidth={1.5} />}
            label={t("profile")}
            onSelect={close}
          />
        </m.li>
        <m.li variants={itemVariants}>
          <AccountRow
            href="/me/bookmarks"
            icon={<Bookmark className="size-[18px]" strokeWidth={1.5} />}
            label="Bookmarks"
            onSelect={close}
          />
        </m.li>
        <m.li variants={itemVariants}>
          <AccountRow
            href="/me/settings"
            icon={<SettingsIcon className="size-[18px]" strokeWidth={1.5} />}
            label={t("settings")}
            onSelect={close}
          />
        </m.li>
        <m.li variants={itemVariants}>
          <button
            type="button"
            onClick={onSignOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3.5",
              "text-left text-sm font-normal text-foreground/85",
              "touch-manipulation transition-colors active:bg-foreground/[0.05]"
            )}
          >
            <LogOut
              aria-hidden="true"
              className="size-[18px] text-foreground/65"
              strokeWidth={1.5}
            />
            {t("signOut")}
          </button>
        </m.li>
      </m.ul>
    </m.div>
  );
};

const AccountRow = ({
  href,
  icon,
  label,
  onSelect
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) => (
  <Link
    href={href}
    onClick={onSelect}
    className={cn(
      "flex items-center gap-3 rounded-xl px-4 py-3.5",
      "text-sm font-normal text-foreground/85",
      "touch-manipulation transition-colors active:bg-foreground/[0.05]"
    )}
  >
    <span aria-hidden="true" className="text-foreground/65">
      {icon}
    </span>
    {label}
  </Link>
);

// ─── Shared ─────────────────────────────────────────────────────────────────

const MoreLink = ({
  href,
  label,
  onSelect
}: {
  href: string;
  label: string;
  onSelect: () => void;
}) => (
  <MotionLink
    href={href}
    onClick={onSelect}
    className={cn(
      "flex items-center justify-between rounded-xl border border-border/30 px-4 py-3",
      "font-sans text-[11px] tracking-widest text-foreground/75 uppercase",
      "touch-manipulation transition-colors active:bg-foreground/[0.05]"
    )}
  >
    {label}
    <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
  </MotionLink>
);
