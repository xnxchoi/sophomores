import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const exists = (path: string) => existsSync(resolve(root, path));

test("graphics modules have explicit React and feature-private ownership", () => {
  for (const path of ["src/components/gl/canvas-frameloop", "src/components/shell/ticker/useBezelDisplacementTexture", "src/components/ui/tick-indicator/useSyncedMotionValue", "src/components/shell/ticker/useLaneScheduler"]) {
    assert.equal(exists(`${path}.tsx`), true, path);
    assert.equal(exists(`${path}.ts`), false, path);
  }
  for (const obsolete of ["src/components/gl/layers.ts", "src/components/shell/menu-shaders.ts", "src/components/shell/ticker/field-config.ts", "src/components/ui/tick-indicator/index.ts"]) {
    assert.equal(exists(obsolete), false, obsolete);
  }
  assert.match(read("src/constants/site-layers.ts"), /canvas: 1,[\s\S]*cursor: 40/);
  const config = read("src/components/shell/ticker/_shared/field-config.ts");
  assert.doesNotMatch(config, /useLaneScheduler|["']use client["']|from ["']react["']/);
  assert.match(read("src/components/shell/ticker/useLaneScheduler.tsx"), /from ["']\.\/_shared\/field-config["']/);
  assert.match(read("src/components/radio/progress-rail.tsx"), /from ["']@\/components\/ui\/tick-indicator\/TickIndicator["']/);
  assert.equal(exists("src/components/ui/tick-indicator/TickDial.tsx"), true);
  assert.equal(exists("src/components/ui/tick-indicator/_shared/magnify.ts"), true);
});
