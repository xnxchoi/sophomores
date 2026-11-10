import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { animate, motionValue } from "motion";

const source = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("ActionSwap's quiet ring uses the same native Motion linear 750ms loop", () => {
  const component = source("src/components/arc/action-swap/action-swap.tsx");
  assert.match(component, /<motion\.span\s+data-slot="action-swap-spinner"/);
  assert.match(component, /animate=\{\{ rotate: 360 \}\}/);
  assert.match(component, /transition=\{\{ duration: 0\.75, ease: "linear", repeat: Infinity \}\}/);
  assert.match(component, /border-\[1\.5px\]/);
  assert.match(component, /size-\[14px\]/);
  assert.doesNotMatch(source("src/components/arc/action-swap/action-swap.module.css"), /swap-spin|\.spinner\s*\{/);
});

test("the replacement spinner uses Motion's native tween without an extra clock", () => {
  const angle = motionValue(0);
  const controls = animate(angle, 360, {
    duration: 0.75,
    ease: "linear",
    repeat: Infinity,
    autoplay: false,
  });
  assert.equal(controls.duration, 0.75);
  assert.equal(controls.state, "paused");
  controls.stop();
});

test("unconsumed phone-verification pulse no longer retains a second animation engine", () => {
  assert.doesNotMatch(source("src/components/Authentication/phone-verification/verification.css"), /pv-pulse|animation-delay:\s*0\.(25|5)s/);
});
