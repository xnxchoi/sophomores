import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import {
  createMemberClient,
  MemberAuthActionError,
  PASSKEY_SETTLE_MS,
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
  user: {
    id: b64u(new Uint8Array(16).fill(1)),
    name: "member@example.com",
    displayName: "Member"
  },
  pubKeyCredParams: [{ type: "public-key", alg: -7 }],
  timeout: 60000,
  attestation: "none",
  excludeCredentials: [],
  authenticatorSelection: {
    residentKey: "preferred",
    userVerification: "required"
  }
};
const authenticateOptions = {
  challenge,
  rpId: "localhost",
  timeout: 60000,
  userVerification: "required",
  allowCredentials: []
};

type Script = {
  ceremony: "ok" | "cancel" | "abort";
  /** committed-lost: the server stores the passkey, then the response is lost. */
  verify: "ok" | "lost" | "committed-lost" | "refused";
  /** Passkey counts the server reports, in order; an Error makes that read fail. */
  counts?: (number | Error)[];
  /** Whether the session read after a lost sign-in shows a signed-in account. */
  signedInAfter?: boolean | Error;
  /** A server model instead of `counts`: its total, a count outage, and a gate on the first count. */
  server?: Server;
};
type Server = { passkeys: number; countDown?: boolean; firstCountGate?: Promise<void> };
let clockNow = 1_000_000;

const previous = new Map<string, PropertyDescriptor | undefined>();
function install(target: object, key: string, value: unknown) {
  const id = `${target === globalThis ? "g" : "n"}:${key}`;
  if (!previous.has(id))
    previous.set(id, Object.getOwnPropertyDescriptor(target, key));
  Object.defineProperty(target, key, {
    configurable: true,
    writable: true,
    value
  });
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
    descriptor
      ? Object.defineProperty(target, key, descriptor)
      : Reflect.deleteProperty(target, key);
  }
});

function scripted(script: Script) {
  const requests: string[] = [];
  const counts = [...(script.counts ?? [])];
  const created: number[] = [];
  let countReads = 0;
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
    created.push(1);
    if (script.ceremony === "cancel")
      throw new DOMException(
        "The operation either timed out or was not allowed.",
        "NotAllowedError"
      );
    if (script.ceremony === "abort")
      throw new DOMException("aborted", "AbortError");
    return credential();
  };
  install(navigator, "credentials", { create: ceremony, get: ceremony });
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "content-type": "application/json" }
    });
  const customFetchImpl = async (input: string | URL | Request) => {
    const path = new URL(input instanceof Request ? input.url : String(input))
      .pathname;
    requests.push(path);
    if (path.endsWith("/passkey/generate-register-options"))
      return json(registerOptions);
    if (path.endsWith("/passkey/generate-authenticate-options"))
      return json(authenticateOptions);
    if (
      path.endsWith("/passkey/verify-registration") ||
      path.endsWith("/passkey/verify-authentication")
    ) {
      if (script.verify === "lost") throw new TypeError("Failed to fetch");
      if (script.verify === "committed-lost") {
        if (script.server) script.server.passkeys++;
        throw new TypeError("Failed to fetch");
      }
      if (script.verify === "refused")
        return json(
          { code: "PASSKEY_NOT_ALLOWED", message: "PRIVATE SERVER DETAIL" },
          400
        );
      return json(
        path.endsWith("registration")
          ? { id: "row" }
          : { session: { id: "s" }, user: { id: "u" } }
      );
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
    if (path === "/api/member/passkey-count") {
      if (script.server) {
        const first = countReads++ === 0;
        if (first && script.server.firstCountGate) await script.server.firstCountGate;
        if (script.server.countDown) throw new TypeError("Failed to fetch");
        return Response.json({ success: true, data: { count: script.server.passkeys } });
      }
      const next = counts.shift();
      if (next instanceof Error || next === undefined)
        throw new TypeError("Failed to fetch");
      return Response.json({ success: true, data: { count: next } });
    }
    if (path === "/api/member/status") {
      if (script.signedInAfter instanceof Error)
        throw new TypeError("Failed to fetch");
      const signedIn = script.signedInAfter === true;
      return Response.json({
        success: true,
        data: {
          authenticated: signedIn,
          phoneBindingAuth: signedIn ? "ready" : "anonymous",
          emailVerified: signedIn,
          phoneBound: false,
          member: false,
          capabilities: {
            emailOtp: true,
            magicLink: true,
            google: true,
            passkey: true
          }
        }
      });
    }
    return Response.json({ success: false }, { status: 404 });
  }) as typeof fetch;
  return {
    client: createMemberClient(auth, fetcher, "account", { now: () => clockNow }),
    requests,
    created
  };
}

/** The rejected error of a passkey action, for its kind and pending evidence. */
async function rejection(action: Promise<unknown>): Promise<MemberAuthActionError> {
  try {
    await action;
  } catch (error) {
    assert.ok(error instanceof MemberAuthActionError, String(error));
    return error;
  }
  throw new Error("expected the action to fail");
}

