import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { VerificationProvider } from "../../components/Authentication/phone-verification/phone-verification";
import { TrialVerificationView } from "../../components/Authentication/phone-verification/phone-verification-trial";
import { MemberAccountView } from "../../components/Authentication/member-auth/account-view";
import { MemberPhoneStep } from "../../components/Authentication/member-auth/phone-step";
import { VerificationStatus } from "../../components/Authentication/phone-verification/verification-status";
import { emptyMemberSnapshot } from "../../components/Authentication/member-auth/_shared/session";
import type { TrialSnapshot } from "../../lib/phone-verification/client-contracts";
import type { MessagingPlatform } from "../../lib/phone-verification/model";

const challenge = {
  id: "registration-fixture",
  recipient: "verify@sophomores.co",
  body: "SPHMRS REGISTRATION_FIXTURE",
  expiresAt: "2041-01-01T00:05:00.000Z",
  mode: "trial" as const
};
const actions = { onStart() {}, onRefresh() {}, onReset() {}, onExpire() {} };

function render(
  state: NonNullable<TrialSnapshot["status"]>["state"] | null = "pending",
  locale: "en" | "ko" = "en",
  platform: MessagingPlatform = "ios",
  error: TrialSnapshot["error"] = null,
  busy = false
) {
  const snapshot: TrialSnapshot = {
    challenge: state ? challenge : null,
    status: state
      ? {
          id: challenge.id,
          expiresAt: challenge.expiresAt,
          state,
          mode: "trial"
        }
      : null,
    busy,
    error
  };
  const html = renderToStaticMarkup(
    <VerificationProvider initialLocale={locale}>
      <TrialVerificationView
        presentation="registration"
        snapshot={snapshot}
        platform={platform}
        {...actions}
      />
    </VerificationProvider>
  );
  return new JSDOM(html).window.document;
}

function visibleText(document: Document) {
  const walker = document.createTreeWalker(document.body, 4);
  const text: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest('[aria-hidden="true"], [inert]'))
      text.push(node.textContent ?? "");
  }
  return text.join(" ");
}

test("registration pending replaces trial chrome and copy cards with one explicit compose action", () => {
  const document = render();
  const text = visibleText(document);
  assert.match(text, /Send verification message/);
  assert.doesNotMatch(
    text,
    /Local verification trial|English|한국어|Waiting for a message|Copy the recipient|open Messages manually|compatibility candidate/
  );
  assert.doesNotMatch(
    text,
    /verify@sophomores\.co|SPHMRS REGISTRATION_FIXTURE|Copy/
  );
  assert.equal(document.querySelectorAll('a[href^="sms:"]').length, 1);
  const compose = document.querySelector('a[href^="sms:"]');
  assert.equal(
    [...(compose?.childNodes ?? [])]
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join("")
      .trim(),
    "Open Messages"
  );
  assert.equal(
    compose?.getAttribute("href"),
    "sms:verify@sophomores.co&body=SPHMRS%20REGISTRATION_FIXTURE"
  );
  assert.equal(compose?.closest('[aria-hidden="true"], [inert]'), null);
  assert.equal(document.querySelector("[data-verification-boundary]"), null);
});

test("registration does not render recovery or privacy disclosures before an explicit composer attempt", () => {
  const document = render();
  assert.equal(document.querySelector("[data-verification-details]"), null);
  assert.doesNotMatch(
    document.body.textContent ?? "",
    /Messages not opening\?|Privacy & verification details/
  );
  assert.doesNotMatch(
    visibleText(document),
    /no account or registration|Raw phone numbers|Zoho mailbox/
  );
});

test("pending registration locks the native composer when its receiver is unavailable", () => {
  const document = render("pending", "en", "ios", "receiver");
  assert.equal(document.querySelector('a[href^="sms:"]'), null);
  assert.equal(document.querySelector("[data-verification-details]"), null);
  assert.match(
    visibleText(document),
    /receiver unavailable|receiver is unavailable/i
  );
});

test("registration offers one best-effort desktop Messages action instead of a copy-only dead end", () => {
  const document = render("pending", "en", "manual");
  const links = document.querySelectorAll('a[href^="sms:"]');
  assert.equal(links.length, 1);
  assert.equal(
    links[0].getAttribute("href"),
    "sms:verify@sophomores.co?body=SPHMRS%20REGISTRATION_FIXTURE"
  );
  assert.doesNotMatch(
    visibleText(document),
    /automatically sent|message sent|Phone verified/
  );
});

test("registration timer announces verification expiry without preview or trial language", () => {
  const timer = render().querySelector('[role="timer"]');
  assert.ok(timer);
  assert.match(
    timer.getAttribute("aria-label") ?? "",
    /^Verification expires in \d+ seconds$/
  );
  assert.doesNotMatch(timer.getAttribute("aria-label") ?? "", /preview|trial/i);
  const koreanTimer = render("pending", "ko").querySelector('[role="timer"]');
  assert.match(
    koreanTimer?.getAttribute("aria-label") ?? "",
    /^인증 만료까지 \d+초$/
  );
  assert.doesNotMatch(
    koreanTimer?.getAttribute("aria-label") ?? "",
    /테스트|미리 보기/
  );
});

