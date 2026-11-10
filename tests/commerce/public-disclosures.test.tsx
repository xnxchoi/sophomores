import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  commerceDisclosure,
  publishedCommerceDisclosureSchema
} from "@/lib/commerce/disclosures";
import { SellerDisclosure } from "@/app/(site)/_commerce/seller-disclosure";
import { PolicyPage } from "@/app/(site)/_commerce/policy-page";

test("unconfigured seller never falls back to legacy seller facts", () => {
  const html = renderToStaticMarkup(<EnglishMessages><SellerDisclosure /></EnglishMessages>);
  assert.match(html, /Seller information has not been published yet\./);
  assert.doesNotMatch(html, /리스토어드프로젝트|753-32-01007|4637 9289/);
  for (const path of ["terms", "privacy", "refund"]) assert.ok(html.includes(`href="/${path}"`));
});

test("the approved public mobile contact cannot satisfy the checkout publication gate", () => {
  // Fully populated synthetic policies isolate the phone gate; they are not
  // approved public copy and never enter the actual disclosure configuration.
  const policy = {
    effectiveDate: "2026-01-01",
    sections: [{ heading: "Fixture policy", paragraphs: ["Fixture terms"] }]
  };
  const result = publishedCommerceDisclosureSchema.safeParse({
    seller: commerceDisclosure.seller,
    policies: { terms: policy, privacy: policy, refund: policy }
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) =>
      issue.path.join(".") === "seller.phone"));
  }
  assert.equal(publishedCommerceDisclosureSchema.safeParse(commerceDisclosure).success, false);
});

test("approved seller fields render together, including a non-mobile contact and optional mail-order number", () => {
  // Synthetic test data only; never imported into the public configuration.
  const html = renderToStaticMarkup(
    <EnglishMessages><SellerDisclosure
      seller={{
        name: "Fixture merchant",
        registrationNumber: "000-00-00000",
        representative: "Fixture representative",
        address: "Fixture office address",
        phone: "02-000-0000",
        mailOrderRegistrationNumber: "Fixture mail-order registration"
      }}
    /></EnglishMessages>
  );
  for (const value of [
    "Fixture merchant",
    "000-00-00000",
    "Fixture representative",
    "Fixture office address",
    "02-000-0000",
    "Fixture mail-order registration"
  ])
    assert.ok(html.includes(value));
  for (const caption of [
    "Business name", "Business registration number", "Representative",
    "Business address", "Phone number", "Mail-order business registration number"
  ]) assert.ok(html.includes(caption));
  assert.doesNotMatch(html, /has not been published yet/);
});

test("optional mail-order field is omitted rather than fabricated", () => {
  const html = renderToStaticMarkup(
    <EnglishMessages><SellerDisclosure
      seller={{
        name: "Fixture merchant",
        registrationNumber: "000-00-00000",
        representative: "Fixture representative",
        address: "Fixture office address",
        phone: "02-000-0000"
      }}
    /></EnglishMessages>
  );
  assert.doesNotMatch(html, /Mail-order business registration number/);
});

test("all public policy routes resolve to their own honest unavailable surface", () => {
  for (const [policy, title] of [
    ["terms", "Terms of use"],
    ["privacy", "Privacy policy"],
    ["refund", "Cancellation and refund information"]
  ] as const) {
    const html = renderToStaticMarkup(<EnglishMessages><PolicyPage policy={policy} /></EnglishMessages>);
    assert.ok(html.includes(title));
    assert.match(html, /text has not been published yet\./);
    assert.doesNotMatch(html, /현재 구매할 수 없습니다|결제가 차단|cannot currently be purchased|payment is blocked/i);
    assert.match(html, /href="\/tickets"/);
    assert.doesNotMatch(html, /동의합니다|환불 불가|전액 환불|시행일|I agree|non-refundable|full refund|Effective date/i);
  }
});

test("policy content renders approved plain text without treating it as HTML", () => {
  const html = renderToStaticMarkup(
    <EnglishMessages><PolicyPage
      policy="refund"
      content={{
        effectiveDate: "2026-11-01",
        sections: [
          {
            heading: "Fixture refund terms",
            paragraphs: [
              "Approved fixture text <script>not executable</script>"
            ]
          }
        ]
      }}
    /></EnglishMessages>
  );
  const policyMain = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(policyMain, "The policy has its own main content landmark");
  assert.match(policyMain, /Fixture refund terms/);
  assert.match(policyMain, /Effective date/);
  assert.match(policyMain, /2026-11-01/);
  assert.match(policyMain, /&lt;script&gt;/);
  assert.doesNotMatch(policyMain, /<script>|아직 공개되지|has not been published yet/);
  assert.doesNotMatch(html, /리스토어드프로젝트|4637 9289/);
});
