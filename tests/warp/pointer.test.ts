import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { DEFAULT_WARP_TUNING } from "../../components/Warp/_shared/tuning";

const source = readFileSync(
  new URL("../../components/Warp/warp-field.tsx", import.meta.url),
  "utf8"
)
  // Compare wiring independent of Prettier line wraps and equivalent numeric spelling.
  .replace(/\s+/g, " ")
  .replace(/\b0\.(\d+)/g, ".$1")
  .replace(/\(\s+/g, "(")
  .replace(/\s+\)/g, ")")
  .replace(/,\s*\)/g, ")");
const shaderPath = new URL(
  "../../components/Warp/warp-shaders.ts",
  import.meta.url
);
const filamentShader = existsSync(shaderPath)
  ? readFileSync(shaderPath, "utf8")
  : "";

test("source contract: pointer selection changes filament light only, never geometry", () => {
  assert.match(filamentShader, /uniform vec2 uHoverPointer/);
  assert.match(
    filamentShader,
    /float focusWidth = mix\(1\.65, \.13, smoothstep\(\.025, \.55, pointerDistance\)\)/
  );
  assert.match(
    filamentShader,
    /atan\(sin\(rayDirection - pointerAngle\), cos\(rayDirection - pointerAngle\)\)/
  );
  assert.match(filamentShader, /selected = .*uHover/);
  assert.match(
    filamentShader,
    /light \+= tint \* \(core \+ halo \+ activeHalo\)/
  );
  assert.match(
    filamentShader,
    /vec2 p = \(vUv - \.5\) \* uViewport \/ min\(uViewport\.x, uViewport\.y\)/
  );
  assert.doesNotMatch(
    filamentShader,
    /warpPointer|bentOffset|rayPoint|p\s*\+=|angle\s*\+=/
  );
});

test("source contract: hover visibly lifts dim rays with a bounded additive contribution", () => {
  assert.equal(DEFAULT_WARP_TUNING.hoverStrength, 0.24);
  assert.match(
    source,
    /const strength = target\.active && hoverSeconds > 0 \? tuning\.hoverStrength : 0/
  );
  assert.match(source, /target\.startedAt\) \/ 1000 - \.06/);
  assert.match(
    filamentShader,
    /float hoverGain = 1\.0 \+ min\(selected \* \.8, \.2\)/
  );
  assert.match(filamentShader, /weight \* envelope \* hoverGain/);
  assert.match(
    filamentShader,
    /float hoverLight = min\(selected \* \.45, \.12\)/
  );
  assert.match(
    filamentShader,
    /\(weight \* envelope \* hoverGain \+ hoverLight\) \* fade \* reveal/
  );
  assert.match(
    filamentShader,
    /float activeHalo = halo \* min\(selected, \.12\) \* \.05/
  );
  assert.doesNotMatch(filamentShader, /activeTint|selected \* 5\.0/);
  assert.match(
    filamentShader,
    /vec3\(1\.0\) \* \(core \* uPointBrightness \* uShowPoint \+ bloom \* uBloomStrength \* uShowBloom\) \* uPoint \* uOpening/
  );
});

test("source contract: brighter baseline stays bounded and retains opening and settlement darkness", () => {
  assert.ok(
    DEFAULT_WARP_TUNING.rayIntensity >= 1.2 &&
      DEFAULT_WARP_TUNING.rayIntensity <= 1.45,
    "baseline optical intensity should reach pearl-white peaks without restoring hover surge"
  );
  assert.match(
    source,
    /uIntensity: \{ value: DEFAULT_WARP_TUNING\.rayIntensity \}/
  );
  assert.match(source, /current\.uIntensity\.value = tuning\.rayIntensity/);
  assert.match(filamentShader, /light = 1\.0 - exp\(-light \* uIntensity\)/);
  assert.match(source, /current\.uOpening\.value = opening\.get\(\)/);
  assert.match(
    filamentShader,
    /revealEase\(revealStart, revealStart \+ \.58, uOpening\)/
  );
  assert.match(filamentShader, /light \*= aperture \* uRays/);
  assert.match(
    source,
    /1 - MathUtils\.smoothstep\(settlement\.get\(\), 0, 1\)/
  );
});

