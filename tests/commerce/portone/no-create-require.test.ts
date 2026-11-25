import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// P0, 25 Nov: Turbopack compiled ledger-transaction.ts's runtime require-from-resolved-path into a call on a numeric
// module id, which throws in the BUILT server only ("filename must be a file URL"); every reconciliation then answered
// 409, and tsx-run tests could not see it. Bundled code under src/ uses static imports instead. This finds real calls
// (the TypeScript parser, so comments and strings never match), including `module.createRequire(...)`. The built-output
// check is tests/commerce/portone/built-ledger/ (seed.mts + smoke.mjs against `next start` or standalone server.js).
function createRequireCalls(text: string, fileName = "checked.ts"): number {
  // The extension picks the parser (TS, TSX, JS), so generic arrows in .ts files parse correctly.
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  let calls = 0;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
      if (name === "createRequire") calls++;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return calls;
}

test("bundled application code never calls createRequire", () => {
  const offenders = globSync("src/**/*.{ts,tsx,mts,js,mjs}").filter(file => createRequireCalls(readFileSync(file, "utf8"), file) > 0);
  assert.deepEqual(offenders, []);
});

test("the detector finds real calls and ignores comments and strings", () => {
  const count = (text: string) => createRequireCalls(text);
  assert.equal(count("const r = createRequire(import.meta.url)"), 1);
  assert.equal(count("const r = createRequire(createRequire(import.meta.url).resolve('x'))"), 2);
  assert.equal(count("import m from 'node:module'; m.createRequire(import.meta.url)"), 1);
  assert.equal(count("// createRequire(x)\nconst s = 'createRequire(y)'"), 0);
});