test("registration shows a stable waiting indicator beside a compact countdown", () => {
  const document = render();
  const row = document.querySelector("[data-verification-status-row]");
  assert.ok(row);
  assert.match(
    row.querySelector('[role="status"]')?.textContent ?? "",
    /^Waiting for message$/
  );
  assert.ok(row.querySelector('[role="timer"]'));
  assert.equal(document.querySelectorAll('[role="timer"]').length, 1);
  assert.equal(
    row
      .querySelector("[data-status-indicator]")
      ?.getAttribute("data-status-indicator"),
    "waiting"
  );
  assert.doesNotMatch(
    row.querySelector("[data-status-indicator]")?.className ?? "",
    /animate-/
  );
});

test("manual checking belongs to the initiating control rather than a second progress row", () => {
  const document = render("pending", "en", "ios", null, true);
  const row = document.querySelector("[data-verification-status-row]");
  assert.ok(row);
  assert.equal(row.querySelector('[role="status"]')?.textContent, "Waiting for message");
  assert.equal(row.querySelector('[data-status-indicator]')?.getAttribute("data-status-indicator"), "waiting");
  const checking = document.querySelector('button[aria-busy="true"]');
  assert.ok(checking);
  assert.ok(checking?.querySelector('svg[aria-hidden="true"]'));
  assert.match(checking.textContent ?? "", /Checking/);
  const announcement = [...document.querySelectorAll('[role="status"]')].find(node => node.textContent === "Checking…");
  assert.ok(announcement);
  assert.equal(announcement.closest('[aria-busy="true"]'), null);
  assert.doesNotMatch(visibleText(document), /failed|not verified/i);
});

test("status check errors say the check is unavailable rather than declaring failed verification", () => {
  const document = render("pending", "en", "ios", "status");
  const status = document.querySelector(
    '[data-verification-status-row] [role="status"]'
  );
  assert.ok(status);
  assert.equal(status.textContent, "Couldn't check status");
  assert.doesNotMatch(
    status.textContent ?? "",
    /verification failed|message rejected/i
  );
});

test("completed manual checks distinguish pending, review and verified outcomes without inferring inbox absence", () => {
  for (const [state, label] of [
    ["pending", "Still waiting"],
    ["review", "Needs review"],
    ["verified", "Message verified"]
  ] as const) {
    const html = renderToStaticMarkup(
      <VerificationProvider initialLocale="en">
        <VerificationStatus
          state={state}
          busy={false}
          error={null}
          checked
          expiresAt={Date.parse(challenge.expiresAt)}
          onExpire={() => {}}
        />
      </VerificationProvider>
    );
    const document = new JSDOM(html).window.document;
    assert.ok(
      document.querySelector('[role="status"]')?.textContent?.endsWith(label)
    );
    assert.equal(
      Boolean(document.querySelector('[role="timer"]')),
      state !== "verified"
    );
    assert.doesNotMatch(
      visibleText(document),
      /verification failed|account ready/i
    );
  }
});

test("member phone integration opts into the uncluttered registration presentation", () => {
  const html = renderToStaticMarkup(
    <MemberPhoneStep busy={false} onBind={() => {}} />
  );
  const document = new JSDOM(html).window.document;
  assert.ok(document.querySelector("[data-member-phone-step]")?.classList.contains("[font-family:system-ui]"));
  assert.doesNotMatch(
    visibleText(document),
    /Local verification trial|English|한국어/
  );
  assert.ok(document.querySelector('input[type="tel"]'));
});

test("registration terminal and review states never offer composition or imply membership", () => {
  for (const state of [
    "review",
    "verified",
    "consumed",
    "cancelled",
    "expired"
  ] as const) {
    const document = render(state);
    assert.equal(document.querySelector('a[href^="sms:"]'), null);
    assert.doesNotMatch(
      visibleText(document),
      /Account ready|membership activated|Send the trial message/
    );
    if (state === "review") assert.match(visibleText(document), /Not verified/);
    if (state === "verified")
      assert.match(visibleText(document), /Phone verified/);
    if (state === "expired")
      assert.match(visibleText(document), /Verification expired/);
  }
});

test("registration request failures remain accessible and never claim phone verification", () => {
  for (const error of ["create", "status", "cancel"] as const) {
    const document = render(
      error === "create" ? null : "pending",
      "en",
      "ios",
      error
    );
    const alert = document.querySelector('[role="alert"]');
    assert.ok(alert);
    assert.doesNotMatch(
      alert.textContent ?? "",
      /trial|Account ready|registered successfully/
    );
    if (error === "status")
      assert.match(alert.textContent ?? "", /Automatic checks are paused/);
  }
});

test("registration phone entry and Korean pending remain free of trial and language chrome", () => {
  assert.doesNotMatch(
    visibleText(render(null)),
    /Local verification trial|English|한국어/
  );
  const korean = render("pending", "ko");
  assert.equal(korean.querySelectorAll('a[href^="sms:"]').length, 1);
  assert.doesNotMatch(
    visibleText(korean),
    /로컬 인증 테스트|English|한국어|기다리고/
  );
});

