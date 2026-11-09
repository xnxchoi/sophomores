import { useState } from "react";
import { createRoot } from "react-dom/client";
import { OperationPanel } from "@/lib/payload/admin/commerce/operation-panel";
import { EventManifest } from "@/lib/payload/admin/commerce/event-manifest";
import { OperatorDocument, OperatorModified } from "./commerce-operator-payload";

function DocumentPreview({ kind, initial }: { kind: "order" | "admission" | "event"; initial: Record<string, unknown> & { id: string } }) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  return <OperatorDocument value={{ id: initial.id, data, setData }}>{kind === "event" ? <EventManifest /> : <OperationPanel kind={kind} operatorID="synthetic-operator" />}</OperatorDocument>;
}
function Preview() {
  const [dirty, setDirty] = useState(false);
  return <main className="staff:mx-auto staff:max-w-[1000px] staff:px-6 staff:py-10">
    <h1>Synthetic commerce operator controls</h1>
    <p>No staff session, real guest, provider, database or financial action. Installed native Payload controls with test-only contexts.</p>
    <label><input type="checkbox" checked={dirty} onChange={(event) => setDirty(event.target.checked)} /> Simulate unsaved document edits</label>
    <OperatorModified value={dirty}>
      <DocumentPreview kind="order" initial={{ id: "synthetic-order", commerceVersion: "commerce-v1", commerceSnapshot: { quantity: 3 }, fulfillment: { status: "packed" } }} />
      <DocumentPreview kind="admission" initial={{ id: "synthetic-admission", unit: 1, status: "checked-in", claimedAccount: "synthetic-customer", guestName: "Synthetic guest" }} />
      <DocumentPreview kind="event" initial={{ id: "synthetic-event" }} />
    </OperatorModified>
  </main>;
}
const root = document.getElementById("root");
if (!root) throw new Error("Synthetic preview root missing");
createRoot(root).render(<Preview />);