test("source contract: gentle moving angular weights preserve light in every direction without the old peaks", () => {
  assert.match(
    filamentShader,
    /pow\(abs\(cos\(rayDirection - 1\.02\)\), 5\.0\)/
  );
  assert.match(
    filamentShader,
    /pow\(abs\(cos\(rayDirection - 2\.00\)\), 6\.0\)/
  );
  assert.match(
    filamentShader,
    /float drift = \.5 \+ \.5 \* sin\(3\.0 \* rayDirection - \.24 \* uTime \+ h \* 2\.0\)/
  );
  const weight = filamentShader.match(
    /float weight = \(([.\d]+) \+ bundle \* ([.\d]+) \+ drift \* ([.\d]+)\) \* \(([.\d]+) \+ hash\(seed \+ 8\.0\)\)/
  );
  assert.ok(
    weight,
    "ray weight must retain an explicit nonzero directional floor"
  );
  const [floor, bundle, drift, minimum] = weight.slice(1).map(Number);
  // Source-derived coefficient bounds, not a claim of GPU/image acceptance.
  assert.ok(
    floor * minimum >= 0.064,
    "even left/right ray minima cannot fall into the old dark gaps"
  );
  assert.ok(
    (floor + bundle + drift) * (minimum + 1) < 1,
    "broader illumination must not retain the old bright peaks"
  );
});

