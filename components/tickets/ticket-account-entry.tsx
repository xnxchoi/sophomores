"use client";

import { useEffect, useState } from "react";
import type { MemberClient } from "../../lib/member-auth/client";
import type { MemberCapabilities } from "../../lib/member-auth/contracts";
import { MemberAccountStudy } from "../Authentication/member-auth/account-study";
import { subscribeVisibility } from "../../utils/browser/visibility";
import {
  clearTicketReturnIntent,
  readTicketSelectionDraft,
  TICKET_SELECTION_DRAFT_KEY,
  type TicketDraftResult,
  type TicketSelectionDraft
} from "../../lib/tickets/selection-draft";

/** A ticket intent offers navigation only; the account view alone owns membership. */
export function TicketAccountEntry({
  client,
  initialFlow,
  initialCapabilities
}: { client?: MemberClient; initialFlow?: "login" | "signup"; initialCapabilities?: Readonly<MemberCapabilities> } = {}) {
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
      const active = result.status === "ready" && result.draft.returnToTickets
        ? result.draft
        : null;
      setDraft(active);
      if (active) {
        expiryTimer = window.setTimeout(refresh, Math.max(1, active.expiresAt - Date.now()));
      }
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === null || event.key === TICKET_SELECTION_DRAFT_KEY) refresh();
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
    <MemberAccountStudy
      client={client}
      initialFlow={initialFlow}
      initialCapabilities={initialCapabilities}
      completionAction={draft ? (
        <TicketReturnAction onReturn={returnToTickets} storageIssue={storageIssue} />
      ) : undefined}
    />
  );
}

function TicketReturnAction({ onReturn, storageIssue }: {
  onReturn: () => void;
  storageIssue: boolean;
}) {
  return (
    <>
      {/* A fixed ordinary link works across provider returns without widening callbacks. */}
      <a
        href="/tickets"
        onClick={onReturn}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100 [font-family:system-ui]"
      >
        Return to tickets
      </a>
      {storageIssue && (
        <p role="status" className="mt-2 text-[13px] leading-5 text-neutral-400">
          Your selection couldn’t be updated. You can choose again on the ticket page.
        </p>
      )}
    </>
  );
}
