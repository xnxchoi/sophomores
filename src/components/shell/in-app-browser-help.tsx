"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { XIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDeviceInfo, useRPStore } from "@/providers/RP_Pro";

type CopyStatus = "copying" | "copied" | "failed";

function CopyPageLink({ status, onCopy }: { status: CopyStatus | null; onCopy: () => void }) {
  const t = useTranslations("Customer.inAppBrowserHelp");
  return <>
    <Button type="button" variant="outline" aria-disabled={status === "copying"} onClick={onCopy} className="mt-5 min-h-12 w-full rounded-full px-4 text-sm aria-disabled:cursor-default aria-disabled:opacity-50">
      {status === "copying" ? t("copying") : t("copy")}
    </Button>
    <p role="status" aria-live="polite" className="mt-3 min-h-5 text-xs leading-relaxed text-muted-foreground">
      {status === "copied" ? t("copied") : status === "failed" ? t("failed") : null}
    </p>
  </>;
}

export function InAppBrowserHelp() {
  const t = useTranslations("Customer.inAppBrowserHelp");
  const browser = useDeviceInfo((state) => state.browser);
  const menuOpen = useRPStore((state) => state.navIsOpen);
  const pathname = usePathname();
  const invitation = pathname === "/shop/invitations/claim";
  const titleID = useId();
  const [dismissed, setDismissed] = useState(false);
  // The copy result lives here, above the panel, so hiding the panel for the menu keeps it. It belongs to
  // one page path: a new path clears it. A query or hash change on the same path keeps the last receipt,
  // which still describes the link that was copied; the button always copies the current address. Only
  // the latest attempt may settle, so an older copy finishing late never overwrites a newer one.
  const [copy, setCopy] = useState<{ attempt: number; path: string | null; status: CopyStatus } | null>(null);
  const attempts = useRef(0);
  const [copyPath, setCopyPath] = useState(pathname);
  if (copyPath !== pathname) {
    setCopyPath(pathname);
    setCopy(null);
  }
  const copyStatus = copy?.path === pathname ? copy.status : null;

  // Dismissing takes the focused button away; focus moves to the Menu button, which stays (F12), or on a
  // page without it (home's teaser, whose Menu sits in a nav) to the first header or nav control.
  function dismiss() {
    // The first one that is actually shown: home's chapter nav keeps desktop links hidden on phones.
    const next =
      document.getElementById("primary__nav") ??
      Array.from(document.querySelectorAll<HTMLElement>("header button, nav button, header a[href], nav a[href]")).find(
        (control) => control.checkVisibility()
      );
    next?.focus({ preventScroll: true });
    setDismissed(true);
  }

  async function copyLink() {
    if (copyStatus === "copying") return;
    const path = pathname;
    const attempt = ++attempts.current;
    const settle = (status: CopyStatus) =>
      setCopy((current) => (current?.attempt === attempt ? { attempt, path, status } : current));
    setCopy({ attempt, path, status: "copying" });
    try {
      // Read only on the explicit action; never persist or log a private invitation URL.
      await navigator.clipboard.writeText(window.location.href);
      settle("copied");
    } catch {
      settle("failed");
    }
  }

  return <AnimatePresence>
    {browser.inApp && !dismissed && !menuOpen && <m.aside
      key="in-app-browser-help"
      aria-labelledby={titleID}
      data-lenis-prevent
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-30 max-h-[calc(100svh-6rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-5 text-card-foreground shadow-lg sm:left-auto sm:w-96 sm:p-6"
    >
      <div className="grid grid-cols-[3rem_1fr] items-start gap-3">
        <Button type="button" variant="ghost" aria-label={t("dismiss")} onClick={dismiss} className="size-12 rounded-full">
          <XIcon aria-hidden="true" className="size-5" />
        </Button>
        <div>
          <h2 id={titleID} className="pt-3 text-base leading-snug">{t("title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{invitation ? t("invitationDescription") : t("description")}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("privacy")}</p>
          {!invitation && <CopyPageLink status={copyStatus} onCopy={copyLink} />}
        </div>
      </div>
    </m.aside>}
  </AnimatePresence>;
}
