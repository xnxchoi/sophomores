import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

test("ActionSwap's quiet ring uses the same native Motion linear 750ms loop", () => {
  const component = source("src/components/arc/action-swap/action-swap.tsx");
  assert.match(component, /<motion\.span\s+data-slot="action-swap-spinner"/);
  assert.match(component, /animate=\{\{ rotate: 360 \}\}/);
  assert.match(component, /transition=\{\{ duration: 0\.75, ease: "linear", repeat: Infinity \}\}/);
  assert.match(component, /border-\[1\.5px\]/);
  assert.match(component, /size-\[14px\]/);
  assert.doesNotMatch(source("src/components/arc/action-swap/action-swap.module.css"), /swap-spin|\.spinner\s*\{/);
});

test("unconsumed phone-verification pulse no longer retains a second animation engine", () => {
  assert.doesNotMatch(source("src/components/Authentication/phone-verification/verification.css"), /pv-pulse|animation-delay:\s*0\.(25|5)s/);
});
