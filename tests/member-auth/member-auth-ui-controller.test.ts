import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMemberSession,
  isPhoneProofReady
} from "../../components/member-auth/_shared/session";
import type { MemberClient, MemberStatus } from "../../lib/member-auth/client";
import { MemberAuthActionError } from "../../lib/member-auth/client";

const capabilities = {
  emailOtp: true,
  magicLink: true,
  google: true,
  passkey: true
};
const anonymous: MemberStatus = {
  authenticated: false,
  emailVerified: false,
  phoneBound: false,
  member: false,
  capabilities
};
const pending: MemberStatus = {
  ...anonymous,
  authenticated: true,
  emailVerified: true
};
const active: MemberStatus = { ...pending, phoneBound: true, member: true };
function client() {
  let status = anonymous;
  const calls: string[] = [];
  const record = (name: string) => async () => {
    calls.push(name);
  };
  const value: MemberClient = {
    status: async () => status,
    clearPhoneIdentifier: record("clear"),
    identifyPhone: record("identify"),
    sendEmailCode: record("code"),
    verifyEmailCode: async () => {
      calls.push("verify");
      status = pending;
    },
    sendMagicLink: record("link"),
    signInGoogle: record("google"),
    signInPasskey: async () => {
      status = active;
    },
    addPasskey: record("passkey"),
    bindPhone: async () => {
      calls.push("bind");
      status = active;
    },
    signOut: async () => {
      status = anonymous;
    }
  };
  return {
    value,
    calls,
    setStatus: (next: MemberStatus) => {
      status = next;
    }
  };
}

test("email identity precedes phone and only acknowledged binding activates membership", async () => {
  const c = client();
  const s = createMemberSession(c.value, () => {});
  await s.initialize();
  assert.equal(s.snapshot().status?.member, false);
  assert.deepEqual(c.calls, ["clear"]);
  await s.sendCode("member@example.com");
  assert.equal(s.snapshot().codeRequested, true);
  await s.verifyCode("member@example.com", "A1B2C3");
  assert.equal(s.snapshot().status?.emailVerified, true);
  assert.equal(s.snapshot().status?.member, false);
  await s.bindPhone("challenge", "+821012345678");
  assert.equal(s.snapshot().status?.member, true);
  await s.addPasskey();
  assert.match(s.snapshot().notice!, /Passkey added/);
  await s.signOut();
  assert.equal(s.snapshot().status?.authenticated, false);
});

test("passkeys and phone identifiers cannot activate pending membership by themselves", async () => {
  const c = client();
  const s = createMemberSession(c.value, () => {});
  await s.initialize();
  await s.identifyPhone("01012345678");
  assert.equal(s.snapshot().phoneIdentified, true);
  assert.equal(s.snapshot().status?.member, false);
  const clears = c.calls.filter((name) => name === "clear").length;
  await s.refresh();
  assert.equal(s.snapshot().phoneIdentified, true);
  assert.equal(c.calls.filter((name) => name === "clear").length, clears);
  await s.clearIdentifier();
  assert.equal(s.snapshot().phoneIdentified, false);
  await s.addPasskey();
  assert.ok(s.snapshot().error);
  assert.equal(c.calls.includes("passkey"), false);
  await s.signInPasskey();
  assert.equal(s.snapshot().status?.member, true);
  await s.sendLink("member@example.com");
  assert.match(s.snapshot().notice!, /inbox/);
  await s.signInGoogle();
  assert.equal(c.calls.includes("google"), true);
});

test("editing email resets code entry without dropping the selected phone identity", async () => {
  const c = client();
  const s = createMemberSession(c.value, () => {});
  await s.initialize();
  await s.identifyPhone("01012345678");
  await s.sendCode("member@example.com");
  s.editEmail();
  assert.equal(s.snapshot().codeRequested, false);
  assert.equal(s.snapshot().phoneIdentified, true);
});

test("errors and cancelled credentials never turn into passkey or account success", async () => {
  const c = client();
  c.setStatus(active);
  const s = createMemberSession(
    {
      ...c.value,
      addPasskey: async () => {
        throw Error("PRIVATE");
      },
      bindPhone: async () => {}
    },
    () => {}
  );
  await s.initialize();
  await s.addPasskey();
  assert.ok(s.snapshot().error);
  assert.equal(s.snapshot().notice, null);
  assert.doesNotMatch(s.snapshot().error!, /PRIVATE/);
  c.setStatus(pending);
  await s.refresh();
  await s.bindPhone("challenge", "01012345678");
  assert.equal(s.snapshot().status?.member, false);
  assert.ok(s.snapshot().error);
});

