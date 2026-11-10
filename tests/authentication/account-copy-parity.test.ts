import messages from "../../messages/en.json";
import assert from "node:assert/strict";
import { test } from "node:test";

test("invalid-code copy is coherent across account journeys", () => {
  assert.equal(messages.AuthPhase.failures["invalid-code"], messages.MemberAuth.failures["invalid-code"]);
});

test("expired-code copy is coherent across account journeys", () => {
  assert.equal(messages.AuthPhase.failures["expired-code"], messages.MemberAuth.failures["expired-code"]);
});

test("attempts-exhausted copy is coherent across account journeys", () => {
  assert.equal(messages.AuthPhase.failures["attempts-exhausted"], messages.MemberAuth.failures["attempts-exhausted"]);
});

test("timeout copy is coherent across account journeys", () => {
  assert.equal(messages.AuthPhase.failures.timeout, messages.MemberAuth.failures.timeout);
});

test("passkey-cancelled copy is coherent across account journeys", () => {
  assert.equal(messages.AuthPhase.failures["passkey-cancelled"], messages.MemberAuth.failures["passkey-cancelled"]);
});

test("provider-denied copy is coherent across account journeys", () => {
  assert.equal(messages.AuthPhase.failures["provider-denied"], messages.MemberAuth.failures["provider-denied"]);
});

test("phone-conflict copy is coherent across account journeys", () => {
  assert.equal(messages.AuthPhase.failures["phone-conflict"], messages.MemberAuth.failures["phone-conflict"]);
});
