import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Project } from "ts-morph";

const source = readFileSync(new URL("../../../src/components/Warp/warp-field.tsx", import.meta.url), "utf8");
const file = new Project({ useInMemoryFileSystem: true }).createSourceFile("field.tsx", source);

test("formation deforms the production shade coordinates instead of crossfading a halo silhouette", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  assert.match(ringSource, /uniform\s+float\s+uFormation\s*;/);
  assert.match(ringSource, /uFormation\s*>=\s*\$\{CORONA_RESTORE_END\}/, "the completed morph must bypass deformation");
  assert.match(ringSource, /\bshade\(\s*(?:sampleRadius|sourceRadius|deformedRadius)\s*,/, "sample the original material at deformed radial coordinates");
  assert.doesNotMatch(ringSource, /\b(?:vec3\s+(?:innerVeil|outerVeil)|float\s+(?:gather|release))\b/, "remove the rejected temporary halo composition");
  for (const uniform of ["uCoreRadius", "uCoreSoftness", "uCoreTransfer", "uCoreBrightness"]) {
    assert.match(ringSource, new RegExp(`uniform\\s+float\\s+${uniform}\\s*;`));
  }
  assert.match(ringSource, /\bwarpRingMain\(\);/, "keep the production material as the final endpoint");
  assert.equal(ringSource.match(/<mesh\b/g)?.length, 1, "the intermediate beat must not add another ring node");
});

test("interior support lasts beyond radial formation but ends at the original corona endpoint", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  for (const name of ["uInteriorBrightness", "uInteriorBloom", "uInteriorBlur", "uEdgeBlur"]) {
    assert.match(ringSource, new RegExp(`uniform\\s+float\\s+${name}\\s*;`));
  }
  assert.match(ringSource, /uniform\s+vec3\s+uInteriorColor\s*;/);
  assert.match(ringSource, /smoothstep\(\s*\.01\s*,\s*\.18\s*,\s*uFormation\s*\)/);
  assert.match(ringSource, /1\.0\s*-\s*smoothstep\(\s*\.45\s*,\s*1\.0\s*,\s*uFormation\s*\)/);
  assert.doesNotMatch(ringSource, /\.006\b/, "the intermediate edge must no longer sharpen before blurring");
});

test("interior light preserves underlying detail instead of replacing it with a flat radiance floor", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  assert.match(
    ringSource,
    /float detail\s*=\s*smoothstep\(\s*\.05\s*,\s*\.7\s*,\s*morph\s*\)\s*;/,
    "surface detail becomes visible earlier rather than retaining a flat carrier through most formation"
  );
  assert.match(
    ringSource,
    /vec3 interiorLight\s*=\s*clamp\(uInteriorColor\s*\*\s*radiance,\s*vec3\(0\.0\),\s*vec3\(\.9\)\)\s*;/,
    "extreme light controls must retain at least ten percent underlying contrast"
  );
  assert.match(
    ringSource,
    /gl_FragColor\.rgb\s*\+=\s*interiorLight\s*\*\s*\(vec3\(1\.0\)\s*-\s*clamp\(gl_FragColor\.rgb,\s*0\.0,\s*1\.0\)\)\s*;/,
    "add interior radiance only into available color headroom, retaining surface variation"
  );
  assert.doesNotMatch(
    ringSource,
    /max\(\s*gl_FragColor\.rgb\s*,\s*uInteriorColor\s*\*\s*radiance\s*\)/,
    "a radiance floor erases all underlying differences below it"
  );
  assert.match(
    ringSource,
    /float radiance\s*=\s*\(fill\s*\*\s*uInteriorBrightness\s*\+\s*bloom\s*\*\s*uInteriorBloom\)\s*\*\s*interiorEnvelope\s*\*\s*uCoreTransfer\s*;/,
    "interior light remains independent of the surface brightness instead of clipping against it"
  );
});

test("interior light reaches the opening rim instead of forming an isolated central orb", () => {
  const source = file.getFunctionOrThrow("Ring").getText();
  const reach = source.match(/interiorRadius \* mix\(([^,]+), ([^,]+), softness\)/);
  assert.ok(reach, "interior reach remains relative to the opening radius");
  assert.ok(Number(reach[1]) >= 1, "even the tightest fill must reach the rim");
  assert.ok(Number(reach[2]) > Number(reach[1]), "blur spreads the fill outward");
});

test("surface shading runs only when its detail weight contributes to the forming ring", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  assert.match(ringSource, /vec3\s+resolved\s*=\s*carrier\s*;/);
  assert.match(ringSource, /if\s*\(detail\s*>\s*0\.0\)\s*\{\s*vec3 surface = shade\(deformedRadius, theta, phase, 0\.0\);[\s\S]*?resolved = mix\(carrier, textured, detail\);\s*\}/);
  assert.match(ringSource, /gl_FragColor = vec4\(resolved \* uCoreTransfer, 1\.0\)/);
  assert.match(ringSource, /uFormation\s*>=\s*\$\{CORONA_RESTORE_END\}[\s\S]*?warpRingMain\(\);/, "the production endpoint remains the same shader");
});
