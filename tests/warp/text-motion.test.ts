import assert from "node:assert/strict";
import test from "node:test";
import { Project, SyntaxKind } from "ts-morph";
import {
  createSequenceMappers,
  getFrame,
  HANDOFF
} from "@/components/Warp/sequence";
import { createDefaultSequence } from "@/components/Warp/_shared/sequence-editor";
import {
  analogueRunwayHeightVh,
  analogueScrollTravelVh
} from "@/lib/teaser/step-motion";

const source = new Project().addSourceFileAtPath("src/components/Warp/index.tsx");
const passageLiftSource = source
  .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
  .find((node) => node.getName() === "passageLift")!
  .getText();

test("the passage rolls 1:1 with the scroll, in one unit so Motion never snaps", () => {
  // Single-unit svh: no svh/% mix for the Motion mixer to snap on.
  assert.match(passageLiftSource, /analogueRunwayHeightVh\(\) - 100/);
  assert.match(passageLiftSource, /\/\s*HANDOFF/);
  assert.match(passageLiftSource, /`calc\(\$\{100 - [^`]*\}svh\)`/);
  assert.doesNotMatch(passageLiftSource, /%/);
  // With the shipped linear window, position + scrolled distance is constant.
  const compiled = createSequenceMappers(createDefaultSequence());
  const { passageTravel } = createDefaultSequence().clips;
  const travelVh = analogueRunwayHeightVh() - 100;
  const windowVh =
    (((passageTravel.end - passageTravel.start) / 100) * travelVh) / HANDOFF;
  const constant = (progress: number) =>
    100 -
    compiled.frame(progress).passageLift * windowVh +
    (progress / HANDOFF) * travelVh;
  const reference = constant(passageTravel.start / 100);
  for (let sample = 0; sample <= 100; sample++) {
    const progress =
      (passageTravel.start + ((passageTravel.end - passageTravel.start) * sample) / 100) / 100;
    assert.ok(Math.abs(constant(progress) - reference) < 1e-9, `drift at ${progress}`);
  }
});

test("desktop split glides over about the first sixth of the 3-viewport analogue runway", () => {
  assert.match(source.getFullText(), /analogueRunwayHeightVh\(\)/);
  const travelVh = analogueRunwayHeightVh() - 100;
  assert.equal(travelVh, analogueScrollTravelVh);
  assert.equal(analogueScrollTravelVh, 300);
  const splitEnd = 0.12;
  assert.ok(splitEnd < HANDOFF / 5);
  assert.equal(getFrame(splitEnd).headlineSplit, 1);
  assert.equal(getFrame(splitEnd).headlineScale, .5);
  assert.ok(getFrame(splitEnd / 2).headlineSplit < 1);
  assert.equal(getFrame(.03).passageLift, 0);
  assert.ok(getFrame(.04).passageLift > 0);
  assert.equal(getFrame(.28).passageLift, 1);
});
