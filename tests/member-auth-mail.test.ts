import assert from "node:assert/strict";
import { test } from "node:test";
import { loadMemberMailConfig } from "../lib/member-auth/mail-config";
import {
  createMemberMailer, createSmtpConnectionTransport, memberSmtpSettings,
  type MemberMailMessage, type MemberMailNotification, type MemberMailTransport,
  type MemberSmtpSettings
} from "../lib/member-auth/mail";

const config = loadMemberMailConfig({
  MEMBER_AUTH_MAIL_MODE: "smtp", MEMBER_AUTH_SMTP_HOST: "smtp.zeptomail.com",
  MEMBER_AUTH_SMTP_PORT: "465", MEMBER_AUTH_SMTP_USERNAME: "emailapikey",
  MEMBER_AUTH_SMTP_PASSWORD: "synthetic-secret", MEMBER_AUTH_SMTP_FROM: "concierge@sophomores.co"
})!;
const origin = "http://localhost:3240";
const email = "member@example.com";
const link = `${origin}/api/auth/magic-link/verify?token=${"a".repeat(32)}&callbackURL=${encodeURIComponent(origin + "/account")}`;
function fake(result: unknown = { accepted: [email], rejected: [] }) {
  const state: { messages: MemberMailMessage[]; settings: MemberSmtpSettings[]; closed: number } = { messages: [], settings: [], closed: 0 };
  const transport: MemberMailTransport = {
    sendMail: async (message) => { state.messages.push(message); return result; },
    close: () => { state.closed++; }
  };
  return { state, transportFactory: (settings: MemberSmtpSettings) => { state.settings.push(settings); return transport; } };
}

test("disabled member email refuses delivery without constructing a transport", async () => {
  const p = fake();
  await assert.rejects(createMemberMailer(null, origin, p)({ type: "email-otp", email, otp: "A1B2C3" }), /Member email delivery is unavailable/);
  assert.deepEqual(p.state.settings, []);
});

test("email OTP sends one fixed plain-text message and closes after SMTP acceptance", async () => {
  const p = fake();
  await createMemberMailer(config, origin, p)({ type: "email-otp", email, otp: "A1B2C3" });
  assert.equal(p.state.closed, 1);
  assert.equal(p.state.messages.length, 1);
  const message = p.state.messages[0];
  assert.deepEqual(message.envelope, { from: config.from, to: [email] });
  assert.deepEqual(message.to, { address: email });
  assert.deepEqual(message.from, { name: "Sophomores", address: config.from });
  assert.match(message.text, /A1B2C3/);
  assert.match(message.text, /5 minutes/);
  assert.equal(message.subject, "Your Sophomores sign-in code");
  assert.equal(message.disableFileAccess, true);
  assert.equal(message.disableUrlAccess, true);
  assert.equal(message.xMailer, false);
  assert.deepEqual(Object.keys(message).sort(), ["disableFileAccess", "disableUrlAccess", "envelope", "from", "subject", "text", "to", "xMailer"].sort());
});

test("magic links accept only the exact member origin and fixed safe callback paths", async () => {
  const p = fake();
  await createMemberMailer(config, origin, p)({ type: "magic-link", email, url: link });
  assert.match(p.state.messages[0].text, /\/api\/auth\/magic-link\/verify\?token=/);
  assert.equal(p.state.messages[0].subject, "Your Sophomores sign-in link");
  for (const callback of ["/account", origin + "/account", "/account/continue", origin + "/account/continue"]) {
    await createMemberMailer(config, origin, fake())({ type: "magic-link", email, url: `${origin}/api/auth/magic-link/verify?token=${"x".repeat(32)}&callbackURL=${encodeURIComponent(callback)}` });
  }
  await createMemberMailer(config, origin, fake())({ type: "magic-link", email,
    url: `${origin}/api/auth/magic-link/verify?token=${"x".repeat(32)}&callbackURL=${encodeURIComponent("/account/continue")}&newUserCallbackURL=${encodeURIComponent(origin + "/account/continue")}&errorCallbackURL=${encodeURIComponent("/account")}` });
});

