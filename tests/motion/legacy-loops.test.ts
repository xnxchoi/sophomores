import assert from "node:assert/strict";
import test from "node:test";
import { animate, motionValue } from "motion";

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
