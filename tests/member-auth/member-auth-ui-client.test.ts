import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMemberClient,
  MemberAuthActionError,
  parseMemberStatus,
  type MemberAuthBrowserApi,
  type MemberAuthFailureKind
} from "../../lib/member-auth/client";

const capabilities = {
  emailOtp: true,
  magicLink: true,
  google: true,
  passkey: true
};
const pending = {
  authenticated: true,
  emailVerified: true,
  phoneBound: false,
  member: false,
  capabilities
};
function fixture() {
  const calls: unknown[] = [];
  let failure = false;
  const action = async (...args: unknown[]) => {
    calls.push(args);
    return failure
      ? { error: { message: "PRIVATE PROVIDER DETAIL" } }
      : { error: null };
  };
  const auth: MemberAuthBrowserApi = {
    emailOtp: { sendVerificationOtp: action },
    signIn: {
      emailOtp: action,
      magicLink: action,
      social: action,
      passkey: action
    },
    passkey: { addPasskey: action },
    signOut: action
  };
  return {
    calls,
    auth,
    fail: () => {
      failure = true;
    }
  };
}

test("member status validates authoritative flags and strips unexpected credentials", () => {
  assert.deepEqual(
    parseMemberStatus({ ...pending, proofToken: "not-for-browser" }),
    pending
  );
  for (const value of [
    null,
    {},
    { ...pending, member: true },
    { ...pending, authenticated: false },
    { ...pending, capabilities: { ...capabilities, google: "yes" } }
  ])
    assert.throws(() => parseMemberStatus(value));
});

test("status and binding use fixed same-origin endpoints and require real server acknowledgement", async () => {
  const f = fixture();
  const requests: { path: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    requests.push({ path: String(input), init });
    return Response.json({
      success: true,
      data: String(input).endsWith("bind")
        ? { phoneBound: true, member: true }
        : pending
    });
  };
  const client = createMemberClient(f.auth, fetcher);
  assert.deepEqual(await client.status(), pending);
  await client.bindPhone("valid-challenge", "+821012345678");
  assert.equal(requests[0].path, "/api/member/status");
  assert.equal(requests[0].init?.cache, "no-store");
  assert.equal(requests[0].init?.credentials, "same-origin");
  assert.equal(requests[1].path, "/api/phone-verification/bind");
  assert.deepEqual(JSON.parse(String(requests[1].init?.body)), {
    challengeId: "valid-challenge",
    phone: "+821012345678"
  });
  await assert.rejects(
    createMemberClient(f.auth, async () =>
      Response.json({ success: true, data: { member: false } })
    ).bindPhone("valid-challenge", "+821012345678")
  );
});

test("passwordless actions have pinned callbacks and no password or phone-only authentication", async () => {
  const f = fixture();
  const c = createMemberClient(f.auth);
  await c.sendEmailCode(" member@example.com ");
  await c.verifyEmailCode("member@example.com", "a1B2c3");
  await c.sendMagicLink("member@example.com");
  await c.signInGoogle();
  await c.signInPasskey();
  await c.addPasskey();
  await c.signOut();
  const calls = f.calls.map((args) =>
    (args as Record<string, unknown>[]).map(({ fetchOptions, ...body }) => {
      assert.equal(
        typeof (fetchOptions as { onError: unknown }).onError,
        "function"
      );
      return body;
    })
  );
  assert.deepEqual(calls[0], [
    { email: "member@example.com", type: "sign-in" }
  ]);
  assert.deepEqual(calls[1], [{ email: "member@example.com", otp: "A1B2C3" }]);
  assert.deepEqual(calls[2], [
    { email: "member@example.com", callbackURL: "/account/continue" }
  ]);
  assert.deepEqual(calls[3], [
    { provider: "google", callbackURL: "/account/continue" }
  ]);
  assert.deepEqual(calls[4], [{}]);
  assert.deepEqual(calls[5], [{ name: "My passkey" }]);
  assert.deepEqual(calls[6], [{}]);
});

