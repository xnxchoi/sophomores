import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTranslator } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";

test("staff canonical copy preserves explicit review and security warnings", () => {
  const t = createTranslator({ locale: "en", messages: messagesByLocale.en, namespace: "Staff" });
  assert.equal(t("recoveryReview.reviewMetadataSavedNoMessageWasSentAnd"), "Review metadata saved. No message was sent and no account was changed. Reload to view the updated audit log.");
  assert.equal(t("staffLoginForm.useYourSophomoresCoEmailAddress"), "Use your @sophomores.co email address.");
  const panel = readFileSync("src/payload/admin/commerce/operation-panel.tsx", "utf8");
  assert.match(panel, /z\.literal\("Commerce operation could not be completed"\)/);
  assert.match(panel, /command\.action === "redeem"/);
});
