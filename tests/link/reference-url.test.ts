import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getUrlFromReference } from "@/components/core/Link/ReferencedLink/getUrlFromReference";

test("a collection reference stays unresolved until a resolver is passed", async () => {
  const reference = { relationTo: "posts", value: "post-1" };
  assert.equal(await getUrlFromReference(reference), null);
  assert.equal(
    await getUrlFromReference(reference, () => "/read/post-1"),
    "/read/post-1"
  );
});

test("the duplicated link types do not import Payload collections", () => {
  const types = readFileSync(
    new URL("../../src/components/core/Link/types.ts", import.meta.url),
    "utf8"
  );
  const resolver = readFileSync(
    new URL(
      "../../src/components/core/Link/ReferencedLink/getUrlFromReference.ts",
      import.meta.url
    ),
    "utf8"
  );
  for (const source of [types, resolver]) {
    assert.equal(source.includes("payload"), false);
    assert.equal(source.includes("@payload-types"), false);
    assert.equal(source.includes("collectionTypeToFrontEnd"), false);
  }
});
