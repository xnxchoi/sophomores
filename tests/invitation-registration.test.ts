import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emailSchema,
  nameSchema,
  registrationSchema,
  initialRegistration,
  validateRegistrationStep
} from "../lib/invitation/registration";

test("email is required, bounded, validated and trimmed without rewriting casing", () => {
  assert.equal(
    emailSchema.parse("  Name+night@example.com  "),
    "Name+night@example.com"
  );
  for (const invalid of [
    "",
    " ",
    "missing-at",
    "a@",
    "a@host",
    null,
    42,
    "a".repeat(250) + "@example.com"
  ])
    assert.equal(emailSchema.safeParse(invalid).success, false);
});

test("preferred name is optional, trimmed and bounded", () => {
  assert.equal(nameSchema.parse("  Sean  "), "Sean");
  assert.equal(nameSchema.parse("   "), "");
  assert.equal(nameSchema.parse("a".repeat(80)).length, 80);
  for (const invalid of ["a".repeat(81), null, true])
    assert.equal(nameSchema.safeParse(invalid).success, false);
});

test("review requires explicit boolean preview consent and strips unexpected fields", () => {
  const valid = {
    email: " test@example.com ",
    preferredName: " Sam ",
    consent: true
  };
  assert.deepEqual(registrationSchema.parse({ ...valid, role: "member" }), {
    email: "test@example.com",
    preferredName: "Sam",
    consent: true
  });
  for (const consent of [false, "true", 1, undefined])
    assert.equal(
      registrationSchema.safeParse({ ...valid, consent }).success,
      false
    );
  assert.equal(
    registrationSchema.safeParse({ ...valid, preferredName: "" }).success,
    true
  );
});

test("step validation gates only the current question and never mutates input", () => {
  const initial = Object.freeze(initialRegistration());
  assert.equal(validateRegistrationStep("intro", initial), null);
  assert.equal(validateRegistrationStep("complete", initial), null);
  assert.match(validateRegistrationStep("email", initial)!, /email/i);
  assert.equal(validateRegistrationStep("name", initial), null);
  assert.match(
    validateRegistrationStep("name", {
      ...initial,
      preferredName: "x".repeat(81)
    })!,
    /80/
  );
  assert.match(validateRegistrationStep("review", initial)!, /email/i);
  const entered = Object.freeze({
    email: "hi@example.com",
    preferredName: "",
    consent: false
  });
  assert.equal(validateRegistrationStep("email", entered), null);
  assert.match(validateRegistrationStep("review", entered)!, /preview/i);
  assert.equal(
    validateRegistrationStep("review", { ...entered, consent: true }),
    null
  );
  assert.deepEqual(initial, { email: "", preferredName: "", consent: false });
  assert.notEqual(initialRegistration(), initialRegistration());
});
