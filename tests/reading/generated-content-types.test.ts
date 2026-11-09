import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { contentCollections } from "@/lib/payload/collections";

test("generated Payload collection types include the configured content collections", () => {
  const path = new URL("../../lib/payload/payload-types.ts", import.meta.url);
  const source = ts.createSourceFile(path.pathname, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const config = source.statements.find((node): node is ts.InterfaceDeclaration =>
    ts.isInterfaceDeclaration(node) && node.name.text === "Config");
  assert.ok(config, "Payload must generate its Config interface");
  for (const section of ["collections", "collectionsSelect"]) {
    const property = config.members.find((node): node is ts.PropertySignature =>
      ts.isPropertySignature(node) && node.name.getText(source) === section);
    assert.ok(property?.type && ts.isTypeLiteralNode(property.type), section);
    const names = new Set(property.type.members.flatMap((node) =>
      ts.isPropertySignature(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
        ? [node.name.text] : []));
    for (const collection of contentCollections) {
      assert.ok(names.has(collection.slug), `${section} is missing ${collection.slug}`);
    }
  }
});
