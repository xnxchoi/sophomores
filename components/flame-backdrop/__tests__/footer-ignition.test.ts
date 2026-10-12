import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { resolveFlameConfig } from "../config";
import { resolveFooterConfig } from "../FlameFooterBackdrop";
import { createFragmentShader } from "../shaders";

const smoothstep = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function compileScalar(source: string, name: string) {
  const fn = source.match(
    new RegExp(`float ${name}\\(([^)]*)\\) \\{([\\s\\S]+?)\\n\\}`)
  );
  assert.ok(fn, name);
  return new Function(
    fn[1].replace(/float /g, ""),
    "smoothstep",
    "min",
    "abs",
    fn[2].replace(/float /g, "let ")
  );
}
const shader = () => createFragmentShader(resolveFooterConfig(), "substance");

test("short-duration normalization leaves the default burst shader byte-identical", () => {
  assert.equal(
    createHash("sha256").update(shader()).digest("hex"),
    "7011dc44bf3f3ea140b051dcf18c8cd1bf0c7de88367b2c1cd63971ec7424c19"
  );
});

test("only an emitting substance footer with enabled ignition receives the burst", () => {
  assert.match(shader(), /float footerIgnitionHeight/);
  for (const config of [
    resolveFlameConfig({ fire: { intensity: 1 }, ignition: { enabled: true } }),
    resolveFooterConfig({ fire: { intensity: 0 } }),
    resolveFooterConfig({ ignition: { enabled: false } })
  ])
    assert.doesNotMatch(
      createFragmentShader(config, "substance"),
      /footerIgnitionHeight/
    );
  assert.doesNotMatch(
    createFragmentShader(resolveFooterConfig()),
    /footerIgnitionHeight/
  );
});

test("burst catches low, rises quickly, overshoots once and settles by 650ms", () => {
  const height = compileScalar(shader(), "footerIgnitionHeight");
  const at = (seconds: number) =>
    height(seconds, smoothstep, Math.min, Math.abs) as number;
  assert.equal(at(0), 0.2);
  assert.ok(at(0.06) < 0.3);
  assert.equal(at(0.22), 1.08);
  assert.equal(at(0.65), 1);
  assert.equal(at(1.6), 1);
  let previous = at(0);
  for (let ms = 1; ms <= 220; ms++) {
    const value = at(ms / 1000);
    assert.ok(value >= previous && value <= 1.08);
    previous = value;
  }
  for (let ms = 221; ms <= 650; ms++) {
    const value = at(ms / 1000);
    assert.ok(value <= previous && value >= 1);
    previous = value;
  }
});

test("existing clock drives near-simultaneous catch, restrained gain and exact endpoints", () => {
  const ignition = compileScalar(shader(), "flameIgnition");
  const at = (x: number, seconds: number) =>
    ignition(x, 0.5, seconds / 1.6, smoothstep, Math.min, Math.abs) as number;
  for (const x of [-1, -0.5, 0, 0.5, 1]) {
    assert.equal(at(x, 0), 0);
    assert.equal(at(x, 0.65), 1);
    assert.equal(at(x, 1.6), 1);
    assert.ok(at(x, 0.08) >= 1);
    assert.ok(at(x, 0.22) > 1 && at(x, 0.22) <= 1.12);
  }
  assert.ok(
    at(0, 0.03) > at(1, 0.03),
    "a slight catch stagger, not a slow center-out sweep"
  );
  const other = createFragmentShader(
    resolveFooterConfig({ ignition: { durationSeconds: 2 } }),
    "substance"
  );
  assert.match(other, /float seconds = progress \* 2\.0/);
});

test("transient moves the vertical field without adding clocks or altering settled coordinates", () => {
  const source = shader();
  assert.match(
    source,
    /if \(uIgnitionProgress < 1\.0 && uIgnitionProgress \* 1\.6 < \.65\)/
  );
  assert.match(
    source,
    /p\.y \/= footerIgnitionHeight\(uIgnitionProgress \* 1\.6\)/
  );
  const uniforms = (text: string) => text.match(/uniform [^;]+;/g);
  assert.deepEqual(
    uniforms(source),
    uniforms(createFragmentShader(resolveFooterConfig()))
  );
  assert.doesNotMatch(
    source,
    /spark|flash|uBurst|uIgnitionTime|sampler|texture2D/
  );
});

test("short durations compress the entire burst without an endpoint snap", () => {
  for (const durationSeconds of [0.1, 0.3]) {
    const source = createFragmentShader(
      resolveFooterConfig({ ignition: { durationSeconds } }),
      "substance"
    );
    assert.match(source, /float seconds = progress \* 0\.65/);
    assert.match(
      source,
      /p\.y \/= footerIgnitionHeight\(uIgnitionProgress \* 0\.65\)/
    );
    const height = compileScalar(source, "footerIgnitionHeight");
    const ignition = compileScalar(source, "flameIgnition");
    const nearEnd = 1 - 1e-5;
    assert.ok(
      Math.abs(height(nearEnd * 0.65, smoothstep, Math.min, Math.abs) - 1) <
        1e-8
    );
    for (const x of [-1, 0, 1]) {
      assert.ok(
        Math.abs(
          ignition(x, 0.5, nearEnd, smoothstep, Math.min, Math.abs) - 1
        ) < 1e-8
      );
      assert.equal(ignition(x, 0.5, 1, smoothstep, Math.min, Math.abs), 1);
    }
  }
});
