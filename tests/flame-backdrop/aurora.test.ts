import assert from "node:assert/strict";
import test from "node:test";
import { AURORA_MOTION_GLSL } from "@/components/gl/flame-backdrop/aurora";

const smoothstep = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const functions = new Function(
  "smoothstep",
  "sin",
  `${AURORA_MOTION_GLSL.replace(
    /float (\w+)\(([^)]*)\)/g,
    (_, name: string, args: string) =>
      `function ${name}(${args.replace(/float /g, "")})`
  ).replace(/\bfloat\b/g, "const")}
return { auroraEntry, auroraRise, auroraDrift };`
)(smoothstep, Math.sin) as {
  auroraEntry: (progress: number) => number;
  auroraRise: (progress: number) => number;
  auroraDrift: (x: number, phase: number) => number;
};

test("original ribbon field rises together with no separate anchored stems and begins fully dark", () => {
  assert.equal(functions.auroraEntry(0), 0);
  assert.equal(functions.auroraEntry(1), 1);
  assert.equal(functions.auroraRise(0), 0);
  assert.equal(functions.auroraRise(1), 0.15);
  for (let i = 0; i < 100; i++) {
    assert.ok(
      functions.auroraRise((i + 1) / 100) >= functions.auroraRise(i / 100)
    );
  }
});

test("drift is modest, seamless and nonuniform; entry endpoints have no jumps", () => {
  for (let i = 0; i < 10000; i++) {
    const x = (i % 101) / 100;
    const phase = ((i % 97) / 97) * Math.PI * 2;
    const drift = functions.auroraDrift(x, phase);
    assert.ok(Number.isFinite(drift) && Math.abs(drift) <= 0.015);
    assert.ok(
      Math.abs(functions.auroraDrift(x, phase + 2 * Math.PI) - drift) < 1e-12
    );
  }
  assert.notEqual(functions.auroraDrift(0.1, 0), functions.auroraDrift(0.9, 0));
  assert.ok(functions.auroraRise(0.00001) < 1e-8);
  assert.ok(0.15 - functions.auroraRise(0.99999) < 1e-8);
});
