import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { assertCommerceBrowserAuthority } from "../../../src/lib/commerce/access";
import { createGuestOperationsEndpoint } from "../../../src/lib/commerce/domain";

const production = "https://sophomores.co";
const local = "http://localhost:3077";
const request = (url: string, headers: Record<string, string> = {}, method = "GET") =>
  new Request(url, { method, headers: { host: new URL(url).host, ...headers } });

test("commerce browser authority accepts the configured https origin for reads and mutations", () => {
  assert.doesNotThrow(() => assertCommerceBrowserAuthority(request(`${production}/api/payments/portone/pending?productID=p`), production, "read"));
  assert.doesNotThrow(() => assertCommerceBrowserAuthority(request(`${production}/api/payments/portone/prepare`, { origin: production }, "POST"), production, "mutation"));
  assert.doesNotThrow(() => assertCommerceBrowserAuthority(request(`${local}/api/payments/portone/prepare`, { origin: local }, "POST"), local, "mutation"));
});

test("commerce browser authority rejects foreign origins and localhost while the configured origin is https", () => {
  const post = (url: string, headers: Record<string, string> = {}) => request(url, headers, "POST");
  for (const req of [
    post("https://evil.example/api/payments/portone/prepare", { origin: "https://evil.example" }),
    post(`${production}/api/payments/portone/prepare`, { origin: "https://evil.example" }),
    post(`${production}/api/payments/portone/prepare`, { origin: local }),
    post(`${production}/api/payments/portone/prepare`),
    post(`${production}/api/payments/portone/prepare`, { origin: production, host: "evil.example" }),
    post(`${production}/api/payments/portone/prepare`, { origin: production, "sec-fetch-site": "cross-site" }),
    post(`${production}/api/payments/portone/prepare?x=1`, { origin: production }),
    post(`${local}/api/payments/portone/prepare`, { origin: local }),
    post("http://sophomores.co/api/payments/portone/prepare", { origin: production }),
  ]) assert.throws(() => assertCommerceBrowserAuthority(req, production, "mutation"), /Commerce request rejected/);
  assert.throws(() => assertCommerceBrowserAuthority(request(`${production}/api/payments/portone/pending`, { origin: local }), production, "read"));
  // A local origin still rejects the production host.
  assert.throws(() => assertCommerceBrowserAuthority(post(`${production}/api/payments/portone/prepare`, { origin: production }), local, "mutation"));
});

function guestRequest(url: string, headers: Record<string, string>) {
  return { url, headers: new Headers({ host: new URL(url).host, "content-type": "application/json", ...headers }),
    user: { collection: "users", id: 7 }, payload: { logger: { error: () => undefined } }, json: async () => ({}) } as unknown as PayloadRequest;
}

test("guest operations gate uses the configured origin and keeps local behaviour", async () => {
  const endpoint = (origin: string) => createGuestOperationsEndpoint({
    getMemberRuntime: () => ({ config: { origin }, toMemberPrincipal: async () => ({ userId: "7", emailVerified: true }) }) });
  const call = async (origin: string, req: PayloadRequest) => {
    const response = await endpoint(origin).handler(req) as Response;
    return { status: response.status, body: await response.json() as { error?: string } };
  };
  const path = "/api/commerce/guest-operations";
  const gated = (result: { status: number; body: { error?: string } }) => result.status === 403 && result.body.error === "Request rejected";
  assert.equal(gated(await call(production, guestRequest(`${production}${path}`, { origin: production }))), false);
  assert.equal(gated(await call(local, guestRequest(`${local}${path}`, { origin: local }))), false);
  for (const req of [
    guestRequest(`https://evil.example${path}`, { origin: "https://evil.example" }),
    guestRequest(`${production}${path}`, { origin: "https://evil.example" }),
    guestRequest(`${production}${path}`, { origin: local }),
    guestRequest(`${local}${path}`, { origin: local }),
    guestRequest(`${production}${path}`, { origin: production, "sec-fetch-site": "cross-site" }),
  ]) assert.equal(gated(await call(production, req)), true);
  assert.equal(gated(await call(local, guestRequest(`${production}${path}`, { origin: production }))), true);
});