test("source contract: the original ring restores color from its inner rim only during settlement", () => {
  const ring = source.slice(
    source.indexOf("function Ring("),
    source.indexOf("function FieldFallback(")
  );
  assert.match(ring, /#define main warpRingMain/);
  assert.match(ring, /const config = resolveFlameConfig\(/);
  assert.match(ring, /createFragmentShader\(config\)/);
  assert.match(ring, /#undef main/);
  assert.match(ring, /warpRingMain\(\);/);
  assert.match(ring, /uniform float uSettlement/);
  // Optional tuning runs after the production material; settlement still owns
  // the monochrome-to-color transition and returns before its luma conversion.
  assert.match(ring, /if \(uRingSaturation != 1\.0\)/);
  assert.match(ring, /float brightness = uRingBrightness/);
  assert.match(
    ring,
    /if \(brightness != 1\.0\) gl_FragColor\.rgb \*= brightness/
  );
  assert.ok(
    ring.indexOf("warpRingMain();") <
      ring.indexOf("if (uSettlement >= 1.0) return;")
  );
  assert.ok(
    ring.indexOf("if (uSettlement >= 1.0) return;") <
      ring.indexOf("float luma =")
  );
  assert.match(
    ring,
    /float radius = length\(\(vUv - \.5\) \* uScale - uOrigin\)/
  );
  assert.match(
    ring,
    /float front = mix\(\.22, \.82, smoothstep\(\.12, 1\.0, uSettlement\)\)/
  );
  assert.match(
    ring,
    /smoothstep\(\.12, \.24, uSettlement\) \* \(1\.0 - smoothstep\(front - \.08, front \+ \.08, radius\)\)/
  );
  assert.doesNotMatch(ring, /uArrival|mix\(\.18, 1\.0/);
  assert.match(
    ring,
    /dot\(gl_FragColor\.rgb, vec3\(\.2126, \.7152, \.0722\)\)/
  );
  assert.match(
    ring,
    /gl_FragColor\.rgb = mix\(vec3\(luma\), gl_FragColor\.rgb, saturation\)/
  );
});

test("source contract: the same ring follows the production corona zoom and vertical travel", () => {
  assert.match(
    source,
    /import \{ backdropTokens \} from "@\/lib\/teaser\/backdrop-tokens"/
  );
  assert.match(source, /coronaProgress\?: MotionValue<number>/);
  const ring = source.slice(
    source.indexOf("function Ring("),
    source.indexOf("function FieldFallback(")
  );
  assert.match(ring, /const corona = coronaProgress\?\.get\(\) \?\? 0/);
  assert.match(
    ring,
    /frame\.ringScale \* ringScale \* \(1 \+ corona \* backdropTokens\.scrollZoom\)/
  );
  assert.match(
    ring,
    /current\.uOrigin\.value\.set\(0, \(-size\.height \* \(\(corona \* backdropTokens\.scrollY\) \/ 100\)\) \/ side\)/
  );
  assert.match(
    source,
    /<Ring progress=\{progress\} coronaProgress=\{coronaProgress\} settlement=\{settlement\} tuning=\{tuning\} \/>/
  );
  assert.doesNotMatch(source, /<Filaments[^>]*coronaProgress/);
  assert.equal((source.match(/<Canvas\b/g) ?? []).length, 1);
  assert.match(source, /frameloop=\{active \? "always" : "demand"\}/);
});

test("source contract: the ring clock stays frozen until full color and immediately refreezes on reverse", () => {
  assert.match(source, /settlement: MotionValue<number>/);
  const ring = source.slice(
    source.indexOf("function Ring("),
    source.indexOf("function FieldFallback(")
  );
  assert.match(ring, /const motionSpeed = useRef\(0\)/);
  assert.match(
    ring,
    /motionSpeed\.current = colorSettlement >= 1 \? MathUtils\.damp\(motionSpeed\.current, 1, 3, step\) : 0/
  );
  assert.match(ring, /elapsed\.current \+= step \* motionSpeed\.current/);
  assert.doesNotMatch(
    ring,
    /elapsed\.current\s*=|performance\.now|clock\.elapsedTime/
  );
  assert.match(ring, /current\.uTime\.value = elapsed\.current/);
});

test("source contract: color waits for a responsive sixty-viewport-width gate capped at the original landing", () => {
  const ring = source.slice(
    source.indexOf("function Ring("),
    source.indexOf("function FieldFallback(")
  );
  assert.match(ring, /const frame = getWarpFrame\(progress\.get\(\)\)/);
  assert.match(
    ring,
    /const diameter = \.7 \* Math\.min\(size\.width, size\.height\) \* frame\.ringScale \* ringScale/
  );
  assert.match(
    ring,
    /const colorThreshold = Math\.min\(\.6 \* size\.width, \.7 \* Math\.min\(size\.width, size\.height\) \* backdropTokens\.heroScale\)/
  );
  assert.match(
    ring,
    /const colorSettlement = diameter >= colorThreshold \? MathUtils\.smoothstep\(settlement\.get\(\), CORONA_RESTORE_END, 1\) : 0/
  );
  assert.match(ring, /current\.uSettlement\.value = colorSettlement/);
});

test("source contract: travelling filaments persist to landing and dissolve alongside settlement", () => {
  const filaments = source.slice(
    source.indexOf("function Filaments("),
    source.indexOf("function Ring(")
  );
  assert.match(
    filaments,
    /elapsed\.current \+= Math\.min\(delta, \.05\) \* tuning\.motionSpeed/
  );
  assert.match(
    filaments,
    /current\.uRays\.value = MathUtils\.lerp\(1, \.45, MathUtils\.smoothstep\(progress\.get\(\), 0, \.74\)\) \* \(1 - MathUtils\.smoothstep\(settlement\.get\(\), 0, 1\)\) \* Number\(tuning\.showRays\)/
  );
  assert.doesNotMatch(filaments, /current\.uRays\.value = frame\.rayOpacity/);
  assert.match(
    source,
    /<Filaments progress=\{progress\} opening=\{opening\} settlement=\{settlement\} onReady=\{onReady\} tuning=\{tuning\} \/>/
  );
});

test("source contract: hover retains native library damping and does not reach the ring", () => {
  assert.match(source, /MathUtils\.damp\(/);
  assert.match(source, /getBoundingClientRect\(\)/);
  assert.match(source, /Math\.min\(rect\.width, rect\.height\)/);
  const ring = source.slice(
    source.indexOf("function Ring("),
    source.indexOf("function FieldFallback(")
  );
  assert.match(ring, /pointer: \{ enabled: false \}/);
  assert.doesNotMatch(ring, /uHover|hoverTarget/);
  assert.match(filamentShader, /light \*= aperture \* uRays/);
});

test("source contract: supplied five-layer flow and progressive reveal remain the animation basis", () => {
  assert.match(filamentShader, /for \(int layer = 0; layer < 5; layer\+\+\)/);
  assert.match(
    filamentShader,
    /for \(int neighbor = -1; neighbor <= 1; neighbor\+\+\)/
  );
  assert.match(
    filamentShader,
    /log\(max\(radius, \.008\)\) \* 1\.8 - uTime \* \(1\.5 \+ h \* 1\.3\)/
  );
  assert.match(filamentShader, /pow\(\.5 \+ \.5 \* sin\(travel\), 7\.0\)/);
  assert.match(filamentShader, /\.42 \* rank \/ max\(totalRays - 1\.0, 1\.0\)/);
  assert.match(source, /useRef\(2\.4\)/);
  assert.match(source, /heartbeat: \.025/);
});

test("source contract: passive pointer lifecycle ignores controls and requires touch contact", () => {
  assert.match(source, /closest\("\[data-warp-controls\]"\)/);
  assert.match(source, /event\.pointerType === "touch"/);
  assert.match(source, /event\.type === "pointerdown"/);
  assert.match(source, /contactId !== event\.pointerId/);
  for (const event of [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "pointerout"
  ]) {
    assert.match(
      source,
      new RegExp(`document\\.addEventListener\\("${event}"[^\\n]+passive: true`)
    );
    assert.match(
      source,
      new RegExp(`document\\.removeEventListener\\("${event}"`)
    );
  }
  assert.match(source, /window\.addEventListener\("blur", resetHover\)/);
  assert.match(
    source,
    /document\.addEventListener\("visibilitychange", resetHover\)/
  );
  assert.doesNotMatch(
    source,
    /preventDefault\(|setPointerCapture\(|capture: true/
  );
});