test("concurrent actions are serialized and disposed requests cannot update the UI", async () => {
  let resolve!: (value: MemberStatus) => void;
  let calls = 0;
  const changes: unknown[] = [];
  const c = client();
  const s = createMemberSession(
    {
      ...c.value,
      status: async () => {
        calls++;
        return await new Promise((r) => {
          resolve = r;
        });
      }
    },
    (v) => changes.push(v)
  );
  const loading = s.initialize();
  await s.initialize();
  assert.equal(calls, 1);
  assert.equal(s.snapshot().busy, true);
  s.dispose();
  const count = changes.length;
  resolve(anonymous);
  await loading;
  assert.equal(changes.length, count);
  assert.equal(c.calls.length, 0);
  await s.sendCode("member@example.com");
  assert.equal(c.calls.includes("code"), false);
});

test("missing configuration and uncleared identifiers remain unavailable, not a false ready state", async () => {
  const c = client();
  const s = createMemberSession(
    {
      ...c.value,
      clearPhoneIdentifier: async () => {
        throw Error("private");
      }
    },
    () => {}
  );
  await s.initialize();
  assert.equal(s.snapshot().status, null);
  assert.ok(s.snapshot().error);
  const unavailable = createMemberSession(
    {
      ...c.value,
      status: async () => {
        throw Error("setup");
      }
    },
    () => {}
  );
  await unavailable.initialize();
  assert.equal(unavailable.snapshot().status, null);
  assert.ok(unavailable.snapshot().error);
});

test("phone-binding action requires the matching unexpired verified challenge", () => {
  const challenge = {
    id: "challenge",
    recipient: "verify@sophomores.co",
    body: "SPHMRS fixture",
    expiresAt: "2030-01-01T00:05:00.000Z",
    mode: "trial" as const
  };
  const status = {
    id: challenge.id,
    expiresAt: challenge.expiresAt,
    mode: "trial" as const,
    state: "verified" as const
  };
  const snapshot = { challenge, status, busy: false, error: null };
  assert.equal(
    isPhoneProofReady(
      snapshot,
      "+821012345678",
      Date.parse("2030-01-01T00:00:00Z")
    ),
    true
  );
  assert.equal(isPhoneProofReady(snapshot, "", 0), false);
  assert.equal(
    isPhoneProofReady(
      snapshot,
      "+821012345678",
      Date.parse(challenge.expiresAt)
    ),
    false
  );
  assert.equal(
    isPhoneProofReady(
      { ...snapshot, status: { ...status, state: "review" } },
      "+821012345678",
      0
    ),
    false
  );
  assert.equal(
    isPhoneProofReady(
      { ...snapshot, status: { ...status, id: "other" } },
      "+821012345678",
      0
    ),
    false
  );
});

test("structured code errors preserve correction but invalidate expired challenges", async () => {
  const c = client();
  let kind: "invalid-code" | "expired-code" | "attempts-exhausted" = "invalid-code";
  let attempts = 0;
  const s = createMemberSession({ ...c.value, verifyEmailCode: async () => {
    attempts++;
    throw new MemberAuthActionError(kind);
  } }, () => {});
  await s.initialize();
  await s.sendCode("member@example.com");
  await s.verifyCode("member@example.com", "WRONG1");
  assert.equal(s.snapshot().failure, "invalid-code");
  assert.equal(s.snapshot().codeRequested, true);
  assert.match(s.snapshot().error!, /code/i);
  kind = "expired-code";
  await s.verifyCode("member@example.com", "WRONG2");
  assert.equal(s.snapshot().codeRequested, true);
  await s.verifyCode("member@example.com", "WRONG3");
  assert.equal(attempts, 2);
  assert.equal(s.snapshot().failure, "expired-code");
});

