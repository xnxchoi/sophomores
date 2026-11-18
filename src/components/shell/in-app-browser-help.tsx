"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { XIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDeviceInfo, useRPStore } from "@/providers/RP_Pro";

export function InAppBrowserHelp() {
  const t = useTranslations("Customer.inAppBrowserHelp");
  const browser = useDeviceInfo((state) => state.browser);
  const menuOpen = useRPStore((state) => state.navIsOpen);
  const pathname = usePathname();
  const invitation = pathname === "/shop/invitations/claim";
  const titleID = useId();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ path: string | null; status: "copied" | "failed" } | null>(null);
  const status = result?.path === pathname ? result.status : null;

  async function copyLink() {
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      // Read only on the explicit action; never persist or log a private invitation URL.
      await navigator.clipboard.writeText(window.location.href);
      setResult({ path: pathname, status: "copied" });
    } catch {
      setResult({ path: pathname, status: "failed" });
    } finally {
      setBusy(false);
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
        <Button type="button" variant="ghost" aria-label={t("dismiss")} onClick={() => setDismissed(true)} className="size-12 rounded-full">
          <XIcon aria-hidden="true" className="size-5" />
        </Button>
        <div>
          <h2 id={titleID} className="pt-3 font-heading text-base leading-snug">{t("title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{invitation ? t("invitationDescription") : t("description")}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("privacy")}</p>
          {!invitation && <><Button type="button" variant="outline" disabled={busy} onClick={copyLink} className="mt-5 min-h-12 w-full rounded-full px-4 text-sm">
            {busy ? t("copying") : t("copy")}
          </Button>
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-xs leading-relaxed text-muted-foreground">
            {status === "copied" ? t("copied") : status === "failed" ? t("failed") : null}
          </p></>}
        </div>
      </div>
    </m.aside>}
  </AnimatePresence>;
}
