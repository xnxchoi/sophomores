import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const exists = (path: string) => existsSync(resolve(root, path));

test("graphics modules have explicit React and feature-private ownership", () => {
  for (const path of ["src/components/gl/canvas-frameloop", "src/components/ui/tick-indicator/useSyncedMotionValue"]) {
    assert.equal(exists(`${path}.tsx`), true, path);
    assert.equal(exists(`${path}.ts`), false, path);
  }
  for (const obsolete of ["src/components/gl/layers.ts", "src/components/shell/menu-shaders.ts", "src/components/shell/ticker/field-config.ts", "src/components/ui/tick-indicator/index.ts"]) {
    assert.equal(exists(obsolete), false, obsolete);
  }
  assert.match(read("src/constants/site-layers.ts"), /canvas: 1,[\s\S]*cursor: 40/);
  // The ticker crown and the tape player are stashed for the first release (owner, 24 Nov); see
  // xnxchoi/stash-ticker-tape-20261124.
  assert.equal(exists("src/components/shell/ticker"), false);
  assert.equal(exists("src/components/radio"), false);
  assert.equal(exists("src/components/ui/tick-indicator/TickDial.tsx"), true);
  assert.equal(exists("src/components/ui/tick-indicator/_shared/magnify.ts"), true);
});