test("invalid input never starts an auth or identifier request", async () => {
  const f = fixture();
  let requests = 0;
  const c = createMemberClient(f.auth, async () => {
    requests++;
    return Response.json({ success: true });
  });
  for (const email of ["", "bad", "a\r\nb@example.com"])
    await assert.rejects(c.sendEmailCode(email));
  for (const code of [
    "",
    "A1B2C",
    "A1B2C3D",
    "12345678",
    "A1 B2C",
    "A1B2C3\n",
    "Ａ1B2C3",
    "ß1B2C3",
    "A1B2C!"
  ])
    await assert.rejects(c.verifyEmailCode("member@example.com", code));
  await assert.rejects(c.identifyPhone("not-a-phone"));
  assert.equal(f.calls.length, 0);
  assert.equal(requests, 0);
});

test("identifier only stores the chosen phone; clearing sends no account information", async () => {
  const f = fixture();
  const requests: RequestInit[] = [];
  const c = createMemberClient(f.auth, async (path, init) => {
    assert.equal(path, "/api/member/identify");
    requests.push(init!);
    return Response.json({ success: true, data: { identified: true } });
  });
  await c.identifyPhone("01012345678");
  await c.clearPhoneIdentifier();
  assert.equal(requests[0].method, "POST");
  assert.deepEqual(JSON.parse(String(requests[0].body)), {
    phone: "+821012345678"
  });
  assert.equal(requests[1].method, "DELETE");
  assert.equal(requests[1].body, undefined);
  assert.equal(f.calls.length, 0);
});

test("provider and HTTP failures reveal no raw details or success", async () => {
  const f = fixture();
  f.fail();
  const c = createMemberClient(f.auth);
  for (const action of [
    () => c.signInPasskey(),
    () => c.addPasskey(),
    () => c.sendEmailCode("member@example.com")
  ])
    await assert.rejects(
      action(),
      (error: Error) => !error.message.includes("PRIVATE")
    );
  await assert.rejects(
    createMemberClient(f.auth, async () =>
      Response.json(
        { success: false, error: "PRIVATE DATABASE DETAIL" },
        { status: 503 }
      )
    ).status(),
    /unavailable/i
  );
});

const privateDetail = "PRIVATE member@example.com <script>alert(1)</script>";
function failingClient(error: unknown, rejects = false) {
  const f = fixture();
  const action = async () => {
    if (rejects) throw error;
    return { error };
  };
  return createMemberClient({
    ...f.auth,
    emailOtp: { sendVerificationOtp: action },
    signIn: {
      emailOtp: action,
      magicLink: action,
      social: action,
      passkey: action
    },
    passkey: { addPasskey: action },
    signOut: action
  });
}
async function failureKind(
  action: Promise<unknown>,
  kind: MemberAuthFailureKind,
  retryAfterSeconds?: number
) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof MemberAuthActionError);
    assert.equal(error.kind, kind);
    assert.equal(error.retryAfterSeconds, retryAfterSeconds);
    assert.equal(error.name, "MemberAuthActionError");
    assert.ok(!error.message.includes("PRIVATE"));
    assert.ok(!error.message.includes("member@example.com"));
    assert.ok(!error.message.includes("<script>"));
    return true;
  });
}

test("OTP codes retain precise safe categories only during verification", async () => {
  for (const [code, kind] of [
    ["INVALID_OTP", "invalid-code"],
    ["OTP_EXPIRED", "expired-code"],
    ["TOO_MANY_ATTEMPTS", "attempts-exhausted"]
  ] as const) {
    const client = failingClient({ code, status: 400, message: privateDetail });
    await failureKind(
      client.verifyEmailCode("member@example.com", "A1B2C3"),
      kind
    );
    await failureKind(client.signInGoogle(), "unavailable");
    await failureKind(
      client.sendEmailCode("member@example.com"),
      "unavailable"
    );
  }
});