test("magic-link continuation never admits query redirects or an error-success destination", async () => {
  for (const [key, callback] of [
    ["callbackURL", "/account/continue?next=https://evil.invalid"],
    ["newUserCallbackURL", "/account/continue#success"],
    ["callbackURL", "/account/continue/"],
    ["errorCallbackURL", "/account/continue"],
    ["errorCallbackURL", origin + "/account/continue"]
  ]) {
    const p = fake();
    await assert.rejects(createMemberMailer(config, origin, p)({ type: "magic-link", email,
      url: `${origin}/api/auth/magic-link/verify?token=${"x".repeat(32)}&${key}=${encodeURIComponent(callback)}` }));
    assert.deepEqual(p.state.messages, []);
  }
});

test("invalid recipients, code shapes, mixed notifications and links never reach SMTP", async () => {
  const notifications: unknown[] = [null, {}, { type: "unknown", email },
    ...["", "a@example.com,b@example.com", "Name <a@example.com>", "a@example.com\r\nBcc:private@example.com", "a@localhost", "a".repeat(65) + "@example.com"].map((recipient) => ({ type: "email-otp", email: recipient, otp: "A1B2C3" })),
    ...["A1B2C", "A1B2C3D", "12345678", "a1b2c3", "A1 B2C", "Ａ1B2C3", "ß1B2C3", "A1B2C3\n", undefined, 123456].map((otp) => ({ type: "email-otp", email, otp })),
    { type: "email-otp", email, otp: "A1B2C3", url: link },
    { type: "magic-link", email, url: link, otp: "A1B2C3" },
    ...["https://evil.invalid/api/auth/magic-link/verify?token=" + "x".repeat(32), link + "#fragment", link + "&token=duplicate", link + "&unexpected=1", link.replace("/magic-link/verify", "/other"), link.replace("token=", "token=bad%0A"), link.replace("localhost", "local\nhost"), " " + link, link.replace("/api/auth", "\\api\\auth"), `${origin}/api/auth/magic-link/verify?token=${"x".repeat(32)}&callbackURL=https://evil.invalid/`, `${origin}/api/auth/magic-link/verify?token=${"x".repeat(32)}&errorCallbackURL=${encodeURIComponent(origin + "/account?secret=1")}`, `${origin}/api/auth/magic-link/verify?token=${"x".repeat(32)}&callbackURL=${encodeURIComponent("http://local\nhost:3240/account")}`, "http://user:pass@localhost:3240/api/auth/magic-link/verify?token=" + "x".repeat(32), "x".repeat(4097)].map((url) => ({ type: "magic-link", email, url }))
  ];
  for (const notification of notifications) {
    const p = fake();
    await assert.rejects(createMemberMailer(config, origin, p)(notification as MemberMailNotification), /Member email delivery is unavailable/);
    assert.deepEqual(p.state.messages, []);
  }
});

test("SMTP failures, refused recipients, and deadlines are fixed errors and close the real transport", async () => {
  for (const result of [undefined, {}, { accepted: [], rejected: [email] }, { accepted: [email, "other@example.com"], rejected: [] }, { accepted: [email], rejected: ["other@example.com"] }]) {
    const p = fake(result ?? null);
    await assert.rejects(createMemberMailer(config, origin, p)({ type: "email-otp", email, otp: "A1B2C3" }));
    assert.equal(p.state.closed, 1);
  }
  for (const sendMail of [async () => { throw new Error("private-token A1B2C3 recipient@example.com"); }, async () => new Promise(() => {})]) {
    let closed = 0;
    const mailer = createMemberMailer(config, origin, { deadlineMs: 5, transportFactory: () => ({ sendMail, close: () => { closed++; } }) });
    await assert.rejects(mailer({ type: "email-otp", email, otp: "A1B2C3" }), (error: unknown) => {
      assert.equal((error as Error).message, "Member email delivery is unavailable."); return true;
    });
    assert.equal(closed, 1);
  }
});

test("transport construction and close failures never leak private exceptions", async () => {
  for (const transportFactory of [
    () => { throw new Error("private SMTP credential"); },
    () => ({ sendMail: async () => ({ accepted: [email], rejected: [] }), close: () => { throw new Error("private close error"); } })
  ]) {
    await assert.rejects(createMemberMailer(config, origin, { transportFactory })({ type: "email-otp", email, otp: "A1B2C3" }), (error: unknown) => {
      assert.equal((error as Error).message, "Member email delivery is unavailable."); return true;
    });
  }
});

