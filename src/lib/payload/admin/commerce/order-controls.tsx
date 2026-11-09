"use client";

import { useId, useState, type ChangeEvent } from "react";
import { Button, FieldLabel, ReactSelect, TextInput, CheckboxInput } from "@payloadcms/ui";
import type { Command } from "./operation-panel";

export function OrderControls({ id, data, disabled, correctingReturn = false, execute }: { id: string; data: Record<string, unknown>; disabled: boolean; correctingReturn?: boolean; execute: (command: Command) => Promise<void> }) {
  const prefix = useId();
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [evidenceID, setEvidenceID] = useState("");
  const [units, setUnits] = useState<number[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [disposition, setDisposition] = useState("do-not-restock");
  const [confirm, setConfirm] = useState(false);
  if (data.commerceVersion !== "commerce-v1") return <p>Historical orders are immutable. Commerce operations are unavailable.</p>;
  const snapshot = data.commerceSnapshot as { quantity?: unknown } | undefined;
  const quantity = snapshot?.quantity;
  if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 3) return <p>Saved purchase units are unavailable. Reload before continuing.</p>;
  const fulfillment = data.fulfillment as { status?: string } | undefined;
  const status = fulfillment?.status ?? "pending";
  const choices = status === "pending" ? ["packed"] : status === "packed" ? ["shipped"] : status === "shipped" ? ["delivered", "return-requested"] : status === "delivered" ? ["return-requested"] : status === "return-requested" ? ["returned"] : [];
  const dispositionOptions = [{ label: "Do not restock", value: "do-not-restock" }, { label: "Restock", value: "restock" }];
  return <div className="staff:flex staff:flex-col staff:gap-4">
    <p className="staff:m-0">Saved fulfillment: {status}</p>
    {status === "packed" && <>
      <TextInput className="staff:[&_input]:min-h-[44px]" label="Carrier" path={`${prefix}-carrier`} value={carrier} readOnly={disabled} onChange={(event: ChangeEvent<HTMLInputElement>) => setCarrier(event.target.value.slice(0, 100))} />
      <TextInput className="staff:[&_input]:min-h-[44px]" label="Tracking number" path={`${prefix}-tracking`} value={trackingNumber} readOnly={disabled} onChange={(event: ChangeEvent<HTMLInputElement>) => setTrackingNumber(event.target.value.slice(0, 120))} />
    </>}
    <div className="staff:flex staff:flex-wrap staff:gap-3">{choices.map((next) => <Button className="staff:m-0 staff:min-h-[44px]" key={next} type="button" disabled={disabled || (next === "shipped" && (!carrier.trim() || !trackingNumber.trim()))} onClick={() => void execute({ action: "fulfillment", orderID: id, status: next, actionID: crypto.randomUUID(), ...(next === "shipped" ? { carrier: carrier.trim(), trackingNumber: trackingNumber.trim() } : {}) })}>Mark {next}</Button>)}</div>
    <h4 className="staff:m-0">Physically returned units</h4>
    <p className="staff:m-0">Select purchased units received and inspected. Accepting a return releases applicable allowance, not a financial refund. Used benefits require explicit manual review.</p>
    {Array.from({ length: quantity }, (_, index) => index + 1).map((unit) => <CheckboxInput className="staff:items-center staff:[&_label]:flex staff:[&_label]:min-h-[44px] staff:[&_label]:flex-1 staff:[&_label]:items-center" key={unit} id={`${prefix}-unit-${unit}`} name={`${prefix}-unit-${unit}`} label={`Unit ${unit}`} checked={units.includes(unit)} readOnly={disabled} onToggle={() => { setUnits((current) => current.includes(unit) ? current.filter((item) => item !== unit) : [...current, unit]); setReviewed(false); setConfirm(false); }} />)}
    <TextInput className="staff:[&_input]:min-h-[44px]" label="Physical return evidence reference" path={`${prefix}-evidence`} value={evidenceID} readOnly={disabled && !correctingReturn} onChange={(event: ChangeEvent<HTMLInputElement>) => setEvidenceID(event.target.value.slice(0, 200))} />
    <CheckboxInput className="staff:items-center staff:[&_label]:flex staff:[&_label]:min-h-[44px] staff:[&_label]:flex-1 staff:[&_label]:items-center" id={`${prefix}-reviewed`} name={`${prefix}-reviewed`} label="I manually reviewed any used attendance or benefits for these units" checked={reviewed} readOnly={disabled && !correctingReturn} onToggle={() => setReviewed((value) => !value)} />
    <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={(disabled && !correctingReturn) || !units.length || !evidenceID.trim()} onClick={() => void execute({ action: "accept-unit-return", orderID: id, units, evidenceID: evidenceID.trim(), usedBenefitsReviewed: reviewed })}>Accept physical return</Button>
    <FieldLabel htmlFor={`${prefix}-disposition`} label="Final stock disposition" />
    <ReactSelect className="staff:[&>div:first-of-type]:min-h-[44px]" inputId={`${prefix}-disposition`} disabled={disabled} isClearable={false} options={dispositionOptions} value={dispositionOptions.find((option) => option.value === disposition)} onChange={(option) => { if (option && !Array.isArray(option)) { setDisposition(String(option.value)); setConfirm(false); } }} />
    <CheckboxInput className="staff:items-center staff:[&_label]:flex staff:[&_label]:min-h-[44px] staff:[&_label]:flex-1 staff:[&_label]:items-center" id={`${prefix}-final`} name={`${prefix}-final`} label={`I inspected units ${units.join(", ") || "(none selected)"} and approve irreversible ${disposition}`} checked={confirm} readOnly={disabled} onToggle={() => setConfirm((value) => !value)} />
    <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={disabled || !units.length || !confirm} onClick={() => void execute({ action: "return-disposition", orderID: id, units, disposition })}>Confirm final disposition</Button>
  </div>;
}