test("send cooldown is absolute, blocks rapid retries without clearing failures, and expires", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const c = client();
    const s = createMemberSession({ ...c.value, verifyEmailCode: async () => {
      throw new MemberAuthActionError("invalid-code");
    } }, () => {});
    await s.sendCode("member@example.com");
    assert.equal(s.snapshot().resendAvailableAt, 31_000);
    await s.verifyCode("member@example.com", "WRONG1");
    await s.sendCode("member@example.com");
    assert.equal(c.calls.filter((name) => name === "code").length, 1);
    assert.equal(s.snapshot().failure, "invalid-code");
    now = 31_000;
    await s.sendCode("member@example.com");
    assert.equal(c.calls.filter((name) => name === "code").length, 2);
    assert.equal(s.snapshot().resendAvailableAt, 61_000);
    assert.equal(s.snapshot().failure, null);
  } finally { Date.now = originalNow; }
});

test("rate limiting uses safe bounded deadlines and generic-shaped errors cannot leak", async () => {
  const originalNow = Date.now;
  Date.now = () => 1_000;
  try {
    const c = client();
    const s = createMemberSession({ ...c.value, sendEmailCode: async () => {
      throw new MemberAuthActionError("rate-limited", 90);
    } }, () => {});
    await s.sendCode("member@example.com");
    assert.equal(s.snapshot().failure, "rate-limited");
    assert.equal(s.snapshot().resendAvailableAt, 91_000);
    const fallback = createMemberSession({ ...c.value, sendEmailCode: async () => {
      throw new MemberAuthActionError("rate-limited");
    } }, () => {});
    await fallback.sendCode("member@example.com");
    assert.equal(fallback.snapshot().resendAvailableAt, 61_000);
    const unknown = createMemberSession({ ...c.value, signInGoogle: async () => {
      throw { kind: "provider-denied", message: "PRIVATE", retryAfterSeconds: 999999999 };
    } }, () => {});
    await unknown.signInGoogle();
    assert.equal(unknown.snapshot().notice, null);
    assert.equal(unknown.snapshot().failure, "unavailable");
    assert.doesNotMatch(unknown.snapshot().error!, /PRIVATE/);
  } finally { Date.now = originalNow; }
});

test("cancelled passkeys and denied providers are safe notices, never authenticated success", async () => {
  for (const kind of ["passkey-cancelled", "provider-denied"] as const) {
    const c = client();
    const action = async () => { throw new MemberAuthActionError(kind); };
    const s = createMemberSession({ ...c.value, signInPasskey: action, signInGoogle: action }, () => {});
    await s.initialize();
    if (kind === "passkey-cancelled") await s.signInPasskey();
    else await s.signInGoogle();
    assert.equal(s.snapshot().error, null);
    assert.equal(s.snapshot().failure, kind);
    assert.ok(s.snapshot().notice);
    assert.equal(s.snapshot().status?.authenticated, false);
  }
});

test("callback errors are allowlisted notices after status, with unknown values generic", async () => {
  const c = client();
  const denied = createMemberSession(c.value, () => {});
  await denied.initialize("access_denied");
  assert.equal(denied.snapshot().failure, "provider-denied");
  assert.equal(denied.snapshot().error, null);
  assert.ok(denied.snapshot().notice);
  const unknown = createMemberSession(c.value, () => {});
  await unknown.initialize("PRIVATE<script>");
  assert.equal(unknown.snapshot().failure, "unavailable");
  assert.doesNotMatch(unknown.snapshot().error!, /PRIVATE|script/);
  const unavailable = createMemberSession({ ...c.value, status: async () => { throw Error("PRIVATE"); } }, () => {});
  await unavailable.initialize("access_denied");
  assert.equal(unavailable.snapshot().status, null);
  assert.equal(unavailable.snapshot().notice, null);
  assert.ok(unavailable.snapshot().error);
});

test("successful code verification still waits for server-confirmed authentication", async () => {
  const c = client();
  const s = createMemberSession({ ...c.value, verifyEmailCode: async () => {} }, () => {});
  await s.initialize();
  await s.sendCode("member@example.com");
  await s.verifyCode("member@example.com", "A1B2C3");
  assert.equal(s.snapshot().status?.authenticated, false);
  assert.ok(s.snapshot().error);
});

