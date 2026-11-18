import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemberClient, MemberAuthActionError, type MemberAuthBrowserApi } from "@/lib/member-auth/client";
import { ACCOUNT_TRAY_PASSKEY_CONFIRMED, ACCOUNT_TRAY_PASSKEY_SESSION } from "@/lib/member-auth/paths";
import { createMemberSession } from "@/components/Authentication/member-auth/_shared/session";

test("lost verification stays unknown, and a different session cannot inherit the pending check", async () => {
  let id = "original";
  let attempts = 0;
  const auth = {
    getSession: async () => ({ data: { session: { id } } }),
    passkey: { async addPasskey(input: Parameters<MemberAuthBrowserApi["passkey"]["addPasskey"]>[0]) {
      attempts++;
      await input.fetchOptions?.onRequest?.({} as never);
      throw new TypeError("response lost");
    } }
  } as MemberAuthBrowserApi;
  const fetcher = async () => Response.json({ success: true, data: {
    authenticated: true, emailVerified: true, member: false, phoneBound: false,
    capabilities: { emailOtp: true, magicLink: false, google: true, passkey: true }
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
  const auth = { signIn: { passkey: async () => ({
    error: { code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY" }
  }) } } as MemberAuthBrowserApi;
  await assert.rejects(createMemberClient(auth).signInPasskey(),
    (error) => error instanceof MemberAuthActionError && error.kind === "passkey-cancelled");
});

test("a verify transport loss is not reported as cancellation, even if the plugin wraps it", async () => {
  const auth = {
    signIn: { async passkey(input?: Parameters<MemberAuthBrowserApi["signIn"]["passkey"]>[0]) {
      await input?.fetchOptions?.onRequest?.({} as never);
      return { error: { code: "AUTH_CANCELLED" } };
    } }
  } as MemberAuthBrowserApi;
  await assert.rejects(createMemberClient(auth).signInPasskey(),
    (error) => error instanceof MemberAuthActionError && error.kind === "passkey-sign-in-unconfirmed");
});


test("an acknowledged registration with an unavailable follow-up settles only on the original session", async () => {
  let reads = 0;
  const auth = {
    getSession: async () => {
      if (++reads === 2) throw new TypeError("unavailable");
      return { data: { session: { id: "original" } } };
    },
    passkey: { async addPasskey(input: Parameters<MemberAuthBrowserApi["passkey"]["addPasskey"]>[0]) {
      assert.equal(input.fetchOptions?.headers?.[ACCOUNT_TRAY_PASSKEY_SESSION], "original");
      await input.fetchOptions?.onRequest?.({} as never);
      await input.fetchOptions?.onResponse?.({ response: new Response(null, {
        headers: { [ACCOUNT_TRAY_PASSKEY_CONFIRMED]: "1" }
      }) } as never);
      return { error: null };
    } }
  } as MemberAuthBrowserApi;
  const client = createMemberClient(auth);
  await assert.rejects(client.addPasskey(), asyncError => {
    assert.ok(asyncError instanceof MemberAuthActionError && asyncError.pendingPasskey?.acknowledged);
    return true;
  });
  assert.equal(await client.confirmPasskey({ sessionId: "original", acknowledged: true }), "added");
  await assert.rejects(client.confirmPasskey({ sessionId: "replacement", acknowledged: true }),
    (error) => error instanceof MemberAuthActionError && error.kind === "passkey-session-changed");
});
