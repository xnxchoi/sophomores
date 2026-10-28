import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VerificationProvider } from "../../components/phone-verification/phone-verification";
import { PhoneVerificationTrialModal, TrialVerificationFlow, TrialVerificationView } from "../../components/phone-verification/phone-verification-trial";

const challenge = { id: "challenge-1", recipient: "verify@sophomores.co", body: "SPHMRS ABCDEF123456", expiresAt: "2026-10-23T12:00:00.000Z", mode: "trial" as const };
const actions = { onStart: () => {}, onRefresh: () => {}, onReset: () => {}, onExpire: () => {} };

test("trial session server rendering makes no browser request and closed modal contains no active session", () => {
  const flow = renderToStaticMarkup(<VerificationProvider initialLocale="en"><TrialVerificationFlow headingId="server-trial-heading" /></VerificationProvider>);
  assert.match(flow, /id="server-trial-heading"/);
  assert.match(flow, /type="tel"/);
  assert.doesNotMatch(flow, /href="sms:|SPHMRS ABCDEF123456/);
  const closed = renderToStaticMarkup(<PhoneVerificationTrialModal open={false} onOpenChange={() => {}} locale="en" />);
  assert.doesNotMatch(closed, /type="tel"|role="dialog"|verify@sophomores.co/);
});

test("server-backed form says local trial, keyed phone processing and no actual registration", () => {
  const html = renderToStaticMarkup(<VerificationProvider initialLocale="en"><TrialVerificationView snapshot={{ challenge: null, status: null, busy: false, error: null }} {...actions} /></VerificationProvider>);
  assert.match(html, /Local verification trial/);
  assert.match(html, /keyed phone digests/);
  assert.match(html, /no account or registration/);
  assert.match(html, /type="tel"/);
  assert.doesNotMatch(html, /Screen tests|PREVIEW|href="(?:sms|mailto):/);
});

test("review and verified are distinct, truthful local-only states without preview controls", () => {
  for (const state of ["pending", "review", "verified", "consumed", "expired", "cancelled"] as const) {
    const html = renderToStaticMarkup(<VerificationProvider initialLocale="en"><TrialVerificationView snapshot={{ challenge, status: { id: challenge.id, state, expiresAt: challenge.expiresAt, mode: "trial" }, busy: false, error: null }} {...actions} platform="manual" /></VerificationProvider>);
    assert.match(html, /Local verification trial/);
    assert.doesNotMatch(html, /Screen tests|href="(?:sms|mailto):/);
    if (state === "review") assert.match(html, /Not verified/);
    if (state === "verified") assert.match(html, /Local verification passed/);
    if (state === "consumed") assert.match(html, /already been used/);
    if (state === "pending") { assert.match(html, /verify@sophomores.co/); assert.match(html, /MMS/); }
  }
});

test("local verification result describes policy success without promising identity or registration", () => {
  for (const locale of ["en", "ko"] as const) {
    const html = renderToStaticMarkup(<VerificationProvider initialLocale={locale}><TrialVerificationView snapshot={{ challenge, status: { id: challenge.id, state: "verified", expiresAt: challenge.expiresAt, mode: "trial" }, busy: false, error: null }} {...actions} /></VerificationProvider>);
    assert.doesNotMatch(html, /Synthetic|synthetic|가상|Live carrier verification is disabled|실제 통신사 인증은 비활성/);
    if (locale === "en") {
      assert.match(html, /Local verification passed/);
      assert.match(html, /The local verification policy passed\./);
      assert.match(html, /no account or registration/);
      assert.match(html, /not identity or age verification/);
      assert.match(html, /When enabled, the SKT pilot checks authenticated carrier messages\./);
    } else {
      assert.match(html, /로컬 인증 통과/);
      assert.match(html, /로컬 인증 정책의 검사를 통과했어요/);
      assert.match(html, /계정이나 등록 권한을 부여하지 않/);
      assert.match(html, /신원이나 나이를 확인하는 인증이 아니/);
      assert.match(html, /SKT 파일럿을 활성화하면 인증된 통신사 메시지를 확인해요/);
    }
  }
});

test("local phone input permits an own-number carrier trial without describing it as synthetic-only", () => {
  for (const locale of ["en", "ko"] as const) {
    const html = renderToStaticMarkup(<VerificationProvider initialLocale={locale}><TrialVerificationView snapshot={{ challenge: null, status: null, busy: false, error: null }} {...actions} /></VerificationProvider>);
    assert.doesNotMatch(html, /synthetic testing|가상 테스트/);
    if (locale === "en") assert.match(html, /Use only your own phone number for this local test/);
    else assert.match(html, /이 로컬 테스트에는 본인의 휴대폰 번호만 사용해 주세요/);
  }
});

test("only active mobile trials offer a candidate composer link with a physical-test warning", () => {
  const html = renderToStaticMarkup(<VerificationProvider initialLocale="en"><TrialVerificationView snapshot={{ challenge, status: { id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" }, busy: false, error: null }} {...actions} platform="ios" /></VerificationProvider>);
  assert.match(html, /href="sms:verify@sophomores.co&amp;body=/);
  assert.match(html, /not guaranteed/);
  assert.doesNotMatch(html, /window\.location|autoFocus/);
});

test("both languages have trial-bound errors and accessible status", () => {
  for (const locale of ["en", "ko"] as const) {
    const html = renderToStaticMarkup(<VerificationProvider initialLocale={locale}><TrialVerificationView snapshot={{ challenge: null, status: null, busy: false, error: "create" }} {...actions} /></VerificationProvider>);
    assert.match(html, /role="alert"/);
    assert.doesNotMatch(html, /VerificationTrial\./);
    if (locale === "en") assert.match(html, /could not create/);
    else assert.match(html, /만들지 못했어요/);
  }
});

test("creation locks the phone field and submit control while preserving local privacy copy", () => {
  const html = renderToStaticMarkup(<VerificationProvider initialLocale="en"><TrialVerificationView snapshot={{ challenge: null, status: null, busy: true, error: null }} {...actions} /></VerificationProvider>);
  assert.match(html, /<input[^>]*disabled=""/);
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""/);
  assert.match(html, /Creating/);
});

test("pending trial offers exact-copy controls and truthful progress without legacy styling", () => {
  const html = renderToStaticMarkup(<VerificationProvider initialLocale="en"><TrialVerificationView snapshot={{ challenge, status: { id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" }, busy: true, error: null }} {...actions} /></VerificationProvider>);
  assert.match(html, /Copy recipient/);
  assert.match(html, /Copy code/);
  assert.match(html, /SPHMRS ABCDEF123456/);
  assert.match(html, /role="status"/);
  assert.match(html, /Waiting for a message/);
  assert.match(html, /Checking…/);
  assert.match(html, /<button[^>]*disabled=""/);
  assert.doesNotMatch(html, /class="[^"]*\bpv-/);
  assert.doesNotMatch(html, /aria-valuenow|progressbar/);
});

test("challenge values remain selectable and copy actions are distinguished in both languages", () => {
  for (const locale of ["en", "ko"] as const) {
    const html = renderToStaticMarkup(<VerificationProvider initialLocale={locale}><TrialVerificationView snapshot={{ challenge, status: { id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" }, busy: false, error: null }} {...actions} platform="manual" /></VerificationProvider>);
    assert.match(html, /<code[^>]*class="[^"]*select-all[^"]*"[^>]*>verify@sophomores\.co<\/code>/);
    assert.match(html, /<code[^>]*class="[^"]*select-all[^"]*"[^>]*>SPHMRS ABCDEF123456<\/code>/);
    assert.match(html, locale === "en" ? /aria-label="Copy recipient"/ : /aria-label="받는 사람 복사"/);
    assert.match(html, locale === "en" ? /aria-label="Copy code"/ : /aria-label="인증 코드 복사"/);
  }
});

test("trial keeps the registration boundary visible and privacy details available", () => {
  const html = renderToStaticMarkup(<VerificationProvider initialLocale="en"><TrialVerificationView snapshot={{ challenge: null, status: null, busy: false, error: null }} {...actions} /></VerificationProvider>);
  assert.match(html, /data-verification-details=""/);
  assert.match(html, /<button[^>]*aria-expanded="false"[^>]*>Privacy &amp; test details/);
  assert.match(html, /inert=""[^>]*aria-hidden="true"[\s\S]*keyed phone digests/);
  assert.match(html, /no account or registration/);
  assert.doesNotMatch(html, /class="[^"]*\bpv-/);
});
