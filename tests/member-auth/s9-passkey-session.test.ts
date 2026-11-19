import assert from "node:assert/strict";
import type { RequestContext } from "@better-fetch/fetch";
import { test } from "node:test";
import { createMemberClient, MemberAuthActionError, type MemberAuthBrowserApi } from "@/lib/member-auth/client";
import { ACCOUNT_TRAY_PASSKEY_CONFIRMED, ACCOUNT_TRAY_PASSKEY_SESSION } from "@/lib/member-auth/paths";
import { createMemberSession } from "@/components/Authentication/member-auth/_shared/session";

const verificationRequest: RequestContext = {
  url: "http://localhost/api/auth/passkey/verify-registration",
  method: "POST",
  headers: new Headers(),
  body: null,
  signal: new AbortController().signal
};

function browserApi(overrides: {
  getSession?: NonNullable<MemberAuthBrowserApi["getSession"]>;
  addPasskey?: MemberAuthBrowserApi["passkey"]["addPasskey"];
  signInPasskey?: MemberAuthBrowserApi["signIn"]["passkey"];
} = {}): MemberAuthBrowserApi {
  return {
    ...(overrides.getSession ? { getSession: overrides.getSession } : {}),
    emailOtp: { sendVerificationOtp: async () => ({ error: null }) },
    signIn: {
      emailOtp: async () => ({ error: null }),
      magicLink: async () => ({ error: null }),
      social: async () => ({ error: null }),
      passkey: overrides.signInPasskey ?? (async () => ({ error: null }))
    },
    passkey: { addPasskey: overrides.addPasskey ?? (async () => ({ error: null })) },
    signOut: async () => ({ error: null })
  };
}

test("lost verification stays unknown, and a different session cannot inherit the pending check", async () => {
  let id = "original";
  let attempts = 0;
  const auth = browserApi({
    getSession: async () => ({ data: { session: { id } } }),
    addPasskey: async (input) => {
      attempts++;
      await input.fetchOptions?.onRequest?.(verificationRequest);
      throw new TypeError("response lost");
    }
  });
  const fetcher = async () => Response.json({ success: true, data: {
    authenticated: true, emailVerified: true, member: false, phoneBound: false,
    capabilities: { apple: false, kakao: false, emailOtp: true, magicLink: false, google: true, passkey: true }
  } });
  const session = createMemberSession(createMemberClient(auth, fetcher), () => {});
  await session.initialize();
  await session.addPasskey();
  assert.equal(session.snapshot().passkeyPending, true);
  assert.equal(session.snapshot().status?.member, false);
  await session.addPasskey();
  await session.checkPasskey();
  assert.equal(attempts, 1);
  assert.equal(session.snapshot().passkeyPending, true);
  id = "replacement";
  await session.refresh();
  assert.equal(session.snapshot().passkeyPending, false);
  assert.equal(session.snapshot().status?.emailVerified, true);
});

test("a pre-verify prompt cancellation does not become an unknown result", async () => {
  const auth = browserApi({ signInPasskey: async () => ({
    error: { code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY" }
  }) });
  await assert.rejects(createMemberClient(auth).signInPasskey(),
    (error) => error instanceof MemberAuthActionError && error.kind === "passkey-cancelled");
});

test("a verify transport loss is not reported as cancellation, even if the plugin wraps it", async () => {
  const auth = browserApi({
    signInPasskey: async (input) => {
      await input?.fetchOptions?.onRequest?.(verificationRequest);
      return { error: { code: "AUTH_CANCELLED" } };
    }
  });
  await assert.rejects(createMemberClient(auth).signInPasskey(),
    (error) => error instanceof MemberAuthActionError && error.kind === "passkey-sign-in-unconfirmed");
});


test("an acknowledged registration with an unavailable follow-up settles only on the original session", async () => {
  let reads = 0;
  const auth = browserApi({
    getSession: async () => {
      if (++reads === 2) throw new TypeError("unavailable");
      return { data: { session: { id: "original" } } };
    },
    addPasskey: async (input) => {
      assert.equal(input.fetchOptions?.headers?.[ACCOUNT_TRAY_PASSKEY_SESSION], "original");
      await input.fetchOptions?.onRequest?.(verificationRequest);
      await input.fetchOptions?.onResponse?.({ request: verificationRequest, response: new Response(null, {
        headers: { [ACCOUNT_TRAY_PASSKEY_CONFIRMED]: "1" }
      }) });
      return { error: null };
    }
  });
  const client = createMemberClient(auth);
  await assert.rejects(client.addPasskey(), asyncError => {
    assert.ok(asyncError instanceof MemberAuthActionError && asyncError.pendingPasskey?.acknowledged);
    return true;
  });
  assert.equal(await client.confirmPasskey({ sessionId: "original", acknowledged: true }), "added");
  await assert.rejects(client.confirmPasskey({ sessionId: "replacement", acknowledged: true }),
    (error) => error instanceof MemberAuthActionError && error.kind === "passkey-session-changed");
});
