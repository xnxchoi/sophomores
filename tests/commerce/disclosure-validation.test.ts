import assert from "node:assert/strict";
import { test } from "node:test";
import {
  commerceDisclosure,
  publishedCommerceDisclosureSchema
} from "@/lib/commerce/disclosures";

// Synthetic validation fixtures only, never public merchant or policy content.
const policy = {
  effectiveDate: "2026-01-01",
  sections: [
    { heading: "Fixture section", paragraphs: ["Fixture policy text"] }
  ]
};
const disclosure = {
  seller: {
    name: "Fixture merchant",
    registrationNumber: "000-00-00000",
    representative: "Fixture representative",
    address: "Fixture office address",
    phone: "02-000-0000"
  },
  policies: { terms: policy, privacy: policy, refund: policy }
};

test("unpublished and missing disclosures fail the shared server gate", () => {
  for (const value of [
    commerceDisclosure,
    null,
    undefined,
    {},
    { ...disclosure, seller: null },
    { ...disclosure, policies: {} }
  ]) {
    assert.equal(
      publishedCommerceDisclosureSchema.safeParse(value).success,
      false
    );
  }
});

test("all mandatory seller fields must be nonblank and registration must have business-number shape", () => {
  for (const key of [
    "name",
    "registrationNumber",
    "representative",
    "address",
    "phone"
  ] as const) {
    assert.equal(
      publishedCommerceDisclosureSchema.safeParse({
        ...disclosure,
        seller: { ...disclosure.seller, [key]: " \n " }
      }).success,
      false,
      key
    );
    const seller = Object.fromEntries(
      Object.entries(disclosure.seller).filter(([field]) => field !== key)
    );
    assert.equal(
      publishedCommerceDisclosureSchema.safeParse({ ...disclosure, seller })
        .success,
      false,
      `missing ${key}`
    );
  }
  for (const registrationNumber of [
    "123",
    "not a registration number",
    "000-000-0000"
  ]) {
    assert.equal(
      publishedCommerceDisclosureSchema.safeParse({
        ...disclosure,
        seller: { ...disclosure.seller, registrationNumber }
      }).success,
      false
    );
  }
});

test("Korean mobile and malformed contacts cannot open checkout", () => {
  for (const phone of [
    "010-1234-5678",
    "0111234567",
    "+82 10 1234 5678",
    "+821012345678",
    "821012345678",
    "12345678",
    "business phone",
    "02-12-34"
  ]) {
    assert.equal(
      publishedCommerceDisclosureSchema.safeParse({
        ...disclosure,
        seller: { ...disclosure.seller, phone }
      }).success,
      false,
      phone
    );
  }
});

test("every policy needs an effective calendar date and nonempty substantive sections", () => {
  for (const key of ["terms", "privacy", "refund"] as const) {
    for (const value of [
      null,
      {},
      { ...policy, effectiveDate: "" },
      { ...policy, effectiveDate: "2026-02-30" },
      { ...policy, effectiveDate: "2999-01-01" },
      { ...policy, sections: [] },
      { ...policy, sections: [{ heading: " ", paragraphs: ["Text"] }] },
      { ...policy, sections: [{ heading: "Heading", paragraphs: [] }] },
      { ...policy, sections: [{ heading: "Heading", paragraphs: [" "] }] }
    ]) {
      assert.equal(
        publishedCommerceDisclosureSchema.safeParse({
          ...disclosure,
          policies: { ...disclosure.policies, [key]: value }
        }).success,
        false,
        key
      );
    }
  }
});

test("complete synthetic content and non-mobile business contact shapes pass", () => {
  for (const phone of [
    "02-000-0000",
    "031-000-0000",
    "070-0000-0000",
    "1588-0000",
    "+82-2-000-0000"
  ]) {
    assert.equal(
      publishedCommerceDisclosureSchema.safeParse({
        ...disclosure,
        seller: { ...disclosure.seller, phone }
      }).success,
      true,
      phone
    );
  }
});
