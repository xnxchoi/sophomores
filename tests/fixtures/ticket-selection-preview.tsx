import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { TicketSelection, type TicketPreviewCatalogue, type TicketPreviewQuote } from "@/components/tickets/ticket-selection";
import { TicketAccountEntry } from "@/components/tickets/ticket-account-entry";
import messages from "../../messages/en.json";
import fixtureCatalogue from "./ticket-preview-catalogue.json";
import type { SelectionItem } from "@/lib/tickets/selection-draft";

// Test presentation data only. Amount authority stays with the isolated server.
const catalogue: TicketPreviewCatalogue = {
  kind: "test",
  version: fixtureCatalogue.version,
  currency: fixtureCatalogue.currency,
  maximumTotalQuantity: fixtureCatalogue.maximumTotalQuantity,
  ticketTypes: fixtureCatalogue.ticketTypes.map(({ id, label, minimumQuantity, maximumQuantity, ...item }) => ({
    id, label, minimumQuantity, maximumQuantity,
    available: "available" in item ? item.available : true
  }))
};
const quoteAdapter = {
  async request(input: { catalogueVersion: string; items: readonly SelectionItem[] }, options?: { signal?: AbortSignal }): Promise<TicketPreviewQuote> {
    const response = await fetch("/fixture/quote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input), signal: options?.signal
    });
    if (!response.ok) throw new Error("Synthetic quote unavailable.");
    return await response.json() as TicketPreviewQuote;
  }
};

type FixtureState = {
  member: "anonymous" | "pending" | "member" | "unavailable";
  quote: "ready" | "error" | "short-expiry";
  delayMs: number;
  phoneProof: "pending" | "verified" | "expired" | "receiver-unavailable";
};

function FixtureControls() {
  const [state, setState] = useState<FixtureState>({ member: "anonymous", quote: "ready", delayMs: 0, phoneProof: "pending" });
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/fixture/state").then((response) => response.json()).then((value: FixtureState) => {
      if (active) setState(value);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  return (
    <details className="mx-auto mb-8 max-w-3xl rounded-xl border border-neutral-700 px-4 py-3 text-sm text-neutral-300 [font-family:system-ui]">
      <summary className="cursor-pointer font-medium">Visual fixture controls — synthetic state only</summary>
      <p className="mt-3 text-xs leading-5 text-neutral-400">No mail, account session, inventory hold, order, or payment exists on this isolated loopback server. Synthetic email: preview@example.invalid; code: ABC123. Select the phone outcome before opening authentication; do not open or send a message.</p>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => {
        event.preventDefault();
        void fetch("/fixture/state", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state)
        }).then((response) => {
          if (!response.ok) throw new Error("Fixture state unavailable.");
          window.location.reload();
        }).catch(() => setError(true));
      }}>
        <label className="grid gap-2">Synthetic membership
          <select className="min-h-11 rounded-lg border border-neutral-600 bg-neutral-900 px-3 text-neutral-100" value={state.member} onChange={(event) => setState({ ...state, member: event.target.value as FixtureState["member"] })}>
            <option value="anonymous">Anonymous</option><option value="pending">Pending account setup</option><option value="member">Verified member fixture</option><option value="unavailable">Membership unavailable</option>
          </select>
        </label>
        <label className="grid gap-2">Synthetic phone proof
          <select className="min-h-11 rounded-lg border border-neutral-600 bg-neutral-900 px-3 text-neutral-100" value={state.phoneProof} onChange={(event) => setState({ ...state, phoneProof: event.target.value as FixtureState["phoneProof"] })}>
            <option value="pending">Pending — no phone proof</option><option value="verified">Verified after status check</option><option value="expired">Expired proof</option><option value="receiver-unavailable">Receiver unavailable</option>
          </select>
        </label>
        <label className="grid gap-2">Synthetic quote outcome
          <select className="min-h-11 rounded-lg border border-neutral-600 bg-neutral-900 px-3 text-neutral-100" value={state.quote} onChange={(event) => setState({ ...state, quote: event.target.value as FixtureState["quote"] })}>
            <option value="ready">Ready</option><option value="error">Unavailable</option><option value="short-expiry">Expires after three seconds</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={state.delayMs > 0} onChange={(event) => setState({ ...state, delayMs: event.target.checked ? 2000 : 0 })} className="size-4 accent-neutral-200" />Two-second quote latency</label>
        <button type="submit" className="min-h-11 rounded-lg border border-neutral-600 px-4 font-medium hover:bg-neutral-800">Apply fixture state and reload</button>
      </form>
      <nav className="mt-4 flex flex-wrap gap-4 text-xs underline underline-offset-4"><a href="/tickets">Ticket fixture</a><a href="/account">Account fixture</a><a href="/account/continue" target="_blank" rel="noreferrer">Open callback fixture in a new tab</a></nav>
      {error && <p role="alert" className="mt-3">Fixture controls are unavailable.</p>}
    </details>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("The ticket visual fixture requires a root element.");
const account = window.location.pathname.startsWith("/account");
createRoot(root).render(
  <NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={messages}>
    {account ? <TicketAccountEntry initialFlow={window.location.pathname === "/account/continue" ? "login" : undefined} /> : <TicketSelection catalogue={catalogue} quoteAdapter={quoteAdapter} />}
    <FixtureControls />
  </NextIntlClientProvider>
);
