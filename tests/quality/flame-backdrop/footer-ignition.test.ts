import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveFlameConfig } from "@/components/gl/flame-backdrop/config";
import { resolveFooterConfig } from "@/components/gl/flame-backdrop/FlameFooterBackdrop";
import { createFragmentShader } from "@/components/gl/flame-backdrop/shaders";

const shader = (durationSeconds = 1.6, sweepFraction = 0.55) =>
  createFragmentShader(
    resolveFooterConfig({ ignition: { durationSeconds, sweepFraction } }),
    "substance"
  );

test("only an emitting substance footer with enabled ignition receives domino ignition", () => {
  assert.match(shader(), /float footerIgnitionLocal/);
  for (const config of [
    resolveFlameConfig({ fire: { intensity: 1 }, ignition: { enabled: true } }),
    resolveFooterConfig({ fire: { intensity: 0 } }),
    resolveFooterConfig({ ignition: { enabled: false } })
  ])
    assert.doesNotMatch(
      createFragmentShader(config, "substance"),
      /footerIgnitionLocal/
    );
  assert.doesNotMatch(
    createFragmentShader(resolveFooterConfig()),
    /footerIgnitionLocal/
  );
});

test("plumes rise relative to their arc root, without deforming the rim or adding clocks", () => {
  const source = shader();
  const flame = source.match(/vec3 alcoholFlame[\s\S]+?\n\}/)?.[0] ?? "";
  assert.match(flame, /if \(uIgnitionProgress < 1\.0\)/);
  assert.match(
    flame,
    /point\.y = rootY \+ \(point\.y - rootY\) \/ footerIgnitionHeight\(point\.x \/ ringRadius, uIgnitionProgress\)/
  );
  const main = source.slice(source.indexOf("void main()"));
  assert.doesNotMatch(main, /footerIgnition|p\.y \/=/);
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
