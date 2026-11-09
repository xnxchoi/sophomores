"use client";

import { Button } from "@payloadcms/ui";
import type { Command } from "./operation-panel";

export function AdmissionControls({ id, data, disabled, drinkLimitReached = false, execute }: { id: string; data: Record<string, unknown>; disabled: boolean; drinkLimitReached?: boolean; execute: (command: Command) => Promise<void> }) {
  const held = data.benefitReview === true || !!data.returnAcceptedAt || data.status === "revoked";
  const eligible = data.status === "checked-in" && !!data.claimedAccount && !held;
  return <div className="staff:flex staff:flex-col staff:gap-3">
    <p className="staff:m-0">Saved admission: {String(data.status ?? "unavailable")}. {data.claimedAccount ? "Individually registered." : "Not individually registered."}</p>
    {held && <p className="staff:m-0">Benefit hold or physical return recorded. No benefit operations are offered.</p>}
    <div className="staff:flex staff:flex-wrap staff:gap-3">
      <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={disabled || held || !data.guestName || !["available", "claimed"].includes(String(data.status))} onClick={() => void execute({ action: "check-in", admissionID: id })}>Check in named guest</Button>
      <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={disabled || !eligible || drinkLimitReached} onClick={() => void execute({ action: "redeem", admissionID: id, kind: "part-i-drink" })}>Redeem one Part I drink</Button>
      <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={disabled || !eligible} onClick={() => void execute({ action: "redeem", admissionID: id, kind: "shared-transfer" })}>Redeem shared transfer</Button>
    </div>
    <p className="staff:m-0">The server verifies Part I timing, benefit limits and current eligibility. One click redeems one benefit; drinks are never batched.</p>
    {drinkLimitReached && <p className="staff:m-0">All four Part I drinks have been acknowledged for this admission.</p>}
  </div>;
}