test("SMTP settings enforce certificate verification, explicit TLS and bounded network work", () => {
  const settings = memberSmtpSettings(config);
  assert.equal(settings.host, "smtp.zeptomail.com");
  assert.equal(settings.secure, true);
  assert.equal(settings.requireTLS, true);
  assert.equal(settings.tls.rejectUnauthorized, true);
  assert.equal(settings.tls.minVersion, "TLSv1.2");
  assert.equal(settings.logger, false);
  assert.equal(settings.debug, false);
  assert.equal(settings.connectionTimeout, 5000);
  assert.equal(settings.greetingTimeout, 3000);
  assert.equal(settings.socketTimeout, 5000);
  assert.equal(settings.dnsTimeout, 3000);
  assert.equal(memberSmtpSettings({ ...config, port: 587 }).secure, false);
  for (const badOrigin of ["not-an-origin", "http://127.0.0.1:3240", "https://example.com", origin + "/path", origin + "?x=1", "http://user@localhost:3240"])
    assert.throws(() => createMemberMailer(config, badOrigin), /Member email configuration is invalid/);
  for (const deadlineMs of [0, -1, Infinity, NaN, 10001])
    assert.throws(() => createMemberMailer(config, origin, { deadlineMs }));
});

test("Nodemailer connection adapter composes safe MIME and cancels its actual connection", async () => {
  let connected = 0, loggedIn = 0, closed = 0;
  let captured = "";
  const connection = {
    once: () => connection,
    connect: (done: (error?: Error) => void) => { connected++; done(); },
    login: (_auth: unknown, done: (error: Error | null) => void) => { loggedIn++; done(null); },
    send: (envelope: unknown, raw: Buffer, done: (error: Error | null, info: unknown) => void) => {
      assert.deepEqual(envelope, { from: config.from, to: [email] });
      captured = raw.toString(); done(null, { accepted: [email], rejected: [] });
    },
    close: () => { closed++; }
  };
  const sender = createSmtpConnectionTransport(memberSmtpSettings(config), () => connection as never);
  const p = fake();
  await createMemberMailer(config, origin, { transportFactory: () => sender })({ type: "email-otp", email, otp: "A1B2C3" });
  assert.equal(connected, 1); assert.equal(loggedIn, 1); assert.equal(closed, 1);
  assert.match(captured, /Subject: Your Sophomores sign-in code/);
  assert.match(captured, /A1B2C3/);
  assert.doesNotMatch(captured, /synthetic-secret|X-Mailer:/);
  assert.deepEqual(p.state.messages, []);
});

test("connection-stage failures are rejected and the underlying socket is closed", async () => {
  for (const stage of ["connect", "login", "send", "event"]) {
    let errorListener: (error: Error) => void = () => {};
    let closed = 0;
    const error = new Error("private SMTP transcript");
    const connection = {
      once: (_event: string, listener: (error: Error) => void) => { errorListener = listener; return connection; },
      connect: (done: (error?: Error) => void) => {
        if (stage === "event") queueMicrotask(() => errorListener(error));
        else done(stage === "connect" ? error : undefined);
      },
      login: (_auth: unknown, done: (error: Error | null) => void) => done(stage === "login" ? error : null),
      send: (_envelope: unknown, _raw: Buffer, done: (error: Error | null, info?: unknown) => void) => done(stage === "send" ? error : null, { accepted: [email], rejected: [] }),
      close: () => { closed++; }
    };
    const sender = createSmtpConnectionTransport(memberSmtpSettings(config), () => connection as never);
    await assert.rejects(createMemberMailer(config, origin, { transportFactory: () => sender })({ type: "email-otp", email, otp: "A1B2C3" }), /Member email delivery is unavailable/);
    assert.equal(closed, 1);
  }
  const connection = { close: () => {} };
  const sender = createSmtpConnectionTransport(memberSmtpSettings(config), () => connection as never);
  sender.close();
  await assert.rejects(sender.sendMail(fake().state.messages[0]), /Member email delivery is unavailable/);
});
