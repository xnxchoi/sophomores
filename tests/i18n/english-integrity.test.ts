import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";
import ts from "typescript";
import en from "../../messages/en.json";

test("every canonical English leaf is nonempty and formats with ICU values", () => {
  const t = createTranslator({
    locale: "en", messages: en, timeZone: "Asia/Seoul",
    onError: (error) => { throw error; }
  });
  function check(messages: object, prefix = "") {
    for (const [key, value] of Object.entries(messages)) {
      const path = prefix ? `${prefix}.${key}` : key;
      assert.doesNotMatch(key, /\./, `literal dots are not valid message key segments: ${path}`);
      if (typeof value !== "string") { check(value, path); continue; }
      assert.ok(value.trim().length, `English copy must be populated: ${path}`);
      const values: Record<string, number | ((chunks: unknown) => string)> = {};
      for (const match of value.matchAll(/\{\s*([\w]+)\s*[,}]/g)) values[match[1]] = 2;
      for (const match of value.matchAll(/<([\w]+)>/g)) values[match[1]] = (chunks) => String(chunks);
      // `path` is obtained by walking this exact catalogue, not external input.
      assert.doesNotThrow(() => t.rich(path as Parameters<typeof t.rich>[0], values), `Invalid ICU at ${path}`);
    }
  }
  check(en);
});

test("literal native translation calls resolve in canonical English", () => {
  function files(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === "hideaway") return [];
      const file = join(directory, entry.name);
      return entry.isDirectory() ? files(file) : /\.tsx?$/.test(file) ? [file] : [];
    });
  }
  function lookup(path: string): unknown {
    return path.split(".").reduce<unknown>((value, key) =>
      value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, en);
  }
  let checked = 0;
  for (const file of files("src")) {
    const source = readFileSync(file, "utf8");
    if (!/useTranslations|getTranslations/.test(source)) continue;
    const root = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    // Resolve lexical function scopes so identically named `t` bindings in
    // different components don't accidentally validate against each other.
    const scopes = new Map<ts.Node, Map<string, string>>();
    function scope(node: ts.Node): ts.Node {
      let current = node.parent;
      while (current && !ts.isFunctionLike(current)) current = current.parent;
      return current ?? root;
    }
    function bindings(node: ts.Node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const call = ts.isAwaitExpression(node.initializer) ? node.initializer.expression : node.initializer;
        if (ts.isCallExpression(call) && ts.isIdentifier(call.expression)
          && ["useTranslations", "getTranslations"].includes(call.expression.text)
          && call.arguments[0] && ts.isStringLiteral(call.arguments[0])) {
          const owner = scope(node);
          const map = scopes.get(owner) ?? new Map<string, string>();
          map.set(node.name.text, call.arguments[0].text);
          scopes.set(owner, map);
        }
      }
      ts.forEachChild(node, bindings);
    }
    bindings(root);
    function calls(node: ts.Node) {
      if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const callee = ts.isPropertyAccessExpression(node.expression) ? node.expression.expression : node.expression;
        if (ts.isIdentifier(callee)) {
          let owner = scope(node);
          let namespace: string | undefined;
          while (owner) {
            namespace = scopes.get(owner)?.get(callee.text);
            if (namespace || owner === root) break;
            owner = scope(owner);
          }
          if (namespace) {
            const path = `${namespace}.${node.arguments[0].text}`;
            assert.equal(typeof lookup(path), "string", `${file}: unresolved English copy ${path}`);
            checked++;
          }
        }
      }
      ts.forEachChild(node, calls);
    }
    calls(root);
  }
  assert.ok(checked > 500, `Expected migration-wide coverage, checked ${checked} literal calls`);
});