test("attempt exhaustion requires a new send before manual verification can recover", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const c = client();
    let exhausted = true;
    let attempts = 0;
    const s = createMemberSession({ ...c.value, verifyEmailCode: async () => {
      attempts++;
      if (exhausted) throw new MemberAuthActionError("attempts-exhausted");
      c.setStatus(pending);
    } }, () => {});
    await s.initialize();
    await s.sendCode("member@example.com");
    await s.verifyCode("member@example.com", "A1B2C3");
    assert.equal(s.snapshot().failure, "attempts-exhausted");
    assert.equal(s.snapshot().codeRequested, true);
    exhausted = false;
    await s.verifyCode("member@example.com", "A1B2C3");
    assert.equal(attempts, 1);
    now = 31_000;
    await s.sendCode("member@example.com");
    await s.verifyCode("member@example.com", "D4E5F6");
    assert.equal(attempts, 2);
    assert.equal(s.snapshot().status?.authenticated, true);
    assert.equal(s.snapshot().status?.member, false);
  } finally { Date.now = originalNow; }
});

test("delivery, network, timeout and unavailability are actionable safe errors", async () => {
  for (const kind of ["delivery-failed", "network", "timeout", "unavailable"] as const) {
    const c = client();
    const s = createMemberSession({ ...c.value, sendEmailCode: async () => {
      throw new MemberAuthActionError(kind);
    } }, () => {});
    await s.sendCode("member@example.com");
    assert.equal(s.snapshot().failure, kind);
    assert.ok(s.snapshot().error);
    assert.equal(s.snapshot().notice, null);
    assert.equal(s.snapshot().codeRequested, false);
    assert.equal(s.snapshot().resendAvailableAt, null);
  }
});

test("rate-limited metadata cannot create invalid or unbounded local deadlines", async () => {
  const originalNow = Date.now;
  Date.now = () => 1_000;
  try {
    for (const [retry, seconds] of [[Infinity, 60], [NaN, 60], [-1, 60], [999999999, 60], [86400, 86400]] as const) {
      const c = client();
      const s = createMemberSession({ ...c.value, sendEmailCode: async () => {
        throw new MemberAuthActionError("rate-limited", retry);
      } }, () => {});
      await s.sendCode("member@example.com");
      assert.equal(s.snapshot().resendAvailableAt, 1_000 + seconds * 1000);
    }
  } finally { Date.now = originalNow; }
});

test("disposed structured failures cannot publish a pending error or cooldown", async () => {
  const c = client();
  let reject!: (error: unknown) => void;
  const changes: unknown[] = [];
  const s = createMemberSession({ ...c.value, sendEmailCode: async () => {
    await new Promise<void>((_resolve, rejectPromise) => { reject = rejectPromise; });
  } }, (value) => changes.push(value));
  const sending = s.sendCode("member@example.com");
  assert.equal(s.snapshot().pendingAction, "send-code");
  s.dispose();
  const count = changes.length;
  reject(new MemberAuthActionError("rate-limited", 90));
  await sending;
  assert.equal(changes.length, count);
  assert.equal(s.snapshot().resendAvailableAt, null);
  assert.equal(s.snapshot().failure, null);
  assert.equal(s.snapshot().pendingAction, "send-code");
});

test("verification rate limiting blocks repeat clicks independently of resend cooldown and refresh", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const c = client();
    let attempts = 0;
    const s = createMemberSession({ ...c.value, verifyEmailCode: async () => {
      attempts++;
      if (attempts === 1) throw new MemberAuthActionError("rate-limited", 90);
      c.setStatus(pending);
    } }, () => {});
    await s.initialize();
    await s.sendCode("member@example.com");
    assert.equal(s.snapshot().resendAvailableAt, 31_000);
    await s.verifyCode("member@example.com", "A1B2C3");
    assert.equal(attempts, 1);
    assert.equal(s.snapshot().failure, "rate-limited");
    assert.equal(s.snapshot().resendAvailableAt, 91_000);
    await s.verifyCode("member@example.com", "A1B2C3");
    assert.equal(attempts, 1);
    assert.equal(s.snapshot().failure, "rate-limited");
    await s.refresh();
    assert.equal(s.snapshot().failure, "rate-limited");
    assert.equal(s.snapshot().resendAvailableAt, 91_000);
    await s.verifyCode("member@example.com", "A1B2C3");
    assert.equal(attempts, 1);
    now = 91_000;
    await s.verifyCode("member@example.com", "A1B2C3");
    assert.equal(attempts, 2);
    assert.equal(s.snapshot().status?.authenticated, true);
    assert.equal(s.snapshot().status?.member, false);
  } finally { Date.now = originalNow; }
});

