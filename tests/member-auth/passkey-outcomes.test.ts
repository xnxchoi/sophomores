import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import {
  createMemberClient,
  MemberAuthActionError,
  type MemberAuthBrowserApi,
  type MemberAuthFailureKind
} from "@/lib/member-auth/client";

// Round 5 (Codex 1): real passkey outcomes are classified through the shared
// client boundary. These tests drive the installed better-auth passkey client
// and @simplewebauthn/browser with a scripted WebAuthn API and server, so a
// dependency change that hides cancellation or transport evidence fails here.

const b64u = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const challenge = b64u(new Uint8Array(32).fill(7));
const registerOptions = {
  challenge,
  rp: { name: "Sophomores", id: "localhost" },
  user: { id: b64u(new Uint8Array(16).fill(1)), name: "member@example.com", displayName: "Member" },
  pubKeyCredParams: [{ type: "public-key", alg: -7 }],
  timeout: 60000,
  attestation: "none",
  excludeCredentials: [],
  authenticatorSelection: { residentKey: "preferred", userVerification: "required" }
};
const authenticateOptions = { challenge, rpId: "localhost", timeout: 60000, userVerification: "required", allowCredentials: [] };

type Script = {
  ceremony: "ok" | "cancel" | "abort";
  verify: "ok" | "lost" | "refused";
  /** Passkey counts the server reports, in order; an Error makes that read fail. */
  counts?: (number | Error)[];
  /** Whether the session read after a lost sign-in shows a signed-in account. */
  signedInAfter?: boolean | Error;
};

const previous = new Map<string, PropertyDescriptor | undefined>();
function install(target: object, key: string, value: unknown) {
  const id = `${target === globalThis ? "g" : "n"}:${key}`;
  if (!previous.has(id)) previous.set(id, Object.getOwnPropertyDescriptor(target, key));
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
}
before(() => {
  install(globalThis, "PublicKeyCredential", function PublicKeyCredential() {});
  install(globalThis, "window", globalThis);
  install(globalThis, "location", new URL("http://localhost/welcome"));
});
afterEach(() => {
  Reflect.deleteProperty(navigator, "credentials");
});
after(() => {
  for (const [id, descriptor] of previous) {
    const [scope, key] = id.split(":");
    const target = scope === "g" ? globalThis : navigator;
    descriptor ? Object.defineProperty(target, key, descriptor) : Reflect.deleteProperty(target, key);
  }
});

function scripted(script: Script) {
  const requests: string[] = [];
  const counts = [...(script.counts ?? [])];
  const credential = () => {
    const id = new Uint8Array(16).fill(9);
    const buffer = (length: number) => new Uint8Array(length).buffer;
    return {
      id: b64u(id),
      rawId: id.buffer,
      type: "public-key",
      authenticatorAttachment: "platform",
      getClientExtensionResults: () => ({}),
      response: {
        clientDataJSON: buffer(8),
        attestationObject: buffer(8),
        authenticatorData: buffer(37),
        signature: buffer(8),
        userHandle: null,
        getTransports: () => ["internal"],
        getPublicKeyAlgorithm: () => -7,
        getPublicKey: () => buffer(8),
        getAuthenticatorData: () => buffer(37)
      }
    };
  };
  const ceremony = async () => {
    if (script.ceremony === "cancel") throw new DOMException("The operation either timed out or was not allowed.", "NotAllowedError");
    if (script.ceremony === "abort") throw new DOMException("aborted", "AbortError");
    return credential();
  };
  install(navigator, "credentials", { create: ceremony, get: ceremony });
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
  const customFetchImpl = async (input: string | URL | Request) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    requests.push(path);
    if (path.endsWith("/passkey/generate-register-options")) return json(registerOptions);
    if (path.endsWith("/passkey/generate-authenticate-options")) return json(authenticateOptions);
    if (path.endsWith("/passkey/verify-registration") || path.endsWith("/passkey/verify-authentication")) {
      if (script.verify === "lost") throw new TypeError("Failed to fetch");
      if (script.verify === "refused") return json({ code: "PASSKEY_NOT_ALLOWED", message: "PRIVATE SERVER DETAIL" }, 400);
      return json(path.endsWith("registration") ? { id: "row" } : { session: { id: "s" }, user: { id: "u" } });
    }
    if (path.endsWith("/passkey/list-user-passkeys")) {
      const next = counts.shift();
      if (next instanceof Error || next === undefined) throw new TypeError("Failed to fetch");
      return json(Array.from({ length: next }, (_, index) => ({ id: `p${index}` })));
    }
    if (path.endsWith("/get-session")) return json(null);
    return json({ code: "NOT_FOUND" }, 404);
  };
  const auth = createAuthClient({
    baseURL: "http://localhost",
    basePath: "/api/auth",
    fetchOptions: { customFetchImpl },
    plugins: [passkeyClient()]
  }) as unknown as MemberAuthBrowserApi;
  const fetcher = (async (input: string | URL | Request) => {
    const path = String(input);
    requests.push(path);
    if (path === "/api/member/status") {
      if (script.signedInAfter instanceof Error) throw new TypeError("Failed to fetch");
      const signedIn = script.signedInAfter === true;
      return Response.json({
        success: true,
        data: {
          authenticated: signedIn,
          phoneBindingAuth: signedIn ? "ready" : "anonymous",
          emailVerified: signedIn,
          phoneBound: false,
          member: false,
          capabilities: { emailOtp: true, magicLink: true, google: true, passkey: true }
        }
      });
    }
    return Response.json({ success: false }, { status: 404 });
  }) as typeof fetch;
  return { client: createMemberClient(auth, fetcher), requests };
}

