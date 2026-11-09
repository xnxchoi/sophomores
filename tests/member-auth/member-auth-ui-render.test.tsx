import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberAccountView, type MemberAccountViewProps } from "@/components/Authentication/member-auth/account-view";
import { MemberAuthProviders } from "./fixtures/providers";
import { MemberAccountStudy } from "@/components/Authentication/member-auth/account-study";
import { MemberPhoneStep } from "@/components/Authentication/member-auth/phone-step";
import { emptyMemberSnapshot } from "@/components/Authentication/member-auth/_shared/session";
import type { MemberStatus } from "@/lib/member-auth/client";

const capabilities = {
  emailOtp: true,
  magicLink: true,
  google: true,
  passkey: true
};
const anonymous: MemberStatus = {
  authenticated: false, phoneBindingAuth: "anonymous" as const,
  emailVerified: false,
  phoneBound: false,
  member: false,
  capabilities
};
const actions = {
  onContinueRegistration: () => {},
  onPasskey: () => {},
  onGoogle: () => {},
  onCode: () => {},
  onLink: () => {},
  onVerify: () => {},
  onEditEmail: () => {},
  onIdentifier: () => {},
  onClearIdentifier: () => {},
  onAddPasskey: () => {},
  onSignOut: () => {},
  onRefresh: () => {},
  onMode: () => {},
  onEmail: () => {},
  onPhone: () => {},
  onOtp: () => {}
};
function render(
  status: MemberStatus | null,
  change = {},
  mode: "email" | "phone" = "email",
  flow: "login" | "signup" = "login",
  viewProps: Partial<MemberAccountViewProps> = {}
) {
  return renderToStaticMarkup(
    <MemberAccountView
      snapshot={{ ...emptyMemberSnapshot, status, ...change }}
      identifierMode={mode}
      flow={flow}
      email=""
      phone=""
      otp=""
      {...actions}
      phoneStep={<p>Existing phone verification view</p>}
      {...viewProps}
    />
  );
}

test("shared email and its alternative actions inherit the same customer typeface", () => {
  const html = render(anonymous);
  const view = new JSDOM(html);
  try {
    const panel = view.window.document.querySelector("[data-member-account-flow]");
    assert.ok(panel?.classList.contains("[font-family:system-ui]"), "the whole customer panel owns typography, not only the nested email fields");
    assert.match(html, /Sign in with a passkey/);
  } finally { view.window.close(); }
});

test("shared email entry keeps passkey and Google as quiet passwordless alternatives", () => {
  const html = render(anonymous);
  assert.match(html, /data-account-phase="entry"/);
  assert.match(html, /Email address/);
  assert.match(html, /type="email"/);
  assert.match(html, /Continue<\/button>/);
  assert.doesNotMatch(html, /More options/);
  assert.match(html, /Sign in with a passkey/);
  assert.doesNotMatch(html, /Preferred for returning members/);
  assert.doesNotMatch(html, /type="password"|MMS can sign you in/);
});

test("unconfigured providers stay absent with contextual retry", () => {
  const html = render({
    ...anonymous,
    capabilities: {
      emailOtp: false,
      magicLink: false,
      google: false,
      passkey: true
    }
  });
  assert.match(html, /Email sign-in is unavailable/);
  assert.doesNotMatch(html, /Continue with Google/);
  assert.doesNotMatch(html, /Account ready|Email and phone confirmed/);
  const missing = render(null, {
    error: "Member authentication setup is unavailable."
  });
  assert.match(missing, /role="alert"/);
  assert.match(missing, /setup is unavailable/);
});

test("a pending authenticated login offers explicit setup without mounting phone verification", () => {
  const html = render({
    ...anonymous,
    authenticated: true, phoneBindingAuth: "ready" as const,
    emailVerified: true
  });
  assert.match(html, /Finish setting up your account/);
  assert.match(html, /Continue registration/);
  assert.match(html, /<button[^>]*class="[^"]*\[font-family:system-ui\][^"]*"[^>]*>Switch account<\/button>/);
  assert.match(html, /Verify your phone to finish\./);
  assert.doesNotMatch(html, /Existing phone verification view/);
  assert.doesNotMatch(html, /Add a passkey|Account ready/);
  assert.doesNotMatch(html, /Local account study|Refresh account status/);
});