test("member phone wrapper does not prepend duplicate email-confirmed instructions", () => {
  const html = renderToStaticMarkup(
    <MemberAccountView
      snapshot={{
        ...emptyMemberSnapshot,
        status: {
          authenticated: true,
          emailVerified: true,
          phoneBound: false,
          member: false,
          capabilities: {
            google: true,
            passkey: true,
            emailOtp: true,
            magicLink: true
          }
        }
      }}
      identifierMode="email"
      email=""
      phone=""
      otp=""
      flow="signup"
      onContinueRegistration={() => {}}
      phoneStep={<p>Phone step fixture</p>}
      onPasskey={() => {}}
      onGoogle={() => {}}
      onCode={() => {}}
      onLink={() => {}}
      onVerify={() => {}}
      onEditEmail={() => {}}
      onIdentifier={() => {}}
      onClearIdentifier={() => {}}
      onAddPasskey={() => {}}
      onSignOut={() => {}}
      onRefresh={() => {}}
      onMode={() => {}}
      onEmail={() => {}}
      onPhone={() => {}}
      onOtp={() => {}}
    />
  );
  assert.doesNotMatch(html, /Email confirmed\. Verify your phone to finish\./);
  assert.match(html, /Phone step fixture/);
  const document = new JSDOM(html).window.document;
  const switchAccount = [...document.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Switch account"
  );
  assert.ok(switchAccount);
  assert.match(switchAccount.className, /min-h-11/);
  assert.doesNotMatch(html, /Sign out and use another email/);
});


test("registration entry uses the same compact heading, field and centered action rhythm as email", () => {
  const document = render(null);
  assert.ok(document.querySelector("section")?.classList.contains("[font-family:system-ui]"));
  const heading = document.querySelector("h2");
  assert.ok(heading);
  assert.ok(heading?.classList.contains("text-2xl"));
  assert.ok(heading.classList.contains("pr-14"), "leave the focused Cancel target clear");
  const group = document.querySelector('[data-slot="input-group"]');
  assert.ok(group?.classList.contains("h-13"));
  const country = document.querySelector('[aria-label="South Korea, calling code +82"]');
  assert.ok(country?.classList.contains("whitespace-nowrap"));
  assert.ok(country?.classList.contains("w-20"));
  const input = document.querySelector('input[type="tel"]');
  assert.ok(input);
  assert.ok(input?.classList.contains("!text-base"));
  assert.doesNotMatch(input.className, /sm:!text-lg|md:!text-xl/);
  const submit = document.querySelector('button[type="submit"]');
  assert.ok(submit);
  assert.ok(submit?.classList.contains("min-h-12"));
  assert.ok(submit.classList.contains("justify-center"));
  assert.doesNotMatch(submit.textContent ?? "", /↗/);
  assert.equal(document.querySelector('[data-slot="field-description"]')?.parentElement?.classList.contains("h-10"), false);
});

test("registration creation announces once outside its busy action without marking the whole form busy", () => {
  const document = render(null, "en", "ios", null, true);
  assert.equal(document.querySelector("form")?.getAttribute("aria-busy"), null);
  const submit = document.querySelector('button[type="submit"]');
  assert.equal(submit?.getAttribute("aria-busy"), "true");
  assert.ok(submit?.querySelector('svg[aria-hidden="true"]'));
  const status = document.querySelector('[role="status"]');
  assert.equal(status?.textContent, "Creating…");
  assert.equal(status?.closest('[aria-busy="true"]'), null);
});

test("verified proof has one visual result, leaving membership completion to the explicit binding step", () => {
  const document = render("verified");
  assert.ok(document.querySelector('[data-verification-mark="success"]'));
  assert.equal(document.querySelector("[data-verification-status-row]"), null);
  assert.doesNotMatch(visibleText(document), /Your carrier message passed the phone check|Message verified|Account ready/);
});

test("registration request errors retain one actionable alert outside busy controls", () => {
  for (const error of ["create", "status", "receiver", "cancel"] as const) {
    const document = render(error === "create" ? null : "pending", "en", "ios", error);
    assert.equal(document.querySelectorAll('[role="alert"]').length, 1);
    assert.equal(document.querySelector('[role="alert"]')?.closest('[aria-busy="true"]'), null);
    assert.doesNotMatch(visibleText(document), /Account ready|membership activated/);
  }
});


test("expired and unusable registration proof has an obvious full-width restart action", () => {
  for (const state of ["expired", "cancelled", "consumed"] as const) {
    const document = render(state);
    const restart = [...document.querySelectorAll("button")].find(button => button.textContent?.trim() === "Start again");
    assert.ok(restart);
    assert.ok(restart.classList.contains("min-h-12"));
    assert.ok(restart.classList.contains("w-full"));
    assert.ok(restart.classList.contains("bg-neutral-100"));
    assert.equal(restart.disabled, false);
  }
  const verified = render("verified");
  const restart = [...verified.querySelectorAll("button")].find(button => button.textContent?.trim() === "Start again");
  assert.ok(restart);
  assert.ok(!restart.classList.contains("bg-neutral-100"), "valid proof keeps Finish registration as its primary next action");
});
