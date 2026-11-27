"use client";
import { Button } from "@/components/core/Button";

import { useTranslations } from "next-intl";
import type { Variants } from "motion/react";
import * as m from "motion/react-m";
import { ArrowRight, Check, Settings as SettingsIcon, UserRound, UserRoundPlus } from "lucide-react";
import { Suspense, use, useMemo, type ReactNode } from "react";
import type { HeaderMemberState } from "@/lib/member-auth/header-state.server";
import { Link } from "@/components/core/Link/Link";
import { useNotificationInbox } from "@/components/notifications/notification-inbox";
import { menuLinks } from "@/lib/content/menu";
import type { Notification } from "@/lib/content/slots";
import { cn } from "@/lib/utils";
import { useRPStore } from "@/providers/RP_Pro";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { reachableHref } from "@/lib/content/essays";

// The Hideaway's per-view stagger (Controlbar/views.tsx, SideDrawer/index.tsx). Low and quick: the drawer
// itself carries the larger opening motion.
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.06 } }
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.15, duration: 0.4 } }
};
const defaultLinksContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.08 } }
};
const defaultLinksItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.18, duration: 0.5 } }
};

/** Choosing anything in a view closes the drawer, back at the default view. */
function useCloseDrawer() {
  const setView = useRPStore((state) => state.setControlbarView);
  const setSideDrawerOpen = useRPStore((state) => state.setSideDrawerOpen);
  return () => {
    setView("default");
    setSideDrawerOpen(false);
  };
}

/**
 * The drawer's default view: the site menu's links (lib/content/menu), in The Hideaway's 23px list. Each
 * row is a 48px target; with no gap between rows that keeps The Hideaway's 48px pitch (23px line + 20px gap).
 */
export function DefaultLinks() {
  const t = useTranslations("Customer.navigation");
  const close = useCloseDrawer();
  return (
    <m.div
      variants={defaultLinksContainer}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      className="flex h-full flex-col overflow-y-auto px-8 pt-4 pb-8 font-sans text-[23px]"
    >
      {menuLinks.map((link) => (
        <m.div key={link.href} variants={defaultLinksItem}>
          <Link href={link.href} onClick={close} className="group/focus flex min-h-12 items-center">
            <FocusShape className="group-focus-visible/focus:outline-current">{t(link.label)}</FocusShape>
          </Link>
        </m.div>
      ))}
    </m.div>
  );
}

export function NotificationsView({ notifications }: { notifications: Notification[] }) {
  const t = useTranslations("Customer.components_shell_header_panels");
  const list = useTranslations("Interface.notifications");
  const close = useCloseDrawer();
  const inbox = useNotificationInbox(notifications);
  const items = useMemo(
    () =>
      [...inbox.notifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [inbox.notifications]
  );

  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col"
    >
      <m.div variants={itemVariants} className="flex items-center justify-between px-6 pt-2 pb-3">
        <span className="font-sans text-[11px] tracking-widest text-foreground/55 uppercase">{t("notifications")}</span>
      </m.div>

      {items.length === 0 ? (
        <m.div variants={itemVariants} className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <span aria-hidden="true" className="mb-3 font-sans text-3xl opacity-15">
            ○
          </span>
          <p className="font-sans text-sm font-light text-foreground/70">{list("empty")}</p>
        </m.div>
      ) : (
        <m.ul className="flex-1 overflow-y-auto px-3 pb-4">
          {items.map((item) => {
            // A row whose link leads into a section the site has switched off (src/lib/content/essays.ts) shows as text.
            const href = reachableHref(item.href || "/essays");
            const copy = (
              <>
                <span
                  aria-hidden="true"
                  className={cn("mt-2 inline-block size-2 flex-none rounded-full", item.read ? "bg-foreground/15" : "bg-foreground")}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium tracking-tight text-foreground">{item.title}</span>
                  {item.body && (
                    <span className="line-clamp-2 font-sans text-[13px] leading-snug text-foreground/65">{item.body}</span>
                  )}
                </span>
              </>
            );
            return (
            <m.li key={item.id} variants={itemVariants} className="flex items-start">
              {href ? (
                <Link
                  href={href}
                  onClick={close}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-3 py-3 touch-manipulation transition-colors focus-visible:bg-foreground/[0.05] active:bg-foreground/[0.05]"
                >
                  {copy}
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3">{copy}</div>
              )}
              {/* The site inbox marks one at a time (as the header's list does); The Hideaway's Mark all has
                  no counterpart there. */}
              {inbox.connected && !item.read && (
                <Button variant="bare"
                  type="button"
                  aria-label={list("markRead")}
                  onClick={() => inbox.markRead(item.id)}
                  className="group/focus inline-flex size-12 flex-none items-center justify-center rounded-full text-foreground/70 touch-manipulation transition-colors active:bg-foreground/[0.06]"
                >
                  <FocusShape className="flex group-focus-visible/focus:outline-current"><Check aria-hidden="true" className="size-4" strokeWidth={1.5} /></FocusShape>
                </Button>
              )}
            </m.li>
            );
          })}
        </m.ul>
      )}

      {/* Where the header's list sends See All today; hidden while that section is switched off. */}
      {reachableHref("/essays") && (
        <m.div variants={itemVariants} className="px-3 pb-3">
          <MoreLink href="/essays" label={t("seeAll")} onSelect={close} />
        </m.div>
      )}
    </m.div>
  );
}