test("an active member may optionally add a passkey without identity or production claims", () => {
  const html = render({
    ...anonymous,
    authenticated: true, phoneBindingAuth: "ready" as const,
    emailVerified: true,
    phoneBound: true,
    member: true
  });
  assert.match(html, /Account ready/);
  assert.match(html, /Add a passkey/);
  assert.match(html, /optional/);
  assert.match(html, /Sign out/);
  assert.doesNotMatch(html, /Local account study|identity or age verification/);
  assert.doesNotMatch(html, /Existing phone verification view/);
});

test("normal login never exposes phone identification, even with an old identifier selection", () => {
  for (const selected of [false, true]) {
    const html = render(anonymous, { phoneIdentified: selected }, "phone");
    assert.match(html, /type="email"/);
    assert.doesNotMatch(html, /type="tel"|Phone selected|Use phone|Use this phone|Change identifier/);
  }
});

test("code prompts and action feedback remain accessible, errors never render as success", () => {
  const html = render(anonymous, {
    codeRequested: true,
    busy: true,
    error: "Passkey was not added."
  });
  assert.match(html, /autoComplete="one-time-code"/);
  assert.match(html, /Change email/);
  assert.match(html, /Send new code/);
  assert.match(html, /inputMode="text"/);
  assert.match(html, /maxLength="6"/);
  assert.match(html, /pattern="\^\[a-zA-Z0-9\]\+\$"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, />Passkey added/);
});

test("account and phone study server rendering creates no session or composer automatically", () => {
  const html = renderToStaticMarkup(<MemberAuthProviders><MemberAccountStudy /></MemberAuthProviders>);
  assert.match(html, /Open account options/);
  assert.doesNotMatch(html, /Account ready|Finish registration|href="sms:/);
  const phone = renderToStaticMarkup(
    <MemberPhoneStep busy={false} onPrepare={async () => true} onBind={() => {}} />
  );
  assert.match(phone, /type="tel"/);
  assert.doesNotMatch(phone, /<button\b[^>]*>Finish registration|href="sms:/);
});


test("customer entry has one full-width primary action and no routine status clutter", () => {
  const html = render(anonymous);
  assert.match(html, /<button[^>]*class="[^"]*w-full[^"]*"[^>]*data-phase-action="submit"/);
  assert.doesNotMatch(html, /min-h-14|Local account study|operator setup|Refresh account status/);
  assert.doesNotMatch(html, /More options/);
  assert.doesNotMatch(html, /Send a magic link|Use phone to identify account/);
  assert.doesNotMatch(html, /<section[^>]*aria-busy/);
});

test("signup does not promote returning-member passkeys or account lookup", () => {
  const html = render(anonymous, {}, "email", "signup");
  assert.doesNotMatch(html, /Sign in with a passkey|Use phone to identify account/);
});

test("unsupported providers disappear while unavailable email offers contextual retry", () => {
  const html = render({ ...anonymous, capabilities: {
    google: false, emailOtp: false, magicLink: false, passkey: true
  }});
  assert.doesNotMatch(html, /Continue with Google|Send a magic link|operator setup/);
  assert.match(html, /Email sign-in is unavailable/);
  assert.match(html, /Refresh account status/);
  const signup = render({ ...anonymous, capabilities: {
    google: false, emailOtp: false, magicLink: false, passkey: false
  }}, {}, "email", "signup");
  assert.doesNotMatch(signup, /More options|Try another option/);
  assert.match(signup, /Try again shortly/);
});


test("progress belongs to the initiating method, never the unrelated email action", () => {
  const html = render(anonymous, { busy: true, pendingAction: "passkey" });
  assert.match(html, /<button[^>]*data-phase-action="submit"[^>]*aria-busy="false"/);
  assert.match(html, /Continue<\/button>/);
  assert.doesNotMatch(html, /<section[^>]*aria-busy/);
  assert.match(html, /<button[^>]*aria-busy="true"[^>]*>/);
  const loading = render(null);
  assert.doesNotMatch(loading, /Refresh account status/);
});


test("email initialization owns one progress announcement regardless of old identifier mode", () => {
  const loading = { busy: true, pendingAction: "other" };
  const email = render(null, loading);
  assert.equal((email.match(/role="status"/g) ?? []).length, 1);
  assert.match(email, /Checking sign-in options/);
  const phone = render(null, loading, "phone");
  assert.match(phone, /Checking sign-in options/);
  assert.equal((phone.match(/role="status"/g) ?? []).length, 1);
});

test("OTP correction does not advertise status refresh; genuine outages remain recoverable", () => {
  for (const failure of ["invalid-code", "expired-code", "attempts-exhausted", "rate-limited"]) {
    const html = render(anonymous, { codeRequested: true, failure, error: "Safe OTP failure" });
    assert.doesNotMatch(html, /Refresh account status/);
    assert.match(html, /Send new code|Change email/);
  }
  for (const failure of ["network", "timeout", "unavailable"]) {
    const html = render(anonymous, { codeRequested: true, failure, error: "Safe outage" });
    assert.match(html, /Refresh account status/);
  }
});

test("OTP recipient has its own line rather than sharing a wrapping lead-in", () => {
  const html = render(anonymous, { codeRequested: true });
  assert.match(html, /<span class="block [^"]*break-all/);
});

test("completed customer account uses one monochrome confirmation and the shared typeface", () => {
  const member = { ...anonymous, authenticated: true, phoneBindingAuth: "ready" as const, emailVerified: true, phoneBound: true, member: true };
  const html = render(member, { notice: "Email and phone binding confirmed for this local account." });
  assert.match(html, /<section[^>]*class="[^"]*\[font-family:system-ui\]/);
  assert.match(html, /data-account-confirmed=""/);
  assert.match(html, /Account ready/);
  assert.equal((html.match(/Email and phone confirmed\./g) ?? []).length, 1);
  assert.doesNotMatch(html, /Email and phone binding confirmed/);
  assert.match(html, /Passkeys are optional/);
  assert.match(html, /local passkey won’t transfer/);
  for (const feedback of [
    { notice: "Passkey added to this local account." },
    { notice: "Passkey request cancelled.", failure: "passkey-cancelled" },
    { error: "Passkey was not added.", failure: "unavailable" }
  ]) {
    const result = render(member, feedback);
    assert.ok(result.includes(feedback.notice ?? feedback.error!));
    assert.match(result, feedback.error ? /role="alert"/ : /role="status"/);
  }
});


