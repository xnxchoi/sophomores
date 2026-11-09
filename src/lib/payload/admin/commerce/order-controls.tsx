"use client";

import { useTranslations } from "next-intl";

import { useId, useState, type ChangeEvent } from "react";
import { Button, FieldLabel, ReactSelect, TextInput, CheckboxInput } from "@payloadcms/ui";
import type { Command } from "./operation-panel";

export function OrderControls({ id, data, disabled, correctingReturn = false, execute }: { id: string; data: Record<string, unknown>; disabled: boolean; correctingReturn?: boolean; execute: (command: Command) => Promise<void> }) {
  const t = useTranslations("Staff.orderControls");
  const prefix = useId();
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [evidenceID, setEvidenceID] = useState("");
  const [units, setUnits] = useState<number[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [disposition, setDisposition] = useState("do-not-restock");
  const [confirm, setConfirm] = useState(false);
  if (data.commerceVersion !== "commerce-v1") return <p>{t("historicalOrdersAreImmutableCommerceOperationsAreUnavailable")}</p>;
  const snapshot = data.commerceSnapshot as { quantity?: unknown } | undefined;
  const quantity = snapshot?.quantity;
  if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 3) return <p>{t("savedPurchaseUnitsAreUnavailableReloadBeforeContinuing")}</p>;
  const fulfillment = data.fulfillment as { status?: string } | undefined;
  const status = fulfillment?.status ?? "pending";
  const choices = status === "pending" ? ["packed"] : status === "packed" ? ["shipped"] : status === "shipped" ? ["delivered", "return-requested"] : status === "delivered" ? ["return-requested"] : status === "return-requested" ? ["returned"] : [];
  const dispositionOptions = [{ label: t("doNotRestock"), value: "do-not-restock" }, { label: t("restock"), value: "restock" }];
  return <div className="staff:flex staff:flex-col staff:gap-4">
    <p className="staff:m-0">{t("savedFulfillmentStatus", { status })}</p>
    {status === "packed" && <>
      <TextInput className="staff:[&_input]:min-h-[44px]" label={t("carrier")} path={`${prefix}-carrier`} value={carrier} readOnly={disabled} onChange={(event: ChangeEvent<HTMLInputElement>) => setCarrier(event.target.value.slice(0, 100))} />
      <TextInput className="staff:[&_input]:min-h-[44px]" label={t("trackingNumber")} path={`${prefix}-tracking`} value={trackingNumber} readOnly={disabled} onChange={(event: ChangeEvent<HTMLInputElement>) => setTrackingNumber(event.target.value.slice(0, 120))} />
    </>}
    <div className="staff:flex staff:flex-wrap staff:gap-3">{choices.map((next) => <Button className="staff:m-0 staff:min-h-[44px]" key={next} type="button" disabled={disabled || (next === "shipped" && (!carrier.trim() || !trackingNumber.trim()))} onClick={() => void execute({ action: "fulfillment", orderID: id, status: next, actionID: crypto.randomUUID(), ...(next === "shipped" ? { carrier: carrier.trim(), trackingNumber: trackingNumber.trim() } : {}) })}>{t("markStatus", { status: next })}</Button>)}</div>
    <h4 className="staff:m-0">{t("physicallyReturnedUnits")}</h4>
    <p className="staff:m-0">{t("selectPurchasedUnitsReceivedAndInspectedAcceptingA")}</p>
    {Array.from({ length: quantity }, (_, index) => index + 1).map((unit) => <CheckboxInput className="staff:items-center staff:[&_label]:flex staff:[&_label]:min-h-[44px] staff:[&_label]:flex-1 staff:[&_label]:items-center" key={unit} id={`${prefix}-unit-${unit}`} name={`${prefix}-unit-${unit}`} label={t("unitUnit", { unit })} checked={units.includes(unit)} readOnly={disabled} onToggle={() => { setUnits((current) => current.includes(unit) ? current.filter((item) => item !== unit) : [...current, unit]); setReviewed(false); setConfirm(false); }} />)}
    <TextInput className="staff:[&_input]:min-h-[44px]" label={t("physicalReturnEvidenceReference")} path={`${prefix}-evidence`} value={evidenceID} readOnly={disabled && !correctingReturn} onChange={(event: ChangeEvent<HTMLInputElement>) => setEvidenceID(event.target.value.slice(0, 200))} />
    <CheckboxInput className="staff:items-center staff:[&_label]:flex staff:[&_label]:min-h-[44px] staff:[&_label]:flex-1 staff:[&_label]:items-center" id={`${prefix}-reviewed`} name={`${prefix}-reviewed`} label={t("iManuallyReviewedAnyUsedAttendanceOrBenefits")} checked={reviewed} readOnly={disabled && !correctingReturn} onToggle={() => setReviewed((value) => !value)} />
    <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={(disabled && !correctingReturn) || !units.length || !evidenceID.trim()} onClick={() => void execute({ action: "accept-unit-return", orderID: id, units, evidenceID: evidenceID.trim(), usedBenefitsReviewed: reviewed })}>{t("acceptPhysicalReturn")}</Button>
    <FieldLabel htmlFor={`${prefix}-disposition`} label={t("finalStockDisposition")} />
    <ReactSelect className="staff:[&>div:first-of-type]:min-h-[44px]" inputId={`${prefix}-disposition`} disabled={disabled} isClearable={false} options={dispositionOptions} value={dispositionOptions.find((option) => option.value === disposition)} onChange={(option) => { if (option && !Array.isArray(option)) { setDisposition(String(option.value)); setConfirm(false); } }} />
    <CheckboxInput className="staff:items-center staff:[&_label]:flex staff:[&_label]:min-h-[44px] staff:[&_label]:flex-1 staff:[&_label]:items-center" id={`${prefix}-final`} name={`${prefix}-final`} label={t("iInspectedUnitsUnitsAndApproveIrreversibleDisposition", { units: units.join(", ") || t("noneSelected"), disposition })} checked={confirm} readOnly={disabled} onToggle={() => setConfirm((value) => !value)} />
    <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={disabled || !units.length || !confirm} onClick={() => void execute({ action: "return-disposition", orderID: id, units, disposition })}>{t("confirmFinalDisposition")}</Button>
  </div>;
}
