import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  canStartStepTransition,
  hasStepArrived,
  invitationStepVariants,
  stepMotionTokens
} from "../lib/invitation-study/step-motion";

test("normal steps leave gradually, breathe briefly, then arrive at a calmer pace", () => {
  const variants = invitationStepVariants(false);
  assert.ok(
    variants.exit.transition.duration >= 0.35 &&
      variants.exit.transition.duration <= 0.4
  );
  assert.ok(
    variants.visible.transition.duration >= 0.65 &&
      variants.visible.transition.duration <= 0.75
  );
  assert.ok(
    variants.visible.transition.delay > 0 &&
      variants.visible.transition.delay <= 0.1
  );
  assert.deepEqual(variants.exit.transition.ease, [0.45, 0, 0.25, 1]);
  assert.deepEqual(variants.visible.transition.ease, [0.45, 0, 0.25, 1]);
  assert.equal(variants.hidden.y, 8);
  assert.equal(variants.exit.y, -8);
  assert.equal(variants.visible.y, 0);
  assert.ok(
    stepMotionTokens.departure +
      stepMotionTokens.arrival +
      stepMotionTokens.breath >
      1.1
  );
});

test("reduced motion removes spatial movement, breath, and long fades", () => {
  const variants = invitationStepVariants(true);
  for (const variant of Object.values(variants)) assert.equal(variant.y, 0);
  assert.ok(variants.visible.transition.duration <= 0.15);
  assert.ok(variants.exit.transition.duration <= 0.15);
  assert.equal(variants.visible.transition.delay, 0);
});

test("a transition rejects repeated next/back/edit until the intended incoming panel arrives", () => {
  assert.equal(canStartStepTransition("intro", "email", null), true);
  assert.equal(canStartStepTransition("email", "email", null), false);
  assert.equal(canStartStepTransition("email", "name", "name"), false);
  assert.equal(canStartStepTransition("email", "intro", "name"), false);
  assert.equal(hasStepArrived("name", "email", "visible"), false);
  assert.equal(hasStepArrived("name", "name", "exit"), false);
  assert.equal(hasStepArrived(null, "name", "visible"), false);
  assert.equal(hasStepArrived("name", "name", "visible"), true);
  assert.equal(canStartStepTransition("name", "review", null), true);
});

test("the entire progress/content panel is sequential and inert during transitions", () => {
  const source = readFileSync(
    new URL(
      "../components/invitation-study/invitation-form.tsx",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(source, /mode="wait"/);
  assert.match(source, /inert=\{transitioning\}/);
  assert.match(source, /useLiveReducedMotion/);
  assert.ok(
    source.indexOf("<motion.div") < source.indexOf('aria-label="Preview steps"')
  );
  assert.ok(
    source.indexOf("invitation-form-exit") <
      source.indexOf("inert={transitioning}")
  );
  assert.match(source, /if \(pendingStep\.current\) return;/);
  assert.match(source, /onExitComplete=/);
});