/**
 * Account links. The header's member state says signed in or not and carries no profile, so The
 * Hideaway's avatar, name and email header has nothing to show, and signing out is the auth branch's.
 * A signed-in visitor whose registration isn't finished also gets Continue registration (/account, where it
 * continues); /me has no way back to it (Review-B).
 */
export function AccountView({ member }: { member?: Promise<HeaderMemberState> }) {
  const rows = useTranslations("Customer.panelRows");
  const close = useCloseDrawer();
  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col"
    >
      <m.ul className="flex-1 px-3 pt-3">
        <m.li variants={itemVariants}>
          <AccountRow href="/me" icon={<UserRound className="size-[18px]" strokeWidth={1.5} />} label={rows("profile")} onSelect={close} />
        </m.li>
        <m.li variants={itemVariants}>
          <AccountRow href="/me/settings" icon={<SettingsIcon className="size-[18px]" strokeWidth={1.5} />} label={rows("settings")} onSelect={close} />
        </m.li>
        {member ? (
          <Suspense fallback={null}>
            <ContinueRegistrationRow member={member} onSelect={close} />
          </Suspense>
        ) : null}
      </m.ul>
    </m.div>
  );
}

function ContinueRegistrationRow({ member, onSelect }: { member: Promise<HeaderMemberState>; onSelect: () => void }) {
  const auth = useTranslations("MemberAuth");
  const state = use(member);
  if (state.state !== "signed-in" || state.member) return null;
  return (
    <m.li variants={itemVariants}>
      <AccountRow href="/account" icon={<UserRoundPlus className="size-[18px]" strokeWidth={1.5} />} label={auth("continueRegistration")} onSelect={onSelect} />
    </m.li>
  );
}

function AccountRow({ href, icon, label, onSelect }: { href: string; icon: ReactNode; label: string; onSelect: () => void }) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-normal text-foreground/85 touch-manipulation transition-colors focus-visible:bg-foreground/[0.05] active:bg-foreground/[0.05]"
    >
      <span aria-hidden="true" className="text-foreground/65">
        {icon}
      </span>
      {label}
    </Link>
  );
}

function MoreLink({ href, label, onSelect }: { href: string; label: string; onSelect: () => void }) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex items-center justify-between rounded-xl border border-border/30 px-4 py-3 font-sans text-[11px] tracking-widest text-foreground/75 uppercase touch-manipulation transition-colors active:bg-foreground/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      {label}
      <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
    </Link>
  );
}
