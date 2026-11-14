"use client";

import { useTranslations } from "next-intl";

import { useEffect, useRef, useState } from "react";
import { Button, useConfig, useDocumentInfo, useFormModified } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { z } from "zod";
import { OrderControls } from "./order-controls";
import { AdmissionControls } from "./admission-controls";
import "@/styles/staff-login.css";

export type Command = Record<string, unknown> & { action: string };
export function OperationPanel(props: { kind: "order" | "admission"; operatorID: string }) {
  const t = useTranslations("Staff.operationPanel");
  const { id } = useDocumentInfo();
  if (!id) return <p>{t("saveThisDocumentBeforeUsingCommerceOperations")}</p>;
  return <SavedOperations key={`${props.kind}:${id}:${props.operatorID}`} {...props} id={String(id)} />;
}

function SavedOperations({ kind, operatorID, id }: { kind: "order" | "admission"; operatorID: string; id: string }) {
  const t = useTranslations("Staff.operationPanel");
  const { data, setData } = useDocumentInfo();
  const modified = useFormModified();
  const modifiedNow = useRef(modified);
  modifiedNow.current = modified;
  const { config } = useConfig();
  const pending = useRef(false);
  const live = useRef(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [retry, setRetry] = useState<Command | null>(null);
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  const [lastDrinkOrdinal, setLastDrinkOrdinal] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [returnCorrectionAvailable, setReturnCorrectionAvailable] = useState(false);
  const [correctingReturn, setCorrectingReturn] = useState(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const collection = kind === "order" ? "orders" : "commerce-admissions";
  const apiURL = formatAdminURL({ apiRoute: config.routes.api, path: "/commerce/guest-operations" });

  async function execute(proposed: Command) {
    if (pending.current || modified || blocked) return;
    if (lastDrinkOrdinal === 4 && proposed.action === "redeem" && proposed.kind === "part-i-drink") return;
    // A generic error is not proof of rollback. Correct only review details
    // while preserving the original action, order and purchased units.
    if (retry && proposed !== retry) {
      if (!correctingReturn || retry.action !== "accept-unit-return" || proposed.action !== retry.action || proposed.orderID !== retry.orderID || JSON.stringify(proposed.units) !== JSON.stringify(retry.units)) return;
      proposed = { ...retry, evidenceID: proposed.evidenceID, usedBenefitsReviewed: proposed.usedBenefitsReviewed };
    }
    pending.current = true;
    setBusy(true);
    setReturnCorrectionAvailable(false);
    setCorrectingReturn(false);
    setFeedback("");
    let command = proposed;
    let storageKey: string | null = null;
    let replayReady = command.action !== "redeem";
    let receiptAccepted = false;
    try {
      if (command.action === "redeem") {
        storageKey = `commerce-operation:${operatorID}:${id}:${command.kind}`;
        // Only opaque replay metadata is persisted. Storage failure is a hard
        // stop: a lost acknowledgement must never create a second redemption.
        const previous = sessionStorage.getItem(storageKey);
        const actionID = previous ?? crypto.randomUUID();
        if (!z.uuid().safeParse(actionID).success) throw new Error("storage");
        sessionStorage.setItem(storageKey, actionID);
        if (sessionStorage.getItem(storageKey) !== actionID) throw new Error("storage");
        replayReady = true;
        command = { ...command, actionID };
      }
      setRetry(command);
      const response = await fetch(apiURL, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command), signal: AbortSignal.timeout(15_000)
      });
      if (!response.ok) {
        if (response.status === 400 && command.action === "accept-unit-return") {
          const rejected = z.strictObject({ error: z.literal("Commerce operation could not be completed") }).safeParse(await response.json());
          if (rejected.success && live.current) setReturnCorrectionAvailable(true);
        }
        throw new Error("operation");
      }
      const receipt = await response.json();
      if (command.action === "redeem") {
        const parsed = z.strictObject({ ordinal: z.int().min(1).max(command.kind === "part-i-drink" ? 4 : 1) }).parse(receipt);
        if (live.current && command.kind === "part-i-drink") setLastDrinkOrdinal(parsed.ordinal);
        if (live.current) setFeedback(t("acknowledgedRedemptionOrdinalRefreshingSavedDocument", { ordinal: parsed.ordinal }));
      } else if (command.action === "accept-unit-return" || command.action === "return-disposition") {
        const key = command.action === "accept-unit-return" ? "newlyAcceptedUnits" : "disposedUnits";
        const result = z.record(z.string(), z.unknown()).parse(receipt);
        const units = z.array(z.int().min(1).max(3)).max(3).parse(result[key]);
        if (Object.keys(result).length !== 1 || new Set(units).size !== units.length || units.some((unit) => !(command.units as number[]).includes(unit))) throw new Error("receipt");
      } else z.strictObject({ success: z.literal(true) }).parse(receipt);
      receiptAccepted = true;
      const canonical = await fetch(formatAdminURL({ apiRoute: config.routes.api, path: `/${collection}/${encodeURIComponent(id)}?depth=0` }), { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15_000) });
      if (!canonical.ok) throw new Error("refresh");
      const document = z.object({ id: z.union([z.string(), z.number()]) }).passthrough().parse(await canonical.json());
      if (String(document.id) !== id) throw new Error("document");
      if (kind === "order") z.object({ commerceVersion: z.literal("commerce-v1"), commerceSnapshot: z.object({ quantity: z.int().min(1).max(3) }) }).parse(document);
      else z.object({ status: z.enum(["available", "claimed", "checked-in", "revoked"]), unit: z.int().min(1).max(3) }).parse(document);
      if (!live.current) return;
      if (modifiedNow.current) throw new Error("unsaved edits");
      setData(document);
      setRetry(null);
      setAcknowledged(command.action === "redeem" ? String(command.kind) : null);
      setFeedback(t("operationRecordedSavedSnapshotRefreshedReloadEditorFields"));
      // Keep the redemption token after acknowledgement until the operator
      // deliberately starts the next drink. Reload therefore remains safe.
    } catch {
      if (!live.current) return;
      if (!replayReady) {
        setFeedback(t("replayStorageIsUnavailableNoOperationWasSent"));
      } else if (receiptAccepted) {
        setBlocked(true);
        setFeedback(t("operationAcknowledgedButSavedDataCouldNotBe"));
      } else setFeedback(t("outcomeNotConfirmedRetryTheExactOperationDo"));
    } finally {
      pending.current = false;
      if (live.current) setBusy(false);
    }
  }

  function nextDrink() {
    if (acknowledged !== "part-i-drink" || lastDrinkOrdinal === 4 || busy || modified) return;
    try {
      sessionStorage.removeItem(`commerce-operation:${operatorID}:${id}:part-i-drink`);
      if (sessionStorage.getItem(`commerce-operation:${operatorID}:${id}:part-i-drink`) !== null) throw new Error("storage");
      setAcknowledged(null); setFeedback("");
    } catch { setBlocked(true); setFeedback(t("replayStorageIsUnavailableReloadBeforeContinuing")); }
  }

  function reloadSavedEditor() {
    if (pending.current || busy || modifiedNow.current) return;
    window.location.reload();
  }

  const disabled = busy || modified || blocked || !!retry;
  return <section aria-label={t("commerceOperations")} className="staff:my-6 staff:flex staff:flex-col staff:gap-4 staff:rounded staff:border staff:border-solid staff:border-(--theme-elevation-150) staff:p-5">
    <h3 className="staff:m-0">{kind === "order" ? t("physicalFulfillmentReturns") : t("admissionOperations")}</h3>
    <p className="staff:m-0">{t("explicitOperationsOnThisSavedDocumentOnlyReturns")}</p>
    {modified && <p role="status">{t("saveOrDiscardDocumentEditsBeforeContinuing")}</p>}
    {kind === "order" ? <OrderControls id={id} data={data ?? {}} disabled={disabled} correctingReturn={correctingReturn && !busy && !modified && !blocked} execute={execute} /> : <AdmissionControls id={id} data={data ?? {}} disabled={disabled || !!acknowledged} drinkLimitReached={lastDrinkOrdinal === 4} execute={execute} />}
    {retry && !blocked && <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy || modified} onClick={() => void execute(retry)}>{t("retryExactOperation")}</Button>}
    {returnCorrectionAvailable && !correctingReturn && !blocked && <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy || modified} onClick={() => { setCorrectingReturn(true); setFeedback(t("correctEvidenceAndManualReviewOnlyTheOriginal")); }}>{t("correctReturnReviewDetails")}</Button>}
    {acknowledged === "part-i-drink" && lastDrinkOrdinal !== 4 && <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy || modified || blocked} onClick={nextDrink}>{t("prepareNextDrink")}</Button>}
    {(acknowledged === "shared-transfer" || (acknowledged === "part-i-drink" && lastDrinkOrdinal === 4)) && <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy || modified || blocked} onClick={() => setAcknowledged(null)}>{t("continueAdmissionOperations")}</Button>}
    <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy || modified} onClick={reloadSavedEditor}>{t("reloadSavedEditor")}</Button>
    {feedback && <p role="status" className="staff:m-0">{feedback}</p>}
  </section>;
}
