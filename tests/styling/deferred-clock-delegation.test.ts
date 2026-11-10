import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Owner-deferred CSS policy. Spinner geometry/status/animation behavior remains
// blocking in tests/motion/dom-loops.test.tsx. No production styles changed.
test("deferred styling: verification loops, account indicators and toast avoid CSS clocks", () => {
  for (const path of [
    "src/components/Authentication/phone-verification/verification-status.tsx",
    "src/components/Authentication/account-phase-views.tsx",
    "src/components/ui/toast.tsx",
    "src/components/ui/spinner.tsx",
    "src/components/settings/ActionField.tsx",
  ]) {
    assert.equal(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8").includes("animate-spin"), false, path);
  }
});
