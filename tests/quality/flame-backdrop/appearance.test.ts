import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sampleBodyMaterialLighting } from "@/components/gl/flame-backdrop/field/body-material";
import { emissionGainAt, referenceConfig } from "@/components/gl/flame-backdrop/field/material";
import { createGasFlameShader } from "@/components/gl/flame-backdrop/field/gas-shader";
import { historicalReferenceConfig } from "../../flame-backdrop/support/historical-colours";

const current = JSON.parse(
  readFileSync(
    new URL("../../flame-backdrop/fixtures/appearance/current.json", import.meta.url),
    "utf8"
  )
);

test("centralization preserves the current generated shader structure, Float32 values, lighting and gains", () => {
  const before = readFileSync(
    new URL("../../flame-backdrop/fixtures/appearance/footer-current.glsl", import.meta.url),
    "utf8"
  );
  assert.equal(
    createHash("sha256").update(before).digest("hex"),
    current.shaderHash
  );
  const after = createGasFlameShader(historicalReferenceConfig(1440, 900));
  const token = /(?<![\w.])(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?(?![\w.])/g;
  assert.deepEqual(after.split(token), before.split(token));
  const original = [...before.matchAll(token)];
  const generated = [...after.matchAll(token)];
  assert.equal(generated.length, original.length);
  original.forEach((number, i) =>
    assert.equal(
      Math.fround(Number(generated[i][0])),
      Math.fround(Number(number[0]))
    )
  );
  for (const { input, result } of current.lighting) {
    const actual = sampleBodyMaterialLighting(input);
    for (const key of Object.keys(actual) as Array<keyof typeof actual>)
      assert.ok(Math.abs(actual[key] - result[key]) < 1e-12);
  }
  for (const { time, result } of current.gains)
    assert.equal(emissionGainAt(time), result);
  assert.equal(
    createHash("sha256")
      .update(
        readFileSync(
          new URL("../../../public/masks/flame-envelope.png", import.meta.url)
        )
      )
      .digest("hex"),
    current.maskHash
  );
});

test("front softness remains a real configurable shader input rather than a duplicated annotation", () => {
  const config = referenceConfig(1440, 900);
  const changed = createGasFlameShader({
    ...config,
    fire: { ...config.fire, frontSoftness: 0.07 }
  });
  assert.match(changed, /float softness = 0\.07 \+/);
  assert.doesNotMatch(changed, /float softness = 0\.045 \+/);
});
