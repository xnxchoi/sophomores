import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { Config } from "payload";

// Execute the exact config hook without importing credentials, plugins or .env.
// The isolated DB fixture also uses this hook, not a test-only error listener.
export function payloadOnInit(consoleTarget: Pick<Console, "error"> = console): NonNullable<Config["onInit"]> {
  const source = ts.createSourceFile("payload.config.ts",
    readFileSync(new URL("../../../src/payload.config.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const exported = source.statements.find(ts.isExportAssignment);
  assert.ok(exported && ts.isCallExpression(exported.expression));
  const config = exported.expression.arguments[0];
  assert.ok(ts.isObjectLiteralExpression(config));
  const hook = config.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(source) === "onInit");
  assert.ok(hook && ts.isPropertyAssignment(hook), "Production Payload onInit must own driver error listeners");
  const compiled = ts.transpileModule(`(${hook.initializer.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return runInNewContext(compiled, { console: consoleTarget }) as NonNullable<Config["onInit"]>;
}
