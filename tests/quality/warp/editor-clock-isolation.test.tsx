import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Project, SyntaxKind } from "ts-morph";

const project = new Project({ useInMemoryFileSystem: true });
const source = project.createSourceFile(
  "warp.tsx",
  readFileSync(
    new URL("../../../src/components/Warp/index.tsx", import.meta.url),
    "utf8"
  )
);

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
