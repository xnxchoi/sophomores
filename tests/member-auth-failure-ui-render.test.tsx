import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberAccountView } from "../components/member-auth/account-view";
import { emptyMemberSnapshot } from "../components/member-auth/_shared/session";
import type {
  MemberAuthFailureKind,
  MemberStatus
} from "../lib/member-auth/client";

const anonymous: MemberStatus = {
  authenticated: false,
  emailVerified: false,
  phoneBound: false,
  member: false,
  capabilities: { emailOtp: true, magicLink: true, google: true, passkey: true }
};
const noop = () => {};
function render(
  failure: MemberAuthFailureKind | null,
  codeRequested = true,
  resendRemaining = 0,
  status: MemberStatus | null = anonymous,
  codeRecovery: "expired-code" | "attempts-exhausted" | null = null,
  verificationRemaining?: number,
  identifierMode: "email" | "phone" = "email"
) {
  return renderToStaticMarkup(
    <MemberAccountView
      headingId="connected-auth"
      snapshot={{
        ...emptyMemberSnapshot,
        status,
        codeRequested,
        failure,
        codeRecovery,
        phoneIdentified: identifierMode === "phone",
        error: "Untrusted upstream message",
        notice: "Duplicate generic notice"
      }}
      resendRemaining={resendRemaining}
      verificationRemaining={verificationRemaining}
      identifierMode={identifierMode}
      email="member@example.com"
      phone=""
      otp="A1B2C3"
      onContinueRegistration={noop}
      onPasskey={noop}
      onGoogle={noop}
      onCode={noop}
      onLink={noop}
      onVerify={noop}
      onEditEmail={noop}
      onIdentifier={noop}
      onClearIdentifier={noop}
      onAddPasskey={noop}
      onSignOut={noop}
      onRefresh={noop}
      onMode={noop}
      onEmail={noop}
      onPhone={noop}
      onOtp={noop}
      phoneStep={<p>Real phone view</p>}
    />
  );
}

test("connected anonymous email uses the accepted shared phases and one tray heading", () => {
  const entry = render(null, false);
  assert.match(entry, /data-account-phase="entry"/);
  assert.match(entry, /Email address/);
  assert.equal((entry.match(/id="connected-auth"/g) ?? []).length, 1);
  const code = render(null);
  assert.match(code, /data-account-phase="email-code"/);
  assert.match(code, /autocomplete="one-time-code"/i);
  assert.match(code, /Verification code/);
  assert.doesNotMatch(code, /data-phase-completion|Real phone view/);
});

test("failed initialization is recoverable, not a permanent checking spinner", () => {
  const html = render("unavailable", false, 0, null);
  assert.match(html, /Sign-in is unavailable/);
  assert.match(html, /Refresh account status/);
  assert.doesNotMatch(html, /Checking…|Verifying code…|Sending code…/);
});

test("structured email failures replace raw duplicate feedback without claiming success", () => {
  const kinds: MemberAuthFailureKind[] = [
    "invalid-code",
    "expired-code",
    "attempts-exhausted",
    "rate-limited",
    "delivery-failed",
    "network",
    "timeout",
    "passkey-cancelled",
    "provider-denied",
    "unavailable"
  ];
  for (const failure of kinds) {
    const html = render(
      failure,
      failure !== "provider-denied" && failure !== "passkey-cancelled"
    );
    assert.doesNotMatch(
      html,
      /Untrusted upstream message|Duplicate generic notice/
    );
    assert.doesNotMatch(
      html,
      /data-phase-completion|Account ready|Email and phone confirmed/
    );
    assert.match(html, /data-account-phase=/);
    if (failure === "provider-denied" || failure === "passkey-cancelled") {
      assert.doesNotMatch(html, /role="alert"/);
      assert.match(html, /role="status"/);
    }
  }
});

test("expired and exhausted codes cannot verify and cooldown blocks resend and fresh entry", () => {
  for (const failure of ["expired-code", "attempts-exhausted"] as const) {
    assert.match(render(failure), /data-phase-action="submit"[^>]*disabled=""/);
  }
  const limited = render("rate-limited", true, 12, anonymous, null, 12);
  assert.match(limited, /data-phase-action="submit"[^>]*disabled=""/);
  assert.match(limited, /data-phase-action="retry"[^>]*disabled=""/);
  assert.match(
    render("rate-limited", false, 12),
    /data-phase-action="submit"[^>]*disabled=""/
  );
});

test("latest network feedback does not erase persistent recovery or verification cooldown", () => {
  for (const recovery of ["expired-code", "attempts-exhausted"] as const) {
    const html = render("network", true, 0, anonymous, recovery);
    assert.match(html, /data-phase-action="submit"[^>]*disabled=""/);
    assert.match(html, /<input[^>]*disabled=""/);
    assert.match(html, /connect|connection/i);
    assert.match(html, /new code/i);
  }
  const html = render("network", true, 0, anonymous, null, 12);
  assert.match(html, /data-phase-action="submit"[^>]*disabled=""/);
  assert.match(html, /<input[^>]*disabled=""/);
  assert.match(html, /connect|connection/i);
  assert.match(html, /Try again in/);
});

test("phone-selected credentials use the same guarded OTP view instead of a legacy code form", () => {
  const html = render("network", true, 0, anonymous, "expired-code", undefined, "phone");
  assert.match(html, /data-account-phase="email-code"/);
  assert.match(html, /data-phase-action="submit"[^>]*disabled=""/);
  assert.match(html, /new code/i);
  assert.doesNotMatch(html, /id="member-email-code"/);
});
