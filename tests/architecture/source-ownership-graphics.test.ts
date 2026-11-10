import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const exists = (path: string) => existsSync(resolve(root, path));
const digest = (source: string) => createHash("sha256").update(source).digest("hex");
const current = (base: string) => read(`${base}.${exists(`${base}.tsx`) ? "tsx" : "ts"}`);

// Baselines were captured before relocation. These tests read source rather than
// mounting React/WebGL: GPU lifecycle and scheduler code must remain byte-exact.
test("graphics hook relocation preserves lifecycle and frame-claim implementations", () => {
  for (const [path, expected] of [
  ["src/components/gl/canvas-frameloop", "0617a1e8b9dc626342a5c34992412931e656dbe069aa95b13309e3c6d72f598c"],
  ["src/components/shell/ticker/useBezelDisplacementTexture", "acc31af1f3b1b398c4f462575a652786d396ac52c85d6225dcededca34e1f369"],
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

test("scheduler math, frame ordering, pause restoration and snap code remain unchanged", () => {
  const source = current("src/components/shell/ticker/useLaneScheduler");
  assert.equal(digest(source.slice(source.indexOf("/**\n * Bezel-feel"))), "21b626f6907f20a5d9f6c65b675de59e73e153b75e5c4549f3d2b5c916ce2209");
});

test("ticker defaults and geometry remain exact", () => {
  const config = read(exists("src/components/shell/ticker/_shared/field-config.ts")
    ? "src/components/shell/ticker/_shared/field-config.ts" : "src/components/shell/ticker/field-config.ts");
  assert.equal(digest(config.slice(config.indexOf("export interface FieldConfig"))), "dd8372842bb4b8ae1d6dd4f9297be80f4a6cdd017635bae3690ebaab6b1658b6");
  const scheduler = config.includes("export const DEFAULT_SCHEDULER_BOUNDS") ? config : current("src/components/shell/ticker/useLaneScheduler");
  assert.equal(digest(scheduler.slice(scheduler.indexOf("export interface SchedulerBounds"), scheduler.indexOf("/**\n * Bezel-feel") >= 0 ? scheduler.indexOf("/**\n * Bezel-feel") : scheduler.indexOf("export interface FieldConfig")).trim()), "ca7d55e57ea839a9fd4f730e4b24ad9dd1c14ae20a1dc489dd70957e534c2376");
  assert.match(read("src/components/shell/menu-gradient.tsx"), /planeGeometry args=\{\[1\.5, 1\.5, 128, 128\]\}/);
});

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
