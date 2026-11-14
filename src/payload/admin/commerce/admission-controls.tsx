"use client";

import { useTranslations } from "next-intl";

import { Button } from "@payloadcms/ui";
import type { Command } from "./operation-panel";

export function AdmissionControls({ id, data, disabled, drinkLimitReached = false, execute }: { id: string; data: Record<string, unknown>; disabled: boolean; drinkLimitReached?: boolean; execute: (command: Command) => Promise<void> }) {
  const t = useTranslations("Staff.admissionControls");
  const held = data.benefitReview === true || !!data.returnAcceptedAt || data.status === "revoked";
  const eligible = data.status === "checked-in" && !!data.claimedAccount && !held;
  return <div className="staff:flex staff:flex-col staff:gap-3">
    <p className="staff:m-0">{t("savedAdmissionStatus", { status: String(data.status ?? t("unavailable")) })} {data.claimedAccount ? t("individuallyRegistered") : t("notIndividuallyRegistered")}</p>
    {held && <>
      {data.status === "revoked" && <p className="staff:m-0">{t("revokedReason")}</p>}
      {data.benefitReview === true && <p className="staff:m-0">{t("benefitReviewReason")}</p>}
      {!!data.returnAcceptedAt && <p className="staff:m-0">{t("returnAcceptedReason")}</p>}
      <p className="staff:m-0">{t("benefitOperationsUnavailable")}</p>
    </>}
    <div className="staff:flex staff:flex-wrap staff:gap-3">
      <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={disabled || held || !data.guestName || !["available", "claimed"].includes(String(data.status))} onClick={() => void execute({ action: "check-in", admissionID: id })}>{t("checkInNamedGuest")}</Button>
      <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={disabled || !eligible || drinkLimitReached} onClick={() => void execute({ action: "redeem", admissionID: id, kind: "part-i-drink" })}>{t("redeemOnePartIDrink")}</Button>
      <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={disabled || !eligible} onClick={() => void execute({ action: "redeem", admissionID: id, kind: "shared-transfer" })}>{t("redeemSharedTransfer")}</Button>
    </div>
    <p className="staff:m-0">{t("theServerVerifiesPartITimingBenefitLimits")}</p>
    {drinkLimitReached && <p className="staff:m-0">{t("allFourPartIDrinksHaveBeenAcknowledged")}</p>}
  </div>;
}
