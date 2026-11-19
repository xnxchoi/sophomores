import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveFlameConfig } from "@/components/gl/flame-backdrop/config";
import { createFragmentShader } from "@/components/gl/flame-backdrop/shaders";

test("zero fire intensity omits all fire geometry and keeps the approved ring shader", () => {
  const original = createFragmentShader(resolveFlameConfig());
  const disabled = createFragmentShader(
    resolveFlameConfig({
      fire: {
        intensity: 0,
        plumeHeight: 0.15,
        plumeFrequency: 13,
        flowCycles: 5,
        warmth: 1,
        baseColor: "#FFFFFF",
        tipColor: "#000000"
      }
    })
  );
  assert.equal(disabled, original);
});

test("reaction contours are hollow, periodic, finite, and change topology over time", () => {
  const source = createFragmentShader(
    resolveFlameConfig({ fire: { intensity: 1 } })
  );
  const helpers = ["flameHash", "flameNoise", "flameReaction", "flameFront"]
    .map((name) => {
      const fn = source.match(
        new RegExp(`float ${name}\\(([^)]*)\\) \\{([^}]+)\\}`)
      );
      assert.ok(fn, name);
      return `function ${name}(${fn[1].replace(/float /g, "")}) {${fn[2].replace(/float /g, "let ")}}`;
    })
    .join("\n");
  const generated = new Function(
    "sin",
    "exp",
    "floor",
    "fract",
    "mod",
    "mix",
    "max",
    `${helpers}; return {noise:flameNoise, reaction:flameReaction, front:flameFront};`
  )(
    Math.sin,
    Math.exp,
    Math.floor,
    (v: number) => v - Math.floor(v),
    (a: number, b: number) => a - b * Math.floor(a / b),
    (a: number, b: number, t: number) => a * (1 - t) + b * t,
    Math.max
  ) as {
    noise: (x: number, y: number) => number;
    reaction: (x: number, lift: number, phase: number) => number;
    front: (reaction: number, softness: number) => number;
  };
  assert.equal(generated.front(0, 0.04), 1);
  assert.ok(
    generated.front(0.3, 0.04) < 0.00001,
    "interior stays almost dark, not opaque fill"
  );
  assert.ok(generated.front(-0.3, 0.04) < 0.00001);
  let changing = 0;
  let signChanges = 0;
  for (let ix = 0; ix < 15; ix++)
    for (let iy = 0; iy < 10; iy++) {
      const x = -0.95 + ix * 0.13,
        y = -0.2 + iy * 0.13;
      const noise = generated.noise(x, y);
      assert.ok(noise >= 0 && noise <= 1);
      assert.ok(Math.abs(noise - generated.noise(x, y + 8)) < 1e-12);
      const start = generated.reaction(x, y, 0),
        later = generated.reaction(x, y, 0.7);
      assert.ok(Number.isFinite(start));
      assert.ok(
        Math.abs(start - generated.reaction(x, y, Math.PI * 2)) < 1e-10
      );
      if (Math.abs(start - later) > 0.05) changing++;
      if (Math.sign(start) !== Math.sign(later)) signChanges++;
    }
  assert.ok(changing > 70, `${changing} of 150 field samples visibly change`);
  assert.ok(
    signChanges > 20,
    `${signChanges} of 150 cells ignite or extinguish`
  );
});

test("hue cycle starts in the selected blue, reaches alternate hue, and closes independently", () => {
  const source = createFragmentShader(
    resolveFlameConfig({
      fire: {
        intensity: 1,
        colorCycleSeconds: 32,
        alternateBaseColor: "#167D84",
        alternateTipColor: "#65BDD0"
      }
    })
  );
  const expression = source.match(/float hueCycle = ([^;]+);/)?.[1];
  assert.ok(expression);
  const cycle = new Function("uColorTime", "cos", `return ${expression}`) as (
    t: number,
    cosine: typeof Math.cos
  ) => number;
  assert.equal(cycle(0, Math.cos), 0);
  assert.equal(cycle(16, Math.cos), 1);
  assert.equal(cycle(32, Math.cos), 0);
});

test("ignition is center-out spatial onset with exact off and neutral fully-lit endpoints", () => {
  const source = createFragmentShader(
    resolveFlameConfig({ fire: { intensity: 1 }, ignition: { enabled: true } })
  );
  const fn = source.match(/float flameIgnition\(([^)]*)\) \{([\s\S]+?)\n\}/);
  assert.ok(fn);
  const onset = new Function(
    "x",
    "lift",
    "progress",
    "abs",
    "min",
    "max",
    "exp",
    "smoothstep",
    fn[2].replace(/float /g, "let ")
  ) as (...args: unknown[]) => number;
  const smooth = (a: number, b: number, value: number) => {
    const t = Math.min(1, Math.max(0, (value - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const sample = (x: number, progress: number, lift = 0.1) =>
    onset(x, lift, progress, Math.abs, Math.min, Math.max, Math.exp, smooth);
  for (const x of [-1, -0.5, 0, 0.5, 1]) {
    assert.equal(sample(x, 0), 0);
    assert.equal(sample(x, 1), 1);
  }
  assert.ok(
    sample(0, 0.25) > sample(0.9, 0.25),
    "center ignites before shoulders"
  );
  assert.ok(
    sample(0, 0.25, 0) > sample(0, 0.25, 1),
    "roots ignite before upper membranes"
  );
});
