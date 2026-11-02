import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("Payload CLI scripts use one global tsx loader rather than scoped tsImport", async () => {
  const { scripts } = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  const commands = {
    "generate:types": "generate:types",
    "generate:schema": "generate:db-schema",
    "generate:importmap": "generate:importmap",
    micreate: "migrate:create",
    migrate: "migrate",
    "migrate:fresh": "migrate:fresh",
  };
  for (const [name, command] of Object.entries(commands)) {
    assert.ok(scripts[name].includes("node --import tsx ./node_modules/payload/bin.js --disable-transpile "), name);
    assert.ok(scripts[name].endsWith(command), name);
    assert.equal(scripts[name].match(/--import tsx/g)?.length, 1, name);
  }
  assert.equal(scripts.ci, "pnpm migrate && pnpm build");
});
