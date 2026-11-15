import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { doorCheckInEndpoint, doorCountEndpoint, doorSearchEndpoint } from "../../../src/lib/commerce/door/endpoints";

const staff = { collection: "admins", _strategy: "staff-better-auth", role: "staff", id: "door" };
const request = (user: unknown, headers: Record<string, string> = {}) => ({
  user, url: "https://sophomores.test/api/commerce/door/check-in", headers: new Headers(headers), routeParams: { eventID: "e" }, query: {},
  payload: { logger: { error() {} } },
} as unknown as PayloadRequest);

test("door endpoints refuse anyone who is not CMS staff", async () => {
  for (const user of [undefined, { collection: "users", id: "member" }, { ...staff, _strategy: "local" }]) {
    for (const endpoint of [doorCheckInEndpoint, doorSearchEndpoint, doorCountEndpoint]) {
      assert.equal((await endpoint.handler(request(user, { origin: "https://sophomores.test" }))).status, 403);
    }
  }
});

test("a door check-in must come from our own page", async () => {
  for (const headers of [{}, { origin: "https://elsewhere.example" }, { origin: "https://sophomores.test", "sec-fetch-site": "cross-site" }] as Record<string, string>[]) {
    const response = await doorCheckInEndpoint.handler(request(staff, headers));
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Request rejected" });
  }
});
