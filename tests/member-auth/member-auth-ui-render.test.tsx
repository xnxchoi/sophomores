import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberAccountView } from "../../components/Authentication/member-auth/account-view";
import { MemberAccountStudy } from "../../components/Authentication/member-auth/account-study";
import { MemberPhoneStep } from "../../components/Authentication/member-auth/phone-step";
import { emptyMemberSnapshot } from "../../components/Authentication/member-auth/_shared/session";
import type { MemberStatus } from "../../lib/member-auth/client";

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
  mode: "email" | "phone" = "email"
) {
  return renderToStaticMarkup(
    <MemberAccountView
      snapshot={{ ...emptyMemberSnapshot, status, ...change }}
      identifierMode={mode}
      email=""
      phone=""
      otp=""
      {...actions}
      phoneStep={<p>Existing phone verification view</p>}
    />
  );
}

test("shared email entry keeps passkey and Google as quiet passwordless alternatives", () => {
  const html = render(anonymous);
  assert.match(html, /data-account-phase="entry"/);
  assert.match(html, /Email address/);
  assert.match(html, /type="email"/);
  assert.match(html, /Continue<\/button>/);
  assert.match(html, /Send a magic link/);
  assert.match(html, /<button[^>]*class="[^"]*min-h-11 px-3"[^>]*>Sign in with a passkey<\/button>/);
  assert.doesNotMatch(html, /Preferred for returning members/);
  assert.doesNotMatch(html, /type="password"|MMS can sign you in/);
});

test("unconfigured providers are disabled with truthful setup guidance", () => {
  const html = render({
    ...anonymous,
    capabilities: {
      emailOtp: false,
      magicLink: false,
      google: false,
      passkey: true
    }
  });
  assert.match(html, /Google and outbound email need operator setup/);
  assert.match(
    html,
    /<button[^>]*disabled=""[^>]*>Continue with Google<\/button>/
  );
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
    authenticated: true,
    emailVerified: true
  });
  assert.match(html, /Finish setting up your account/);
  assert.match(html, /Continue registration/);
  assert.doesNotMatch(
    html,
    /Existing phone verification view|Verify your phone to finish/
  );
  assert.doesNotMatch(html, /Add a passkey|Account ready/);
  assert.doesNotMatch(html, /Local account study|Refresh account status/);
});

test("an active member may optionally add a passkey without identity or production claims", () => {
  const html = render({
    ...anonymous,
    authenticated: true,
    emailVerified: true,
    phoneBound: true,
    member: true
  });
  assert.match(html, /Account ready/);
  assert.match(html, /Add a passkey/);
  assert.match(html, /optional/);
  assert.match(html, /Sign out/);
  assert.match(html, /Local account study/);
  assert.match(html, /not identity or age verification/);
  assert.doesNotMatch(html, /Existing phone verification view/);
});

test("phone is only an identifier; normal credentials remain required", () => {
  const html = render(anonymous, {}, "phone");
  assert.match(html, /type="tel"/);
  assert.match(html, /Your passkey or email still authenticates you/);
  assert.doesNotMatch(html, /Send phone OTP|Send an MMS to log in/);
  const chosen = render(anonymous, { phoneIdentified: true }, "phone");
  assert.match(chosen, /Phone selected/);
  assert.match(chosen, /type="email"/);
  assert.match(chosen, /Change identifier/);
  assert.match(chosen, /data-account-phase="entry"/);
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
  const html = renderToStaticMarkup(<MemberAccountStudy />);
  assert.match(html, /Open account options/);
  assert.doesNotMatch(html, /Account ready|Finish registration|href="sms:/);
  const phone = renderToStaticMarkup(
    <MemberPhoneStep busy={false} onBind={() => {}} />
  );
  assert.match(phone, /type="tel"/);
  assert.doesNotMatch(phone, /<button\b[^>]*>Finish registration|href="sms:/);
});
