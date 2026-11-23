import "next/dist/server/node-environment-baseline";

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { before, test } from "node:test";
import { NextRequest } from "next/server";
import { nfcProxy } from "@/lib/nfc/page-request";
import { dispatchTap } from "./next-tap-dispatch";
import { handleTapPost } from "@/lib/nfc/tap-entry";

let route: typeof import("@/app/(nfc)/nfc/[ref]/route");
let runtime: typeof import("@/lib/nfc/tap-entry-runtime");
before(async () => {
  const hook = registerHooks({
    resolve: (specifier, context, nextResolve) => specifier === "server-only"
      ? { url: new URL("../fixtures/team/server-only.ts", import.meta.url).href, shortCircuit: true }
      : nextResolve(specifier, context),
  });
  try {
    route = await import("@/app/(nfc)/nfc/[ref]/route");
    runtime = await import("@/lib/nfc/tap-entry-runtime");
  } finally { hook.deregister(); }
});

const ref = "AAAAAAAAAAAAAAAAAAAAAA";
const tap = `https://sophomores.co/nfc/${ref}?picc=${"A".repeat(32)}&cmac=${"B".repeat(16)}`;
const dispatched = (userland: Parameters<typeof dispatchTap>[0]) => dispatchTap(userland, ref, tap);

function assertPrivate(res: Response) {
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  assert.match(res.headers.get("x-robots-tag") ?? "", /noindex/);
  assert.equal(res.headers.get("set-cookie"), null);
}

const clean = tap.split("?")[0];
const path = new URL(clean).pathname;
const proxy = (method: string, headers: HeadersInit = {}, url = tap) => {
  const requestHeaders = new Headers({ host: "sophomores.co" });
  new Headers(headers).forEach((value, key) => requestHeaders.set(key, value));
  return nfcProxy(new NextRequest(url, { method, headers: requestHeaders }))!;
};

test("proxy makes HEAD, OPTIONS and speculative reads inert", () => {
  for (const method of ["HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const res = proxy(method);
    assert.equal(res.status, method === "OPTIONS" ? 204 : 405);
    assertPrivate(res);
  }
  for (const [name, value] of [["purpose", "prefetch"], ["rsc", "1"], ["next-router-prefetch", "1"], ["accept", "text/x-component"]]) {
    assert.equal(proxy("GET", { [name]: value }).status, 204);
  }
});

test("SUN reaches only the bodyless handler, not a rewritten page; clean documents get strict CSP", () => {
  const nfcNonce = "x-sophomores-nfc-nonce";
  const proofHeader = "x-sophomores-nfc-proof";
  const raw = proxy("GET", { [proofHeader]: tap, [nfcNonce]: "forged" });
  assert.equal(raw.headers.get("x-middleware-rewrite"), null);
  assert.equal(raw.headers.get("x-middleware-request-" + proofHeader), null);
  assert.equal(raw.headers.get("x-middleware-request-" + nfcNonce), null);
  const doc = "https://sophomores.co/nfc/confirm/" + ref;
  assert.equal(proxy("GET", {}, doc + "?picc=" + "A".repeat(32)).status, 400);
  assert.equal(proxy("GET", { rsc: "1" }, doc + "?_rsc=Ab_cd-EFgh123456").headers.get("referrer-policy"), "origin");
  const res = proxy("GET", { [nfcNonce]: "forged" }, doc);
  assert.equal(res.headers.get("referrer-policy"), "origin");
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  assert.match(res.headers.get("x-robots-tag") ?? "", /noindex/);
  const policy = res.headers.get("content-security-policy") ?? "";
  const nonce = /nonce-([^']+)/.exec(policy)?.[1];
  assert.ok(nonce && nonce !== "forged" && policy.includes("nonce-" + nonce));
  assert.ok(policy.includes("frame-ancestors 'none'"));
  assert.equal(policy.includes("unsafe-inline"), false);
  assert.notEqual(proxy("GET", {}, doc).headers.get("content-security-policy"), policy);
  assert.equal(proxy("GET", { host: "elsewhere.invalid" }).status, 400);
  assert.equal(proxy("POST", {}, tap).status, 400);
  assert.equal(proxy("POST", {}, "https://sophomores.co/api/nfc/confirm/" + ref).status, 404);
});

test("raw GET handler responds only with a private, clean redirect", async () => {
  for (const uri of [tap, clean, clean + "?picc=bad&cmac=wrong"]) {
    const res = await dispatched(() => route)("GET", { host: "sophomores.co" }, uri);
    assert.equal(res.status, 303);
    assert.equal(res.headers.get("location"), "/nfc/confirm/unavailable");
    assert.equal(await res.text(), "");
    assertPrivate(res);
  }
});

test("POST checks Origin and the exact body before calling confirmation", async () => {
  let spends = 0;
  const send = dispatched(() => ({
    ...route,
    POST: request => handleTapPost(request, path, async (_req, token) =>
      token === "AAAAAAAAAAAAAAAAAAAAAA" ? (++spends === 1 ? "welcome" : "membership") : null),
  }));
  const headers = { origin: new URL(tap).origin, "content-type": "application/x-www-form-urlencoded" };
  for (const [h, body] of [
    [{ ...headers, origin: "https://elsewhere.invalid" }, "confirmation=AAAAAAAAAAAAAAAAAAAAAA"],
    [{ ...headers, origin: "null" }, "confirmation=AAAAAAAAAAAAAAAAAAAAAA"],
    [{ "content-type": headers["content-type"] }, "confirmation=AAAAAAAAAAAAAAAAAAAAAA"],
    [headers, "confirmation=AAAAAAAAAAAAAAAAAAAAAA&confirmation=duplicate"],
    [headers, "confirmation=" + "x".repeat(1024)],
  ] as const) {
    const denied = await send("POST", h, clean, body);
    assert.equal(denied.headers.get("location"), "/nfc/confirm/stale");
    assertPrivate(denied);
  }
  assert.equal(spends, 0);
  for (const destination of ["/welcome", "/me/settings/account"]) {
    const res = await send("POST", headers, clean, "confirmation=AAAAAAAAAAAAAAAAAAAAAA");
    assert.equal(res.status, 303);
    assert.equal(res.headers.get("location"), destination);
    assertPrivate(res);
  }
});

test("live tap configuration fails shut and resolves only dedicated, exact verifier key refs", async () => {
  const { configuredTapSecrets } = runtime;
  const secret = Buffer.alloc(32, 7).toString("base64url");
  const env = { NFC_TAP_FINGERPRINT_SECRET: secret, NFC_TAP_KEY_META_1: "A".repeat(32), SESSION_SECRET: "B".repeat(32) };
  assert.equal(configuredTapSecrets(env), null);
  assert.equal(configuredTapSecrets({ ...env, NFC_TAP_ENABLED: "1", NFC_TAP_FINGERPRINT_SECRET: secret + "=" }), null);
  const keys = configuredTapSecrets({ ...env, NFC_TAP_ENABLED: "1" });
  assert.ok(keys);
  assert.equal((await keys.readVerifierKey("NFC_TAP_KEY_META_1"))?.length, 16);
  assert.equal(await keys.readVerifierKey("SESSION_SECRET"), null);
  assert.equal(await keys.readVerifierKey("NFC_TAP_KEY_PREVIOUS_EPOCH"), null);
});
