import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { pathHidesFooter } from "@/components/shell/Footer/footer-visibility";
import { parseBusinessInformation } from "@/payload/globals/business-info";
import { PolicyPage } from "@/app/(site)/_commerce/policy-page";
// PolicyPage renders the site's custom Link, which needs the device, cursor and router contexts.
import { MemberAuthProviders } from "../member-auth/fixtures/providers";
import { CommerceInfo } from "@/components/shell/Footer/commerce-info";
import { FooterShell } from "@/components/shell/Footer/footer-shell";
import { pathShowsSellerFacts } from "@/components/shell/Footer/commerce-facts";
import { mergeSellerFacts } from "@/lib/site-info/seller-facts";

test("source-only: checkout no longer links to the seller facts; the footer prints them", () => {
  const checkout = readFileSync(
    "src/app/(site)/shop/checkout/page.tsx",
    "utf8"
  );
  assert.equal(checkout.includes("#seller-information"), false);
  assert.match(
    readFileSync("src/components/shell/Footer/footer.tsx", "utf8"),
    /<CommerceFacts>\s*<Suspense fallback=\{null\}>\s*<BusinessInfo \/>/
  );
});

// Owner, 22 Nov: the seller facts are "always shown in commerce-related pages, which excludes essays and other
// content-related parts. But policy etc should"; 23 Nov, on the front page: "No, drop it there."
test("the footer prints the seller facts on the shop, checkout, order history and policy pages only", () => {
  for (const path of ["/shop", "/shop/products/x", "/shop/cart", "/shop/checkout", "/shop/payment", "/shop/orders/x", "/tickets", "/tickets/payment",
    "/me/orders", "/me/orders/x", "/help/shipping", "/terms", "/privacy", "/refund"]) {
    assert.equal(pathShowsSellerFacts(path), true, path);
  }
  for (const path of ["/", "/essays", "/essays/in/2", "/essays/x", "/setlists", "/music", "/team", "/welcome", "/help", "/me", "/shopping", null]) {
    assert.equal(pathShowsSellerFacts(path), false, String(path));
  }
});

// Synthetic fixture facts only; never real or approved business data.
const facts = {
  tradeName: "Fixture trade name",
  representative: "Fixture representative",
  businessAddress: "Fixture address",
  bizNum: "000-00-00000",
  mailOrderRegistration: "면제 (간이과세자)",
  customerServicePhone: "02-000-0000",
  customerServiceEmail: "help@example.test"
};
const text = (value: string) => ({
  root: {
    type: "root",
    version: 1,
    direction: null,
    format: "",
    indent: 0,
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: null,
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        children: value
          ? [
              {
                type: "text",
                version: 1,
                text: value,
                format: 0,
                mode: "normal",
                style: "",
                detail: 0
              }
            ]
          : []
      }
    ]
  }
});

test("an empty global has no facts and no policy content", () => {
  for (const value of [
    null,
    {},
    { terms: text(""), privacy: text("   "), refund: null }
  ]) {
    const info = parseBusinessInformation(value);
    assert.equal(info.facts, null);
    assert.deepEqual(info.policies, {
      terms: null,
      privacy: null,
      refund: null
    });
  }
});

test("facts are complete only when every required fact is filled; exemption text is accepted", () => {
  assert.deepEqual(parseBusinessInformation(facts).facts, facts);
  for (const key of Object.keys(facts))
    assert.equal(
      parseBusinessInformation({ ...facts, [key]: " " }).facts,
      null,
      key
    );
  assert.equal(
    parseBusinessInformation({ ...facts, terms: text("Fixture terms body") })
      .policies.terms !== null,
    true
  );
});

test("the global's policy text renders on the policy page", () => {
  const document = parseBusinessInformation({
    terms: text("Fixture terms body")
  }).policies.terms;
  const html = renderToStaticMarkup(
    <MemberAuthProviders>
      <PolicyPage policy="terms" document={document} />
    </MemberAuthProviders>
  );
  assert.equal(html.includes("Fixture terms body"), true);
  assert.equal(html.includes("has not been published yet"), false);
  assert.equal(
    html.includes("Seller information"),
    false,
    "the site footer carries the facts instead"
  );
});

test("an empty global leaves the policy page unchanged", () => {
  for (const policy of ["terms", "privacy", "refund"] as const) {
    const before = renderToStaticMarkup(
      <MemberAuthProviders>
        <PolicyPage policy={policy} />
      </MemberAuthProviders>
    );
    const after = renderToStaticMarkup(
      <MemberAuthProviders>
        <PolicyPage policy={policy} document={null} />
      </MemberAuthProviders>
    );
    assert.equal(after === before, true, policy);
  }
});

