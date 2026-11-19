import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("developer presentation resolves captions without translating easing or grouping protocol", () => {
  const controls = readFileSync("src/components/Warp/dev-controls.tsx", "utf8");
  const inspector = readFileSync("src/components/Warp/editor/clip-inspector.tsx", "utf8");
  assert.match(controls, /group === "Interior"/);
  assert.match(inspector, /\["x1", "y1", "x2", "y2"\]/);
  assert.match(inspector, /useTranslations\("Developer\.clipInspector"\)/);
  assert.match(inspector, /value=\{item\.label\}/);
  assert.match(inspector, /sequenceText\(metadata\.descriptionKey\)/);
  assert.match(controls, /tuningText\(control\.labelKey\)/);
  assert.doesNotMatch(controls, /aria-label=\{control\.label\}/);
});
