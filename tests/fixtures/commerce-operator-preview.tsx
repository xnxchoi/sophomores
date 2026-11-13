import { NextIntlClientProvider } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { OperationPanel } from "@/payload/admin/commerce/operation-panel";
import { EventManifest } from "@/payload/admin/commerce/event-manifest";
import { AdmissionControls } from "@/payload/admin/commerce/admission-controls";
import { OperatorDocument, OperatorModified } from "./commerce-operator-payload";

// Fault injection stays inside this fixture; production controls are unchanged.
let failManifest = false;
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => String(input).startsWith("/api/commerce/events/") && failManifest
  ? Promise.resolve(new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } }))
  : nativeFetch(input, init);

function DocumentPreview({ kind, initial }: { kind: "order" | "admission" | "event"; initial: Record<string, unknown> & { id: string } }) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  return <OperatorDocument value={{ id: initial.id, data, setData }}>{kind === "event" ? <EventManifest /> : <OperationPanel kind={kind} operatorID="synthetic-operator" />}</OperatorDocument>;
}
function Preview() {
  const [dirty, setDirty] = useState(false);
  const [manifestFailure, setManifestFailure] = useState(false);
  return <main className="staff:mx-auto staff:max-w-[1000px] staff:px-6 staff:py-10">
    <h1>Synthetic commerce operator controls</h1>
    <p>No staff session, real guest, provider, database or financial action. Installed native Payload controls with test-only contexts.</p>
    <label><input type="checkbox" checked={dirty} onChange={(event) => setDirty(event.target.checked)} /> Simulate unsaved document edits</label>
    <label><input type="checkbox" checked={manifestFailure} onChange={(event) => { failManifest = event.target.checked; setManifestFailure(event.target.checked); }} /> Fail the next manifest refresh (synthetic)</label>
    <section aria-label="Recorded benefit restrictions">
      <h2>Recorded benefit restrictions</h2>
      {[{ status: "revoked" }, { benefitReview: true }, { returnAcceptedAt: "2026-11-11T00:00:00Z" }, { status: "revoked", benefitReview: true, returnAcceptedAt: "2026-11-11T00:00:00Z" }].map((reason, index) => <section key={index} className="staff:my-6">
        <AdmissionControls id={`synthetic-held-${index}`} data={{ status: "checked-in", claimedAccount: "synthetic-customer", guestName: "Synthetic guest", ...reason }} disabled={false} execute={async () => { throw new Error("Held controls must not execute"); }} />
      </section>)}
    </section>
    <OperatorModified value={dirty}>
      <DocumentPreview kind="order" initial={{ id: "synthetic-order", commerceVersion: "commerce-v1", commerceSnapshot: { quantity: 3 }, fulfillment: { status: "packed" } }} />
      <DocumentPreview kind="admission" initial={{ id: "synthetic-admission", unit: 1, status: "checked-in", claimedAccount: "synthetic-customer", guestName: "Synthetic guest" }} />
      <DocumentPreview kind="event" initial={{ id: "synthetic-event" }} />
    </OperatorModified>
  </main>;
}
const root = document.getElementById("root");
if (!root) throw new Error("Synthetic preview root missing");
createRoot(root).render(<NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={messagesByLocale.en}><Preview /></NextIntlClientProvider>);
