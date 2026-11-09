import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { readCommerceJSON } from "../../../src/lib/commerce/_shared/request-body";

const request = (body: string, headers?: HeadersInit) => new Request("https://example.test/api/commerce", {
  method: "POST", body, headers: { "content-type": "application/json", ...headers },
}) as unknown as PayloadRequest;

test("bounded commerce body parses native JSON without trusting content-length", async () => {
  assert.deepEqual(await readCommerceJSON(request('{"quantity":2}')), { quantity: 2 });
  await assert.rejects(readCommerceJSON(request(JSON.stringify({ address: "가".repeat(3000) }))));
  await assert.rejects(readCommerceJSON(request("{}", { "content-length": "9000" })));
  await assert.rejects(readCommerceJSON(request("not-json")));
  await assert.rejects(readCommerceJSON(request("{}", { "content-type": "text/plain" })));
});
