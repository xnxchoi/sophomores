import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { Config } from "payload";

// Execute the exact config hook without importing credentials, plugins or .env.
// The isolated DB fixture also uses this hook, not a test-only error listener.
export function payloadOnInit(
  consoleTarget: Pick<Console, "error"> = console,
  mode: "site" | "nfc-read" | "nfc-write" = "site",
): NonNullable<Config["onInit"]> {
  const source = ts.createSourceFile("payload.config.ts",
    readFileSync(new URL("../../../src/payload.config.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const exported = source.statements.find(ts.isExportAssignment);
  assert.ok(exported && ts.isCallExpression(exported.expression));
  assert.equal(exported.expression.expression.getText(source), "buildSiteConfig");
  const factory = source.statements.filter(ts.isVariableStatement).flatMap((statement) => [...statement.declarationList.declarations])
    .find((declaration) => declaration.name.getText(source) === "buildSiteConfig")?.initializer;
  assert.ok(factory && ts.isArrowFunction(factory) && ts.isBlock(factory.body));
  const configCall = factory.body.statements.find(ts.isReturnStatement)?.expression;
  assert.ok(configCall && ts.isCallExpression(configCall) && configCall.expression.getText(source) === "buildConfig");
  const config = configCall.arguments[0];
  assert.ok(config && ts.isObjectLiteralExpression(config));
  const hook = config.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(source) === "onInit");
  assert.ok(hook && ts.isPropertyAssignment(hook), "Production Payload onInit must own driver error listeners");
  const prelude = factory.body.statements.filter(ts.isVariableStatement).map((statement) => statement.getText(source)).join("\n");
  const compiled = ts.transpileModule(`((mode) => { ${prelude}\n return ${hook.initializer.getText(source)}; })(mode)`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const onInit = runInNewContext(compiled, { console: consoleTarget, mode });
  assert.equal(typeof onInit, "function", `${mode} must install the production storage error hook`);
  return onInit as NonNullable<Config["onInit"]>;
}