test("the footer merges the global and the approved disclosure per field, and no page shows seller details", () => {
  const seller = {
    name: "Fixture seller",
    representative: "Fixture rep",
    registrationNumber: "000-00-00000",
    address: "Fixture address",
    phone: "02-0000-0000"
  };
  const render = (value: ReturnType<typeof mergeSellerFacts>) =>
    renderToStaticMarkup(
      <MemberAuthProviders>
        <FooterShell>
          <CommerceInfo facts={value} />
        </FooterShell>
      </MemberAuthProviders>
    );
  // A complete global: all seven facts, the disclosure unused.
  const complete = render(
    mergeSellerFacts(parseBusinessInformation(facts).filled, seller)
  );
  for (const value of Object.values(facts))
    assert.equal(complete.includes(value), true, value);
  assert.equal(complete.includes("Fixture seller"), false);
  // A partly filled global: its fields win, the disclosure fills the rest, nothing is invented.
  const partial = render(
    mergeSellerFacts(
      parseBusinessInformation({
        customerServiceEmail: facts.customerServiceEmail,
        mailOrderRegistration: facts.mailOrderRegistration
      }).filled,
      seller
    )
  );
  for (const value of [
    ...Object.values(seller),
    facts.customerServiceEmail,
    facts.mailOrderRegistration
  ])
    assert.equal(partial.includes(value), true, value);
  assert.match(partial, /id="seller-information"/);
  assert.equal(
    mergeSellerFacts({}, null),
    null,
    "nothing to show draws no target"
  );
  const policy = renderToStaticMarkup(
    <MemberAuthProviders>
      <PolicyPage policy="terms" />
    </MemberAuthProviders>
  );
  assert.equal(
    policy.includes("Seller information"),
    false,
    "seller details live in the footer only (owner, 21 Nov)"
  );
});

test("the footer keeps the legal links and EN / KO without rendering unapproved business facts", () => {
  for (const candidate of [null, facts]) {
    const html = renderToStaticMarkup(
      <MemberAuthProviders>
        <FooterShell>
          <CommerceInfo facts={candidate} />
        </FooterShell>
      </MemberAuthProviders>
    );
    for (const value of Object.values(facts))
      assert.equal(html.includes(value), !!candidate, value);
    for (const path of ["/terms", "/privacy", "/refund"])
      assert.equal(html.split(`href="${path}"`).length, 2, path);
    // Owner, 20 Nov: "legal only". Help and Shipping moved to the Help pill.
    for (const path of ["/help", "/help/shipping"])
      assert.equal(html.includes(`href="${path}"`), false, path);
    assert.match(html, /role="group" aria-label="Language"/);
    assert.doesNotMatch(html, /Seller information has not been published/i);
  }
});

test("the footer hides only on Team, sign-in, the account home and settings, and a single essay", () => {
  for (const path of [
    "/team",
    "/account",
    "/account/continue",
    "/me",
    "/me/settings/security",
    "/essays/some-slug"
  ]) {
    assert.equal(pathHidesFooter(path), true, path);
  }
  // Every commercial page and the front page keep the footer (owner, 19 Nov); SellerFactsGate decides where the facts print.
  for (const path of [
    "/",
    "/shop",
    "/shop/cart",
    "/shop/checkout",
    "/shop/payment",
    "/tickets",
    "/tickets/payment",
    "/me/orders",
    "/me/orders/x",
    "/help",
    "/terms",
    "/essays",
    "/essays/in",
    "/essays/in/2"
  ]) {
    assert.equal(pathHidesFooter(path), false, path);
  }
});

test("source-only: site layout streams the footer; policy pages read the global", () => {
  const layout = readFileSync("src/app/(site)/layout.tsx", "utf8");
  assert.equal(
    /<FooterGate>\s*<Suspense fallback=\{null\}>\s*<Footer \/>\s*<\/Suspense>\s*<\/FooterGate>/.test(
      layout
    ),
    true
  );
  for (const policy of ["terms", "privacy", "refund"]) {
    const source = readFileSync(`src/app/(site)/${policy}/page.tsx`, "utf8");
    assert.equal(source.includes("loadBusinessInformation"), true, policy);
    assert.equal(source.includes(`business.policies.${policy}`), true, policy);
  }
});
