"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { MemberClient } from "../../lib/member-auth/client";
import type { MemberCapabilities } from "../../lib/member-auth/contracts";
import { MemberAccountPage } from "../Authentication/member-auth/account-study";
import { subscribeVisibility } from "@/utils/browser/visibility";
import {
  clearTicketReturnIntent,
  readTicketSelectionDraft,
  TICKET_SELECTION_DRAFT_KEY,
  type TicketDraftResult,
  type TicketSelectionDraft
} from "../../lib/tickets/selection-draft";
import { Link } from "@/components/core/Link/Link";

/** A ticket intent offers navigation only; the account view alone owns membership. */
export function TicketAccountEntry({
  client,
  initialFlow,
  initialCapabilities,
  showAccountNavigation = false
}: {
  client?: MemberClient;
  initialFlow?: "login" | "signup";
  initialCapabilities?: Readonly<MemberCapabilities>;
  showAccountNavigation?: boolean;
} = {}) {
  const [draft, setDraft] = useState<TicketSelectionDraft | null>(null);
  const [storageIssue, setStorageIssue] = useState(false);

  useEffect(() => {
    let expiryTimer: number | undefined;
    const refresh = () => {
      window.clearTimeout(expiryTimer);
      let result: TicketDraftResult;
      try {
        result = readTicketSelectionDraft(window.localStorage);
      } catch {
        result = { status: "unavailable" };
      }
      const active =
        result.status === "ready" && result.draft.returnToTickets
          ? result.draft
          : null;
      setDraft(active);
      if (active) {
        expiryTimer = window.setTimeout(
          refresh,
          Math.max(1, active.expiresAt - Date.now())
        );
      }
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === null || event.key === TICKET_SELECTION_DRAFT_KEY)
        refresh();
    };
    const visibilityChanged = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    refresh();
    window.addEventListener("storage", storageChanged);
    window.addEventListener("focus", refresh);
    const unsubscribe = subscribeVisibility(visibilityChanged);
    return () => {
      window.clearTimeout(expiryTimer);
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener("focus", refresh);
      unsubscribe();
    };
  }, []);

  function returnToTickets() {
    let result: TicketDraftResult;
    try {
      result = clearTicketReturnIntent(window.localStorage);
    } catch {
      result = { status: "unavailable" };
    }
    setStorageIssue(result.status === "unavailable");
    // This is always a safe fixed link. A storage failure must not trap navigation.
    if (result.status !== "unavailable") setDraft(null);
  }

  return (
    // The account is a normal page (owner, 24 Nov); a signed-out visitor never gets here (/account redirects to /sign-in).
    <MemberAccountPage
      client={client}
      initialFlow={initialFlow ?? "login"}
      initialCapabilities={initialCapabilities}
      authenticatedAction={showAccountNavigation ? <AccountNavigation /> : undefined}
      completionAction={
        draft ? (
          <TicketReturnAction
            onReturn={returnToTickets}
            storageIssue={storageIssue}
          />
        ) : undefined
      }
    />
  );
}

/** Fixed navigation only; each destination retains its own access policy. */
function AccountNavigation() {
  const t = useTranslations("Customer.components_tickets_ticket_account_entry");
  const navigation = useTranslations("Customer.navigation");
  const orders = useTranslations("Customer.app_site_me_orders_page");
  const settings = useTranslations("Customer.app_site_me_settings_page_client");
  return <div className="mt-5 grid gap-3 border-t border-neutral-800 pt-5">
    <Link href="/me" prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-neutral-100 px-4 py-3 text-center text-sm font-medium text-neutral-950 transition-colors duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100">{navigation("account")}</Link>
    <Link href="/me/orders" prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-neutral-100 px-4 py-3 text-center text-sm font-medium text-neutral-950 transition-colors duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100">{orders("title")}</Link>
    <Link href="/me/settings" prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-neutral-100 px-4 py-3 text-center text-sm font-medium text-neutral-950 transition-colors duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100">{settings("settings")}</Link>
    <Link href="/me/settings/account" prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-neutral-100 px-4 py-3 text-center text-sm font-medium text-neutral-950 transition-colors duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100">{t("returnToAccountDetails")}</Link>
    <Link href="/help" prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neutral-700 px-4 py-3 text-center text-sm font-medium text-neutral-100 transition-colors duration-200 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100">{t("returnToHelp")}</Link>
  </div>;
}

function TicketReturnAction({
  onReturn,
  storageIssue
}: {
  onReturn: () => void;
  storageIssue: boolean;
}) {
  const t = useTranslations("Customer.components_tickets_ticket_account_entry");
  return (
    <>
      {/* A fixed ordinary link works across provider returns without widening callbacks. */}
      <Link
        href="/shop"
        onClick={onReturn}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-neutral-100 px-4 [font-family:system-ui] text-sm font-medium text-neutral-950 transition-colors duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100"
      >
        {t("returnToShop")}
      </Link>
      {storageIssue && (
        <p
          role="status"
          className="mt-2 text-[13px] leading-5 text-neutral-400"
        >
          {t("selectionUpdateUnavailable")}
        </p>
      )}
    </>
  );
}