test("mutated structured failure kinds fall back to the static generic error", async () => {
  for (const kind of ["PRIVATE<script>", "__proto__", null]) {
    const c = client();
    const failure = new MemberAuthActionError("provider-denied");
    Object.defineProperty(failure, "kind", { value: kind });
    failure.message = "PRIVATE raw provider message";
    const s = createMemberSession({ ...c.value, signInGoogle: async () => {
      throw failure;
    } }, () => {});
    await s.signInGoogle();
    assert.equal(s.snapshot().failure, "unavailable");
    assert.equal(s.snapshot().notice, null);
    assert.ok(s.snapshot().error);
    assert.doesNotMatch(s.snapshot().error!, /PRIVATE|script|provider message/);
  }
});

test("pending send and verification actions stay distinct until their server work settles", async () => {
  const c = client();
  let resolveSend!: () => void;
  let resolveVerify!: () => void;
  const s = createMemberSession({
    ...c.value,
    sendEmailCode: async () => {
      await new Promise<void>((resolve) => { resolveSend = resolve; });
    },
    verifyEmailCode: async () => {
      await new Promise<void>((resolve) => { resolveVerify = resolve; });
      c.setStatus(pending);
    }
  }, () => {});
  assert.equal(s.snapshot().pendingAction, null);
  await s.initialize();
  const sending = s.sendCode("member@example.com");
  assert.equal(s.snapshot().pendingAction, "send-code");
  assert.equal(s.snapshot().busy, true);
  assert.equal(s.snapshot().codeRequested, false);
  assert.equal(s.snapshot().notice, null);
  assert.equal(s.snapshot().status?.authenticated, false);
  resolveSend();
  await sending;
  assert.equal(s.snapshot().pendingAction, null);
  assert.equal(s.snapshot().busy, false);
  assert.equal(s.snapshot().codeRequested, true);
  const verifying = s.verifyCode("member@example.com", "A1B2C3");
  assert.equal(s.snapshot().pendingAction, "verify-code");
  assert.equal(s.snapshot().busy, true);
  assert.equal(s.snapshot().status?.authenticated, false);
  assert.equal(s.snapshot().notice, null);
  resolveVerify();
  await verifying;
  assert.equal(s.snapshot().pendingAction, null);
  assert.equal(s.snapshot().busy, false);
  assert.equal(s.snapshot().status?.authenticated, true);
  assert.equal(s.snapshot().status?.member, false);
});

test("successful refresh retains code feedback without pretending to reverify it", async () => {
  for (const kind of ["invalid-code", "expired-code", "attempts-exhausted"] as const) {
    const c = client();
    let attempts = 0;
    const s = createMemberSession({ ...c.value, verifyEmailCode: async () => {
      attempts++;
      throw new MemberAuthActionError(kind);
    } }, () => {});
    await s.initialize();
    await s.sendCode("member@example.com");
    await s.verifyCode("member@example.com", "A1B2C3");
    const error = s.snapshot().error;
    const deadline = s.snapshot().resendAvailableAt;
    await s.refresh();
    assert.equal(s.snapshot().failure, kind);
    assert.equal(s.snapshot().error, error);
    assert.equal(s.snapshot().resendAvailableAt, deadline);
    assert.equal(s.snapshot().codeRequested, true);
    assert.equal(attempts, 1);
  }
});

test("expired rate limits clear after acknowledged refresh but fresh errors replace old feedback", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const c = client();
    let failedStatus = false;
    const s = createMemberSession({ ...c.value,
      status: async () => {
        if (failedStatus) throw new MemberAuthActionError("network");
        return anonymous;
      },
      verifyEmailCode: async () => { throw new MemberAuthActionError("rate-limited", 90); }
    }, () => {});
    await s.initialize();
    await s.sendCode("member@example.com");
    await s.verifyCode("member@example.com", "A1B2C3");
    now = 91_000;
    await s.refresh();
    assert.equal(s.snapshot().failure, null);
    assert.equal(s.snapshot().error, null);
    await s.verifyCode("member@example.com", "A1B2C3");
    failedStatus = true;
    await s.refresh();
    assert.equal(s.snapshot().failure, "network");
    assert.match(s.snapshot().error!, /connect/);
  } finally { Date.now = originalNow; }
});

