import assert from "node:assert/strict";
import test from "node:test";
import { transform } from "motion";
import { Project, SyntaxKind } from "ts-morph";
import { getFrame, HANDOFF } from "../../components/Warp/sequence";
import {
  analogueRunwayHeightVh,
  analogueScrollTravelVh
} from "../../lib/teaser/step-motion";

const source = new Project().addSourceFileAtPath("components/Warp/index.tsx");
const declaration = source.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
  .find(node => node.getName() === "passageLift")!;
const call = declaration.getInitializerIfKindOrThrow(SyntaxKind.CallExpression);
// Exercise the actual component's range through installed Motion: mismatched
// complex-string shapes silently snap, even when numeric progress tests pass.
const travel = new Function("transform", `return transform(${call.getArguments()
  .slice(1).map(argument => argument.getText()).join(",")});`)(transform) as (value: number) => string;

test("passage uses real interpolated viewport/self-height translation, not an offscreen snap", () => {
  for (const [progress, expected] of [
    [0, "calc(100svh - 0%)"],
    [.25, "calc(75svh - 25%)"],
    [.5, "calc(50svh - 50%)"],
    [.75, "calc(25svh - 75%)"],
    [1, "calc(0svh - 100%)"]
  ] as const) assert.equal(travel(progress), expected);

  for (const [viewport, height] of [[720, 66.5625], [844, 120]]) {
    let previousTop = viewport + 1;
    for (let index = 0; index <= 100; index++) {
      const progress = index / 100;
      const parts = travel(progress).match(/^calc\(([\d.]+)svh - ([\d.]+)%\)$/)!;
      assert.ok(parts, "both interpolated units must survive the native Motion mixer");
      const top = Number(parts[1]) * viewport / 100 - Number(parts[2]) * height / 100;
      assert.ok(top < previousTop);
      assert.ok(Math.abs(top - (viewport * (1 - progress) - height * progress)) < .001);
      if (index === 50) assert.ok(top > 0 && top + height < viewport);
      if (index === 100) assert.ok(Math.abs(top + height) < .001);
      assert.equal(travel(progress), travel(1 - (1 - progress)));
      previousTop = top;
    }
  }
});

test("desktop split stays a tenth of the 3-viewport analogue runway", () => {
  assert.match(source.getFullText(), /analogueRunwayHeightVh\(\)/);
  const travelVh = analogueRunwayHeightVh() - 100;
  assert.equal(travelVh, analogueScrollTravelVh);
  assert.equal(analogueScrollTravelVh, 300);
  const splitEnd = HANDOFF * 0.1;
  assert.equal(getFrame(splitEnd).headlineSplit, 1);
  assert.equal(getFrame(splitEnd).headlineScale, .72);
  assert.ok(getFrame(splitEnd / 2).headlineSplit < 1);
  assert.equal(getFrame(.07).passageLift, 0);
  assert.ok(getFrame(.08).passageLift > 0);
  assert.equal(getFrame(.6).passageLift, 1);
});
