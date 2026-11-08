import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";
import React, { useState } from "react";
import {
  motionValue,
  useMotionValueEvent,
  type MotionValue
} from "motion/react";
import { Project, SyntaxKind, ts } from "ts-morph";
import {
  createDefaultSequence,
  type SequenceDraft
} from "@/components/Warp/_shared/sequence-editor";

const project = new Project({ useInMemoryFileSystem: true });
const source = project.createSourceFile(
  "warp.tsx",
  readFileSync(
    new URL("../../components/Warp/index.tsx", import.meta.url),
    "utf8"
  )
);
const bridge = source.getFunctionOrThrow("SequenceEditor");
const javascript = ts.transpileModule(bridge.getText(), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React }
}).outputText;
const Clock = new Function(
  "React",
  "useState",
  "useMotionValueEvent",
  "SequenceEditorPanel",
  `${javascript}\nreturn SequenceEditor;`
)(
  React,
  useState,
  useMotionValueEvent,
  ({
    openingTime,
    scrollProgress
  }: {
    openingTime: number;
    scrollProgress: number;
  }) => (
    <output data-testid="clock">
      {openingTime}:{scrollProgress}
    </output>
  )
) as React.ComponentType<{
  opening: MotionValue<number>;
  progress: MotionValue<number>;
  draft: SequenceDraft;
}>;

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
const originalGlobals = new Map<string, PropertyDescriptor | undefined>();
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>");
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Node",
    "IS_REACT_ACT_ENVIRONMENT"
  ]) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value:
        key === "window"
          ? dom.window
          : key === "IS_REACT_ACT_ENVIRONMENT"
            ? true
            : dom.window[key as keyof typeof dom.window]
    });
  }
  ui = await import("@testing-library/react/pure");
});
after(() => {
  ui?.cleanup();
  dom?.window.close();
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test("actual editor clock bridge updates precise displays without rerendering its scene owner", () => {
  let sceneRenders = 0;
  const opening = motionValue(0);
  const progress = motionValue(0);
  const draft = createDefaultSequence();
  function SceneOwner() {
    sceneRenders += 1;
    return <Clock opening={opening} progress={progress} draft={draft} />;
  }
  const view = ui.render(<SceneOwner />);
  assert.equal(sceneRenders, 1);
  for (let frame = 1; frame <= 120; frame++) {
    ui.act(() => {
      opening.set(frame / 120);
      progress.set((frame / 120) * 0.7);
    });
  }
  assert.equal(view.getByTestId("clock").textContent, "2.4:70");
  assert.equal(
    sceneRenders,
    1,
    "animation samples must not recommit the projected Warp scene"
  );
  ui.act(() => opening.set(0.25));
  assert.equal(view.getByTestId("clock").textContent, "0.6:70");
  assert.equal(sceneRenders, 1);
});

test("Warp owner retains semantic phase updates but never stores precise editor clock samples", () => {
  const owner = source
    .getVariableDeclarationOrThrow("Warp")
    .getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction)
    .getText();
  assert.doesNotMatch(owner, /setOpeningTime|setEditorProgress/);
  assert.match(owner, /setPhase\(/);
  assert.match(owner, /opening=\{opening\}/);
  assert.match(owner, /progress=\{overallProgress\}/);
});