async function outcome(
  action: Promise<unknown>
): Promise<MemberAuthFailureKind | "ok"> {
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
  assert.equal(
    add.requests.some((path) => path.includes("verify-")),
    false
  );
  const signIn = scripted({ ceremony: "cancel", verify: "ok" });
  assert.equal(
    await outcome(signIn.client.signInPasskey()),
    "passkey-cancelled"
  );
  const aborted = scripted({ ceremony: "abort", verify: "ok", counts: [1] });
  assert.equal(await outcome(aborted.client.addPasskey()), "passkey-cancelled");
});

test("registration starts only after the baseline count has been read", async () => {
  let release!: () => void;
  const server: Server = { passkeys: 1, firstCountGate: new Promise<void>((resolve) => { release = resolve; }) };
  const { client, requests, created } = scripted({ ceremony: "ok", verify: "ok", server });
  const adding = client.addPasskey();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(requests, ["/api/member/passkey-count"], "nothing else is requested while the baseline is pending");
  assert.equal(created.length, 0, "no passkey prompt before the baseline");
  release();
  assert.equal(await outcome(adding), "ok");
  assert.ok(requests.indexOf("/api/auth/passkey/generate-register-options") > 0);
});

test("a baseline that can't be read stops before the prompt, as a plain failure", async () => {
  const { client, requests, created } = scripted({ ceremony: "ok", verify: "ok", server: { passkeys: 1, countDown: true } });
  const error = await rejection(client.addPasskey());
  assert.equal(error.kind, "unavailable");
  assert.equal(error.pendingPasskey, undefined, "nothing can have been added");
  assert.equal(created.length, 0);
  assert.equal(requests.some((path) => path.includes("register")), false);
});

test("a lost verify that already committed reads added at once", async () => {
  const server: Server = { passkeys: 1 };
  const { client } = scripted({ ceremony: "ok", verify: "committed-lost", server });
  assert.equal(await outcome(client.addPasskey()), "ok");
  assert.equal(server.passkeys, 2);
});

test("an unchanged count after a lost verify stays unknown until the challenge can no longer commit; a late commit reads added", async () => {
  clockNow = 1_000_000;
  const server: Server = { passkeys: 1 };
  const lost = scripted({ ceremony: "ok", verify: "lost", server });
  const error = await rejection(lost.client.addPasskey());
  assert.equal(error.kind, "network", "unknown, never not-added, while the verify may still commit");
  const pending = error.pendingPasskey;
  assert.ok(pending);
  assert.equal(pending.baseline, 1);
  assert.equal(pending.settlesAt, 1_000_000 + PASSKEY_SETTLE_MS);
  assert.equal(await lost.client.confirmPasskey(pending), "unknown");
  clockNow += PASSKEY_SETTLE_MS - 1;
  assert.equal(await lost.client.confirmPasskey(pending), "unknown", "one moment before the window closes is still unknown");
  // The request that was lost reaches the server late and commits.
  server.passkeys = 2;
  assert.equal(await lost.client.confirmPasskey(pending), "added");

  clockNow = 1_000_000;
  const never: Server = { passkeys: 4 };
  const quiet = scripted({ ceremony: "ok", verify: "lost", server: never });
  const unsettled = (await rejection(quiet.client.addPasskey())).pendingPasskey!;
  never.countDown = true;
  clockNow += PASSKEY_SETTLE_MS + 1;
  assert.equal(await quiet.client.confirmPasskey(unsettled), "unknown", "a failed read never settles anything");
  never.countDown = false;
  assert.equal(await quiet.client.confirmPasskey(unsettled), "not_added", "after the window, an unchanged count is final");
});

test("a lost sign-in response is confirmed against the session", async () => {
  const signedIn = scripted({
    ceremony: "ok",
    verify: "lost",
    signedInAfter: true
  });
  assert.equal(await outcome(signedIn.client.signInPasskey()), "ok");
  const notSignedIn = scripted({
    ceremony: "ok",
    verify: "lost",
    signedInAfter: false
  });
  assert.equal(
    await outcome(notSignedIn.client.signInPasskey()),
    "unavailable"
  );
  const unknown = scripted({
    ceremony: "ok",
    verify: "lost",
    signedInAfter: new Error("down")
  });
  assert.equal(await outcome(unknown.client.signInPasskey()), "network");
});

test("a refusal the server answered stays a failure, and success stays success", async () => {
  const refused = scripted({ ceremony: "ok", verify: "refused", counts: [1] });
  assert.equal(await outcome(refused.client.addPasskey()), "unavailable");
  const refusedSignIn = scripted({ ceremony: "ok", verify: "refused" });
  assert.equal(
    await outcome(refusedSignIn.client.signInPasskey()),
    "unavailable"
  );
  const ok = scripted({ ceremony: "ok", verify: "ok", counts: [1] });
  assert.equal(await outcome(ok.client.addPasskey()), "ok");
});

test("the member's passkey count is the server's total, read from the member route", async () => {
  // better-auth's list-user-passkeys returns at most 10 (the payload-auth adapter's default page), so it can't count.
  const { client, requests } = scripted({
    ceremony: "ok",
    verify: "ok",
    counts: [12, new Error("down")]
  });
  assert.equal(await client.passkeyCount(), 12);
  assert.equal(await outcome(client.passkeyCount()), "network");
  assert.equal(
    requests.some((path) => path.includes("list-user-passkeys")),
    false
  );
});
