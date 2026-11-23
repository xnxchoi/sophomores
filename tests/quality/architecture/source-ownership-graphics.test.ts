import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

const root = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const exists = (path: string) => existsSync(resolve(root, path));
const digest = (source: string) => createHash("sha256").update(source).digest("hex");
const current = (base: string) => read(`${base}.${exists(`${base}.tsx`) ? "tsx" : "ts"}`);

// Baselines were captured before relocation. These tests read source rather than
// mounting React/WebGL: GPU lifecycle and scheduler code must remain byte-exact.
test("graphics hook relocation preserves lifecycle and frame-claim implementations", () => {
  for (const [path, expected] of [
  ["src/components/gl/canvas-frameloop", "0617a1e8b9dc626342a5c34992412931e656dbe069aa95b13309e3c6d72f598c"],
  ["src/components/ui/tick-indicator/useSyncedMotionValue", "a8ee432e2b7ded719cc1bb4e267efb3c3aa99590fd6c16ed5d7490d82caeb7be"],
  ]) assert.equal(digest(current(path)), expected, path);
});

test("menu shader strings preserve every original GLSL byte", () => {
  const source = exists("src/components/shell/menu-shaders.ts")
    ? read("src/components/shell/menu-shaders.ts")
    : read("src/components/shell/menu-gradient.tsx");
  const ast = ts.createSourceFile("menu.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const values = new Map<string, string>();
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer && ts.isStringLiteral(declaration.initializer)) {
        values.set(declaration.name.text, declaration.initializer.text);
      }
    }
  }
  for (const [name, expected] of Object.entries({"menuVertexShader": "b55bc18530098593dfd473a017ffa803aa28d9f648321f3062fb862ce897ec24", "menuFragmentShader": "8b37d74114ab4335898576006ae4d1d236c54ec68eefac6e283250b7aaa75fe5"})) {
    assert.equal(digest(values.get(name) ?? ""), expected, name);
  }
});

// The ticker crown's scheduler and field config are stashed with it (owner, 24 Nov: out of scope for the first release;
// branch xnxchoi/stash-ticker-tape-20261124 keeps them and these digests' sources).
test("menu gradient geometry remains exact", () => {
  assert.match(read("src/components/shell/menu-gradient.tsx"), /planeGeometry args=\{\[1\.5, 1\.5, 128, 128\]\}/);
});
