import assert from "node:assert/strict";
import test from "node:test";
import { createTranslator } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";

// Frozen pass02 approval constraints only; this is not a runtime copy source
// or approval of any unresolved benefit, permission or product policy.
const approvedCopy = {
  "Staff.admissionControls.revokedReason": "This admission is revoked.",
  "Staff.admissionControls.benefitReviewReason": "Benefits are on hold for review.",
  "Staff.admissionControls.returnAcceptedReason": "A physical return has been accepted.",
  "Staff.admissionControls.benefitOperationsUnavailable": "Benefit operations are unavailable.",
  "Staff.eventManifest.manifestUnavailableUseRefreshManifestToRetry": "The latest manifest couldn’t be loaded. Select Refresh manifest to try again. Any rows shown are from the last successful load.",
  "Developer.domainTimeline.startsWhenTheRendererIsReadyThisClockIs": "Starts when the renderer is ready. This clock uses seconds, independent of scroll."
} as const;

for (const [key, expected] of Object.entries(approvedCopy)) {
  test(`staff copy pass02 retains the exact approved English contract: ${key}`, () => {
    const t = createTranslator({
      locale: "en", messages: messagesByLocale.en,
      onError: (error) => { throw error; }
    });
    assert.equal(t(key as Parameters<typeof t>[0]), expected);
  });
}