test("switching sign-in methods leaves stale OTP view without dropping identity or status", async () => {
  for (const method of ["signInPasskey", "signInGoogle", "sendLink"] as const) {
    const c = client();
    const s = createMemberSession({ ...c.value,
      verifyEmailCode: async () => { throw new MemberAuthActionError("expired-code"); },
      signInPasskey: async () => { throw new MemberAuthActionError("passkey-cancelled"); },
      signInGoogle: async () => { throw new MemberAuthActionError("provider-denied"); }
    }, () => {});
    await s.initialize();
    await s.identifyPhone("01012345678");
    await s.sendCode("member@example.com");
    await s.verifyCode("member@example.com", "A1B2C3");
    assert.equal(s.snapshot().codeRequested, true);
    if (method === "sendLink") await s.sendLink("member@example.com");
    else await s[method]();
    assert.equal(s.snapshot().codeRequested, false);
    assert.equal(s.snapshot().phoneIdentified, true);
    assert.equal(s.snapshot().status?.authenticated, false);
    assert.equal(s.snapshot().error, null);
    assert.ok(s.snapshot().notice);
  }
});

test("code recovery survives failed resend and refresh independently of latest transport feedback", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    for (const kind of ["expired-code", "attempts-exhausted"] as const) {
      now = 1_000;
      const c = client();
      let sends = 0;
      let failRefresh = false;
      let verifies = 0;
      const s = createMemberSession({ ...c.value,
        status: async () => {
          if (failRefresh) throw new MemberAuthActionError("timeout");
          return anonymous;
        },
        sendEmailCode: async () => {
          sends++;
          if (sends === 2) throw new MemberAuthActionError("network");
        },
        verifyEmailCode: async () => {
          verifies++;
          throw new MemberAuthActionError(kind);
        }
      }, () => {});
      assert.equal(s.snapshot().codeRecovery, null);
      await s.initialize();
      await s.sendCode("member@example.com");
      await s.verifyCode("member@example.com", "A1B2C3");
      assert.equal(s.snapshot().codeRecovery, kind);
      now = 31_000;
      await s.sendCode("member@example.com");
      assert.equal(s.snapshot().failure, "network");
      assert.equal(s.snapshot().codeRecovery, kind);
      failRefresh = true;
      await s.refresh();
      assert.equal(s.snapshot().failure, "timeout");
      assert.equal(s.snapshot().codeRecovery, kind);
      assert.equal(s.snapshot().codeRequested, true);
      await s.verifyCode("member@example.com", "D4E5F6");
      assert.equal(verifies, 1);
      assert.equal(s.snapshot().status?.authenticated, false);
      await s.sendCode("member@example.com");
      assert.equal(s.snapshot().codeRecovery, null);
      assert.equal(s.snapshot().verificationAvailableAt, null);
    }
  } finally { Date.now = originalNow; }
});

test("public verification deadline survives a failed refresh and resets after successful fresh send", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const c = client();
    let failRefresh = false;
    const s = createMemberSession({ ...c.value,
      status: async () => {
        if (failRefresh) throw new MemberAuthActionError("unavailable");
        return anonymous;
      },
      verifyEmailCode: async () => { throw new MemberAuthActionError("rate-limited", 90); }
    }, () => {});
    assert.equal(s.snapshot().verificationAvailableAt, null);
    await s.initialize();
    await s.sendCode("member@example.com");
    await s.verifyCode("member@example.com", "A1B2C3");
    assert.equal(s.snapshot().verificationAvailableAt, 91_000);
    failRefresh = true;
    await s.refresh();
    assert.equal(s.snapshot().failure, "unavailable");
    assert.equal(s.snapshot().verificationAvailableAt, 91_000);
    assert.equal(s.snapshot().status?.authenticated, false);
    now = 91_000;
    await s.sendCode("member@example.com");
    assert.equal(s.snapshot().verificationAvailableAt, null);
    assert.equal(s.snapshot().status?.authenticated, false);
  } finally { Date.now = originalNow; }
});
