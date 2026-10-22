import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveFlameConfig } from "../config";
import { resolveFooterConfig } from "../FlameFooterBackdrop";
import { createFragmentShader } from "../shaders";

const smoothstep = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
const shader = (durationSeconds = 1.6, sweepFraction = 0.55) =>
  createFragmentShader(
    resolveFooterConfig({ ignition: { durationSeconds, sweepFraction } }),
    "substance"
  );

// Execute the generated scalar GLSL, not a second copy of the ignition model.
function compileIgnition(source: string) {
  const names = ["footerIgnitionLocal", "footerIgnitionHeight", "flameIgnition"];
  const functions = names.map((name) => {
    const fn = source.match(
      new RegExp(`float ${name}\\(([^)]*)\\) \\{([\\s\\S]+?)\\n\\}`)
    );
    assert.ok(fn, name);
    return `function ${name}(${fn[1].replace(/float /g, "")}) {${fn[2].replace(/float /g, "let ")}\n}`;
  });
  return new Function(
    "smoothstep", "clamp", "asin",
    `${functions.join("\n")}\nreturn { local: footerIgnitionLocal, height: footerIgnitionHeight, gain: flameIgnition };`
  )(smoothstep, clamp, Math.asin) as {
    local: (x: number, progress: number) => number;
    height: (x: number, progress: number) => number;
    gain: (x: number, lift: number, progress: number) => number;
  };
}

test("only an emitting substance footer with enabled ignition receives domino ignition", () => {
  assert.match(shader(), /float footerIgnitionLocal/);
  for (const config of [
    resolveFlameConfig({ fire: { intensity: 1 }, ignition: { enabled: true } }),
    resolveFooterConfig({ fire: { intensity: 0 } }),
    resolveFooterConfig({ ignition: { enabled: false } })
  ]) assert.doesNotMatch(createFragmentShader(config, "substance"), /footerIgnitionLocal/);
  assert.doesNotMatch(createFragmentShader(resolveFooterConfig()), /footerIgnitionLocal/);
});

test("catch travels left to crown to right at uniform angular speed, not a linear wipe", () => {
  const { local, gain } = compileIgnition(shader());
  for (const arrival of [0, 0.2, 0.5, 0.8, 1]) {
    const x = Math.sin((arrival - 0.5) * Math.PI);
    assert.ok(Math.abs(local(x, arrival * 0.55)) < 1e-12);
    assert.equal(gain(x, 0.5, Math.max(0, arrival * 0.55 - 0.001)), 0);
    assert.ok(gain(x, 0.5, arrival * 0.55 + 0.01) > 0);
  }
  assert.ok(gain(-0.8, 0.5, 0.25) > 1);
  assert.equal(gain(0, 0.5, 0.25), 0);
  assert.equal(gain(0.8, 0.5, 0.25), 0);
  assert.ok(gain(0, 0.5, 0.45) > 1);
  assert.equal(gain(0.95, 0.5, 0.45), 0);
  assert.equal(local(-2, 0.25), local(-1, 0.25));
  assert.equal(local(2, 0.75), local(1, 0.75));
});

test("each sector catches low, rises to one bounded overshoot, then settles independently", () => {
  const { height, gain } = compileIgnition(shader());
  for (const x of [-1, -0.5, 0, 0.5, 1]) {
    const arrival = (Math.asin(x) / Math.PI + 0.5) * 0.55;
    const at = (age: number) => height(x, arrival + age * 0.45);
    assert.equal(at(0), 0.2);
    assert.ok(at(0.08) < 0.3);
    assert.ok(Math.abs(at(0.3) - 1.08) < 1e-12);
    assert.equal(at(1), 1);
    for (let step = 0; step <= 1000; step++) {
      const progress = step / 1000;
      assert.ok(height(x, progress) >= 0.2 && height(x, progress) <= 1.08);
      assert.ok(gain(x, 0.5, progress) >= 0 && gain(x, 0.5, progress) <= 1.12);
      if (step > 0) {
        const age = step / 1000;
        const previous = at((step - 1) / 1000);
        assert.ok(age <= 0.3 ? at(age) >= previous : at(age) <= previous);
      }
    }
  }
});

test("short durations and sweep boundaries retain a continuous final-sector settle", () => {
  for (const duration of [0.1, 0.3, 1.6, 10]) {
    for (const sweep of [0.1, 0.55, 0.9]) {
      const { local, height, gain } = compileIgnition(shader(duration, sweep));
      assert.ok(Math.abs(local(1, sweep)) < 1e-12);
      for (const x of [-2, -1, -0.5, 0, 0.5, 1, 2]) {
        assert.equal(height(x, 0), 0.2);
        assert.equal(gain(x, 0.5, 0), 0);
        assert.equal(height(x, 1), 1);
        assert.equal(gain(x, 0.5, 1), 1);
        assert.equal(height(x, 2), 1);
        assert.equal(gain(x, 0.5, 2), 1);
        assert.ok(Math.abs(height(x, 1 - 1e-5) - 1) < 1e-8);
        assert.ok(Math.abs(gain(x, 0.5, 1 - 1e-5) - 1) < 1e-8);
      }
    }
  }
});

test("plumes rise relative to their arc root, without deforming the rim or adding clocks", () => {
  const source = shader();
  const flame = source.match(/vec3 alcoholFlame[\s\S]+?\n\}/)?.[0] ?? "";
  assert.match(flame, /if \(uIgnitionProgress < 1\.0\)/);
  assert.match(flame, /point\.y = rootY \+ \(point\.y - rootY\) \/ footerIgnitionHeight\(point\.x \/ ringRadius, uIgnitionProgress\)/);
  const main = source.slice(source.indexOf("void main()"));
  assert.doesNotMatch(main, /footerIgnition|p\.y \/=/);
  const uniforms = (text: string) => text.match(/uniform [^;]+;/g);
  assert.deepEqual(uniforms(source), uniforms(createFragmentShader(resolveFooterConfig())));
  assert.doesNotMatch(source, /spark|flash|uBurst|uIgnitionTime|sampler|texture2D/);
});
