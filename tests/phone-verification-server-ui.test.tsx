import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VerificationProvider } from "../components/phone-verification/phone-verification";
import { PhoneVerificationTrialModal, TrialVerificationFlow, TrialVerificationView } from "../components/phone-verification/phone-verification-trial";

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
    if (state === "verified") assert.match(html, /Synthetic local test passed/);
    if (state === "consumed") assert.match(html, /already been used/);
    if (state === "pending") { assert.match(html, /verify@sophomores.co/); assert.match(html, /MMS/); }
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
