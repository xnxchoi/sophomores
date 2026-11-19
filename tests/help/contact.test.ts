import assert from "node:assert/strict";
import test from "node:test";
import { dialTarget, selectHelpContact } from "@/app/(site)/help/_components/help-contact";

test("Korean numbers become dial targets", () => {
  for (const [phone, target] of [
    ["010-4637-9289", "tel:+821046379289"],
    ["+82 10 4637 9289", "tel:+821046379289"],
    ["02-123-4567", "tel:+8221234567"],
    ["031-123-4567", "tel:+82311234567"],
    ["070-1234-5678", "tel:+827012345678"],
    ["+82 (0)2 123 4567", "tel:+8221234567"],
    ["1588-1234", "tel:15881234"],
  ] as const) {
    assert.equal(dialTarget(phone), target, phone);
  }
});

test("anything else stays plain text", () => {
  for (const phone of ["0109999", "12345678", "0291234567890", "Call office", "+1 415 555 0100", "010-1234-5678 ext 2", ""]) {
    assert.equal(dialTarget(phone), null, phone);
  }
});

test("contact uses complete business facts as one unit, else the seller, else nothing", () => {
  const facts = {
    tradeName: "Trade", representative: "R", businessAddress: "A", businessRegistrationNumber: "123-45-67890",
    mailOrderRegistration: "M", customerServicePhone: "02-123-4567", customerServiceEmail: "help@example.com",
  };
  const seller = { name: "Seller", registrationNumber: "123-45-67890", representative: "R", address: "A", phone: "031-123-4567" };
  assert.deepEqual(selectHelpContact(facts, seller), { name: "Trade", phone: "02-123-4567", email: "help@example.com" });
  assert.deepEqual(selectHelpContact(null, seller), { name: "Seller", phone: "031-123-4567", email: undefined });
  assert.equal(selectHelpContact(null, { ...seller, phone: "  " }), null);
  assert.equal(selectHelpContact(null, null), null);
});
