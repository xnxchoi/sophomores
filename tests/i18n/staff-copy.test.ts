import assert from "node:assert/strict";
import test from "node:test";
import { createTranslator } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";

test("staff commerce messages interpolate operational values without changing them", () => {
  const t = createTranslator({ locale: "en", messages: messagesByLocale.en, namespace: "Staff" });
  assert.equal(t("admissionControls.savedAdmissionStatus", { status: "checked-in" }), "Saved admission: checked-in.");
  assert.equal(t("eventManifest.pagePageTotalAdmissions", { page: 2, total: 120 }), "Page 2 · 120 admissions");
  assert.equal(t("operationPanel.acknowledgedRedemptionOrdinalRefreshingSavedDocument", { ordinal: 4 }), "Acknowledged redemption 4. Refreshing saved document…");
  assert.equal(t("orderControls.iInspectedUnitsUnitsAndApproveIrreversibleDisposition", { units: "1, 3", disposition: "do-not-restock" }), "I inspected units 1, 3 and approve irreversible do-not-restock");
});