test("rate limits preserve only bounded retry metadata and safe delivery failures", async () => {
  for (const error of [
    { code: "RATE_LIMITED", message: privateDetail, retryAfterSeconds: 60 },
    { status: 429, message: privateDetail, retryAfterSeconds: 60 }
  ])
    await failureKind(
      failingClient(error).sendEmailCode("member@example.com"),
      "rate-limited",
      60
    );
  for (const retryAfterSeconds of [-1, 0, 1.5, Infinity, NaN, "60", 86401])
    await failureKind(
      failingClient({ status: 429, retryAfterSeconds }).signInGoogle(),
      "rate-limited"
    );
  const unavailable = failingClient({ status: 500, message: privateDetail });
  await failureKind(
    unavailable.sendEmailCode("member@example.com"),
    "delivery-failed"
  );
  await failureKind(
    unavailable.sendMagicLink("member@example.com"),
    "delivery-failed"
  );
  await failureKind(
    unavailable.verifyEmailCode("member@example.com", "A1B2C3"),
    "unavailable"
  );
});

test("passkey cancellation cannot cross operation boundaries or infer from messages", async () => {
  for (const error of [
    { code: "AUTH_CANCELLED", message: privateDetail },
    { code: "ERROR_CEREMONY_ABORTED", message: privateDetail },
    {
      code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
      message: privateDetail,
      cause: new DOMException(privateDetail, "NotAllowedError")
    },
    new DOMException(privateDetail, "NotAllowedError")
  ]) {
    const client = failingClient(error, error instanceof DOMException);
    await failureKind(client.signInPasskey(), "passkey-cancelled");
    await failureKind(client.addPasskey(), "passkey-cancelled");
    await failureKind(client.signInGoogle(), "unavailable");
    await failureKind(
      client.sendEmailCode("member@example.com"),
      "unavailable"
    );
  }
  for (const error of [
    { name: "NotAllowedError" },
    { code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY" },
    {
      code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
      cause: new DOMException(privateDetail, "SecurityError")
    },
    {
      code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
      cause: new Error(privateDetail)
    },
    { message: "Auth cancelled" },
    { code: "AUTH_CANCELLED<script>" }
  ])
    await failureKind(failingClient(error).signInPasskey(), "unavailable");
  const foreignError = new MemberAuthActionError("passkey-cancelled");
  foreignError.message = privateDetail;
  await failureKind(
    failingClient(foreignError, true).signInGoogle(),
    "unavailable"
  );
});

test("native SDK retry headers reach safe errors without mutating library errors", async () => {
  for (const [header, value, expected] of [
    ["X-Retry-After", "75", 75],
    ["Retry-After", "30", 30],
    ["X-Retry-After", "86400", 86400],
    ["X-Retry-After", "86401", undefined],
    ["X-Retry-After", "0", undefined],
    ["X-Retry-After", "-1", undefined],
    ["X-Retry-After", "1.5", undefined],
    ["X-Retry-After", privateDetail, undefined]
  ] as const) {
    const f = fixture();
    const error = Object.freeze({ status: 429, message: privateDetail });
    const auth: MemberAuthBrowserApi = {
      ...f.auth,
      emailOtp: {
        async sendVerificationOtp(input) {
          assert.equal(typeof input.fetchOptions?.onError, "function");
          await input.fetchOptions!.onError!({
            response: new Response(null, {
              status: 429,
              headers: { [header]: value }
            })
          } as never);
          return { error };
        }
      }
    };
    await failureKind(
      createMemberClient(auth).sendEmailCode("member@example.com"),
      "rate-limited",
      expected
    );
    assert.deepEqual(error, { status: 429, message: privateDetail });
  }
});

test("overlapping native SDK actions never share retry header state", async () => {
  const f = fixture();
  let finishFirst: (() => void) | undefined;
  const firstPending = new Promise<void>((resolve) => {
    finishFirst = resolve;
  });
  let sequence = 0;
  const auth: MemberAuthBrowserApi = {
    ...f.auth,
    signIn: {
      ...f.auth.signIn,
      social: async () => ({ error: { status: 429 } })
    },
    emailOtp: {
      async sendVerificationOtp(input) {
        const request = ++sequence;
        await input.fetchOptions?.onError?.({
          response: new Response(null, {
            status: 429,
            headers: { "X-Retry-After": String(request === 1 ? 90 : 20) }
          })
        } as never);
        if (request === 1) await firstPending;
        return { error: { status: 429 } };
      }
    }
  };
  const client = createMemberClient(auth);
  const first = failureKind(
    client.sendEmailCode("first@example.com"),
    "rate-limited",
    90
  );
  await failureKind(
    client.sendEmailCode("second@example.com"),
    "rate-limited",
    20
  );
  finishFirst!();
  await first;
  await failureKind(client.signInGoogle(), "rate-limited");
});

test("OAuth denial is allowlisted for Google only", async () => {
  for (const code of ["ACCESS_DENIED", "access_denied"]) {
    const client = failingClient({ code, message: privateDetail });
    await failureKind(client.signInGoogle(), "provider-denied");
    await failureKind(client.signInPasskey(), "unavailable");
    await failureKind(
      client.verifyEmailCode("member@example.com", "A1B2C3"),
      "unavailable"
    );
  }
  for (const code of [
    "access_denied<script>",
    privateDetail,
    "USER_NOT_FOUND",
    "INVALID_EMAIL",
    "provider-denied"
  ])
    await failureKind(
      failingClient({ code, message: privateDetail }).signInGoogle(),
      "unavailable"
    );
});

test("native network, abort and timeout failures stay distinct without leaking transport text", async () => {
  for (const [error, kind] of [
    [new TypeError(privateDetail), "network"],
    [new DOMException(privateDetail, "AbortError"), "timeout"],
    [new DOMException(privateDetail, "TimeoutError"), "timeout"],
    [new Error(privateDetail), "unavailable"],
    [{ name: "TimeoutError", message: privateDetail }, "unavailable"]
  ] as const) {
    await failureKind(
      failingClient(error, true).sendEmailCode("member@example.com"),
      kind
    );
    await failureKind(
      createMemberClient(fixture().auth, async () => {
        throw error;
      }).status(),
      kind
    );
  }
});

test("same-origin error envelopes sanitize code, status and retry headers", async () => {
  for (const [status, error, headers, kind, retry] of [
    [
      429,
      { code: "PRIVATE", message: privateDetail },
      { "Retry-After": "45" },
      "rate-limited",
      45
    ],
    [
      400,
      { code: "RATE_LIMITED", message: privateDetail },
      { "X-Retry-After": "30" },
      "rate-limited",
      30
    ],
    [
      429,
      { code: "RATE_LIMITED", message: privateDetail },
      { "Retry-After": "-30" },
      "rate-limited",
      undefined
    ],
    [
      503,
      { code: "AUTH_CANCELLED", message: privateDetail },
      {},
      "unavailable",
      undefined
    ],
    [
      400,
      { code: "ACCESS_DENIED", message: privateDetail },
      {},
      "unavailable",
      undefined
    ]
  ] as const) {
    const client = createMemberClient(fixture().auth, async () =>
      Response.json({ success: false, error }, { status, headers })
    );
    await failureKind(client.status(), kind, retry);
  }
});

test("malformed responses never pass as success or expose validation/provider details", async () => {
  for (const value of [
    null,
    [],
    {},
    "ok",
    { error: false },
    { error: "" },
    { error: 0 }
  ]) {
    const f = fixture();
    const client = createMemberClient({
      ...f.auth,
      signIn: { ...f.auth.signIn, passkey: async () => value as never }
    });
    await failureKind(client.signInPasskey(), "unavailable");
  }
  for (const response of [
    new Response("not JSON"),
    new Response("x".repeat(16385)),
    Response.json({
      success: true,
      data: { ...pending, authenticated: false }
    }),
    Response.json({
      success: false,
      error: { code: "PRIVATE", message: privateDetail }
    }),
    Response.json({ success: true }),
    Response.json([])
  ])
    await failureKind(
      createMemberClient(fixture().auth, async () => response).status(),
      "unavailable"
    );
  await failureKind(
    createMemberClient(
      fixture().auth,
      async () => new Response("not JSON", { status: 429 })
    ).status(),
    "rate-limited"
  );
});