test("entry has one compact peer row with one Google action and login-only passkey", () => {
  const doc = new JSDOM(render(anonymous)).window.document;
  const row = doc.querySelector("[data-account-entry-alternatives]");
  assert.ok(row);
  assert.deepEqual([...row.querySelectorAll("button")].map(button => button.textContent), ["Passkey", "Google"]);
  assert.equal(doc.querySelectorAll('[aria-label="Continue with Google"]').length, 1);
  assert.equal(doc.querySelectorAll('[data-phase-action="google"]').length, 0, "shared phase does not duplicate Google");
  assert.equal(doc.querySelector('[aria-label="Sign in with a passkey"]')?.getAttribute("type"), "button");
  assert.doesNotMatch(render(anonymous, {}, "email", "signup"), />Passkey</);
  assert.doesNotMatch(render({ ...anonymous, capabilities: { ...capabilities, google: false, passkey: false } }), /data-account-entry-alternatives/);
});

test("sign-in link is a code-stage fallback and honors capability, busy, recipient and cooldown", () => {
  assert.doesNotMatch(render(anonymous), /Email a sign-in link instead/);
  const ready = { email: "member@example.com", resendRemaining: 0 };
  for (const [change, props, disabled] of [
    [{ codeRequested: true }, ready, false],
    [{ codeRequested: true, busy: true, pendingAction: "magic-link" }, ready, true],
    [{ codeRequested: true }, { ...ready, resendRemaining: 12 }, true],
    [{ codeRequested: true }, { ...ready, email: " " }, true]
  ] as const) {
    const doc = new JSDOM(render(anonymous, change, "email", "login", props)).window.document;
    const link = [...doc.querySelectorAll("button")].find(button => button.textContent === "Email a sign-in link instead");
    assert.ok(link);
    assert.equal(link.disabled, disabled);
    assert.equal(link.getAttribute("aria-busy"), "pendingAction" in change && change.pendingAction === "magic-link" ? "true" : "false");
    assert.match(doc.body.textContent!, /Change email|Send new code/);
  }
  assert.doesNotMatch(render({ ...anonymous, capabilities: { ...capabilities, magicLink: false } }, { codeRequested: true }, "email", "login", ready), /Email a sign-in link instead/);
});

test("recovery entry is explicit and available only to login with a supplied hook", () => {
  assert.doesNotMatch(render(anonymous), /Can’t sign in/);
  const onRecover = () => {};
  const html = render(anonymous, {}, "email", "login", { onRecover });
  assert.match(html, /Can’t sign in/);
  assert.doesNotMatch(render(anonymous, {}, "email", "signup", { onRecover }), /Can’t sign in/);
  assert.doesNotMatch(render({ ...anonymous, authenticated: true, phoneBindingAuth: "ready" as const, emailVerified: true }, {}, "email", "login", { onRecover }), /Can’t sign in/);
});
