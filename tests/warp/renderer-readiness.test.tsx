import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Project, SyntaxKind } from "ts-morph";
import ts from "typescript";

const source = readFileSync(new URL("../../src/components/Warp/warp-field.tsx", import.meta.url), "utf8");
const file = new Project({ useInMemoryFileSystem: true }).createSourceFile("field.tsx", source);
const compile = (text: string) => ts.transpileModule(text, {
  compilerOptions: { target: ts.ScriptTarget.ESNext, jsx: ts.JsxEmit.React }
}).outputText;

test("native canvas fallback is static and cannot start the opening before WebGL is ready", () => {
  const message = file.getFunctionOrThrow("FieldMessage");
  const effects: unknown[] = [];
  const FieldMessage = new Function("React", "useEffect", `${compile(message.getText())}; return FieldMessage;`)(React, (...args: unknown[]) => effects.push(args));
  const canvas = file.getFunctionOrThrow("WarpField").getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
    .find(node => node.getTagNameNode().getText() === "Canvas");
  assert.ok(canvas);
  assert.equal(canvas.getAttribute("fallback")?.getText().replace(/\s/g, ""), "fallback={<FieldMessage/>}");
  // R3F 9.8.2 places this fallback inside <canvas> unconditionally. Browsers
  // hide its visual fallback, but React still mounts any effects in that child.
  const html = renderToStaticMarkup(React.createElement("canvas", null, React.createElement(FieldMessage)));
  assert.match(html, /The light study needs WebGL/);
  assert.equal(effects.length, 0);
  assert.equal(message.getDescendantsOfKind(SyntaxKind.CallExpression).filter(node => node.getExpression().getText() === "useEffect").length, 0);
});

test("a real renderer error still marks the readable fallback ready", () => {
  const message = file.getFunctionOrThrow("FieldMessage");
  const FieldMessage = new Function("React", `${compile(message.getText())}; return FieldMessage;`)(React);
  let ready = 0;
  const FieldFallback = new Function("React", "useEffect", "FieldMessage", `${compile(file.getFunctionOrThrow("FieldFallback").getText())}; return FieldFallback;`)(
    React,
    (effect: () => void) => effect(),
    FieldMessage
  );
  const render = file.getClassOrThrow("FieldBoundary").getMethodOrThrow("render");
  const renderBoundary = new Function("React", "FieldFallback", `${compile(`function renderBoundary() ${render.getBodyOrThrow().getText()}`)}; return renderBoundary;`)(React, FieldFallback);
  const fallback = renderBoundary.call({ state: { failed: true }, props: { onReady: () => ready++ } });
  assert.equal(fallback.type, FieldFallback);
  const html = renderToStaticMarkup(fallback);
  assert.match(html, /role="status"/);
  assert.match(html, /Text and the next section remain available/);
  assert.equal(ready, 1);
});

test("healthy readiness belongs to the second actual filament frame, not canvas mount", () => {
  const frame = file.getFunctionOrThrow("Filaments").getDescendantsOfKind(SyntaxKind.CallExpression)
    .find(node => node.getExpression().getText() === "useFrame")!;
  const callback = frame.getArguments()[0].asKindOrThrow(SyntaxKind.ArrowFunction);
  const statements = callback.getBody().asKindOrThrow(SyntaxKind.Block).getStatements();
  const run = new Function("material", "renderedFrames", "onReady", compile(statements.slice(0, 2).map(node => node.getText()).join("\n")));
  const renderedFrames = { current: 0 };
  let ready = 0;
  run({ current: null }, renderedFrames, () => ready++);
  assert.equal(renderedFrames.current, 0);
  for (let index = 1; index <= 4; index++) {
    run({ current: {} }, renderedFrames, () => ready++);
    assert.equal(renderedFrames.current, index);
    assert.equal(ready, index >= 2 ? 1 : 0);
  }
});
