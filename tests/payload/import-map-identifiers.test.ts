import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Payload names each import-map identifier exportName + "_" + md5(componentPath)
// (payload/dist/bin/generateImportMap/utilities/addPayloadComponentToImportMap.js).
// The checked-in map is generated, so a path move that skips regeneration drifts here.
const source = readFileSync(new URL("../../src/app/(payload)/admin/importMap.js", import.meta.url), "utf8");
const entries = [...source.matchAll(/^\s+"([^"]+)#([^"#]+)": (\w+),?$/gm)].map(([, path, exportName, identifier]) => ({ path, exportName, identifier }));

test("import map identifiers are the export name and full md5 of the component path", () => {
  assert.ok(entries.length > 0);
  for (const { path, exportName, identifier } of entries) {
    assert.equal(identifier, `${exportName}_${createHash("md5").update(path).digest("hex")}`, `${path}#${exportName}`);
  }
});

test("every import map identifier is imported once under the same name", () => {
  for (const { exportName, identifier } of entries) {
    const imports = source.match(new RegExp(`^import \\{ ${exportName} as ${identifier} \\} from `, "gm")) ?? [];
    assert.equal(imports.length, 1, identifier);
  }
});

test("import map component paths do not reference the retired src/lib Payload location", () => {
  assert.equal(entries.some(({ path }) => /(^|\/)lib\/(payload|migrations)\//.test(path)), false);
});
