import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  commerceDisclosure,
  publishedCommerceDisclosureSchema
} from "@/lib/commerce/disclosures";
import { SellerDisclosure } from "@/app/(site)/_commerce/seller-disclosure";
import { PolicyPage } from "@/app/(site)/_commerce/policy-page";
import TermsPage from "@/app/(site)/terms/page";
import PrivacyPage from "@/app/(site)/privacy/page";
import RefundPage from "@/app/(site)/refund/page";

test("approved same-entity seller and owner-supplied contact render without inventing policies", () => {
  assert.deepEqual(commerceDisclosure.seller, {
    name: "리스토어드프로젝트",
    registrationNumber: "753-32-01007",
    representative: "최성윤",
    address:
      "서울특별시 송파구 올림픽로4길 15, 7동 705호(잠실동, 아시아선수촌아파트)",
    phone: "+82 10 4637 9289"
  });
  assert.deepEqual(commerceDisclosure.policies, {
    terms: null,
    privacy: null,
    refund: null
  });
  const html = renderToStaticMarkup(<SellerDisclosure />);
  assert.match(html, /리스토어드프로젝트/);
  assert.match(html, /753-32-01007/);
  assert.match(html, /최성윤/);
  assert.match(html, /\+82 10 4637 9289/);
  assert.doesNotMatch(html, /판매자 정보가 아직 공개되지 않았습니다|통신판매업 신고번호/);
  assert.match(html, /href="\/terms"/);
  assert.match(html, /href="\/privacy"/);
  assert.match(html, /href="\/refund"/);
  assert.doesNotMatch(html, /Footer\.|undefined|mailto:|tel:/);
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
    <SellerDisclosure
      seller={{
        name: "Fixture merchant",
        registrationNumber: "000-00-00000",
        representative: "Fixture representative",
        address: "Fixture office address",
        phone: "02-000-0000",
        mailOrderRegistrationNumber: "Fixture mail-order registration"
      }}
    />
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
  assert.doesNotMatch(html, /아직 공개되지/);
});

test("optional mail-order field is omitted rather than fabricated", () => {
  const html = renderToStaticMarkup(
    <SellerDisclosure
      seller={{
        name: "Fixture merchant",
        registrationNumber: "000-00-00000",
        representative: "Fixture representative",
        address: "Fixture office address",
        phone: "02-000-0000"
      }}
    />
  );
  assert.doesNotMatch(html, /통신판매업 신고번호/);
});

test("all public policy routes resolve to their own honest unavailable surface", () => {
  for (const [Page, title] of [
    [TermsPage, "이용약관"],
    [PrivacyPage, "개인정보처리방침"],
    [RefundPage, "취소·환불 안내"]
  ] as const) {
    const html = renderToStaticMarkup(<Page />);
    assert.ok(html.includes(title));
    assert.match(html, /아직 공개되지 않았습니다/);
    assert.doesNotMatch(html, /현재 구매할 수 없습니다|결제가 차단/);
    assert.match(html, /href="\/tickets"/);
    assert.doesNotMatch(html, /동의합니다|환불 불가|전액 환불|시행일/);
  }
});

test("policy content renders approved plain text without treating it as HTML", () => {
  const html = renderToStaticMarkup(
    <PolicyPage
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
    />
  );
  const policyMain = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(policyMain, "The policy has its own main content landmark");
  assert.match(policyMain, /Fixture refund terms/);
  assert.match(policyMain, /시행일/);
  assert.match(policyMain, /2026-11-01/);
  assert.match(policyMain, /&lt;script&gt;/);
  assert.doesNotMatch(policyMain, /<script>|아직 공개되지/);
  assert.match(html, /리스토어드프로젝트/);
  assert.match(html, /\+82 10 4637 9289/);
});