async function outcome(action: Promise<unknown>): Promise<MemberAuthFailureKind | "ok"> {
  try {
    await action;
    return "ok";
  } catch (error) {
    assert.ok(error instanceof MemberAuthActionError, String(error));
    assert.doesNotMatch(error.message, /PRIVATE|Failed to fetch|not allowed/);
    return error.kind;
  }
}

test("cancelling the passkey prompt reads as cancelled, for adding and for signing in", async () => {
  const add = scripted({ ceremony: "cancel", verify: "ok", counts: [1] });
  assert.equal(await outcome(add.client.addPasskey()), "passkey-cancelled");
  assert.equal(add.requests.some((path) => path.includes("verify-")), false);
  const signIn = scripted({ ceremony: "cancel", verify: "ok" });
  assert.equal(await outcome(signIn.client.signInPasskey()), "passkey-cancelled");
  const aborted = scripted({ ceremony: "abort", verify: "ok", counts: [1] });
  assert.equal(await outcome(aborted.client.addPasskey()), "passkey-cancelled");
});

test("a lost verify response is confirmed against the member's passkeys: added, not added, or still unknown", async () => {
  const added = scripted({ ceremony: "ok", verify: "lost", counts: [1, 2] });
  assert.equal(await outcome(added.client.addPasskey()), "ok");
  const notAdded = scripted({ ceremony: "ok", verify: "lost", counts: [1, 1] });
  assert.equal(await outcome(notAdded.client.addPasskey()), "unavailable");
  const unknown = scripted({ ceremony: "ok", verify: "lost", counts: [1, new Error("down")] });
  assert.equal(await outcome(unknown.client.addPasskey()), "network");
  const noBaseline = scripted({ ceremony: "ok", verify: "lost", counts: [new Error("down"), 2] });
  assert.equal(await outcome(noBaseline.client.addPasskey()), "network");
  assert.ok(added.requests.indexOf("/api/auth/passkey/list-user-passkeys") < added.requests.indexOf("/api/auth/passkey/verify-registration"),
    "the baseline is read before the passkey is verified");
});

test("a lost sign-in response is confirmed against the session", async () => {
  const signedIn = scripted({ ceremony: "ok", verify: "lost", signedInAfter: true });
  assert.equal(await outcome(signedIn.client.signInPasskey()), "ok");
  const notSignedIn = scripted({ ceremony: "ok", verify: "lost", signedInAfter: false });
  assert.equal(await outcome(notSignedIn.client.signInPasskey()), "unavailable");
  const unknown = scripted({ ceremony: "ok", verify: "lost", signedInAfter: new Error("down") });
  assert.equal(await outcome(unknown.client.signInPasskey()), "network");
});

test("a refusal the server answered stays a failure, and success stays success", async () => {
  const refused = scripted({ ceremony: "ok", verify: "refused", counts: [1] });
  assert.equal(await outcome(refused.client.addPasskey()), "unavailable");
  const refusedSignIn = scripted({ ceremony: "ok", verify: "refused" });
  assert.equal(await outcome(refusedSignIn.client.signInPasskey()), "unavailable");
  const ok = scripted({ ceremony: "ok", verify: "ok", counts: [1] });
  assert.equal(await outcome(ok.client.addPasskey()), "ok");
});

test("the member's passkey count is read from the server", async () => {
  const { client } = scripted({ ceremony: "ok", verify: "ok", counts: [3, new Error("down")] });
  assert.equal(await client.passkeyCount(), 3);
  assert.equal(await outcome(client.passkeyCount()), "network");
});
