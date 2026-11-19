import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import TeamLayout from "@/app/(site)/team/layout";
import { parseBusinessInformation } from "@/payload/globals/business-info";
import { PolicyPage } from "@/app/(site)/_commerce/policy-page";
import { BusinessFooterFacts, BusinessFooterView } from "@/app/(site)/_commerce/business-footer";

// Synthetic fixture facts only; never real or approved business data.
const facts = { tradeName: "Fixture trade name", representative: "Fixture representative", businessAddress: "Fixture address",
  businessRegistrationNumber: "000-00-00000", mailOrderRegistration: "면제 (간이과세자)",
  customerServicePhone: "02-000-0000", customerServiceEmail: "help@example.test" };
const text = (value: string) => ({ root: { type: "root", version: 1, direction: null, format: "", indent: 0,
  children: [{ type: "paragraph", version: 1, direction: null, format: "", indent: 0, textFormat: 0, textStyle: "",
    children: value ? [{ type: "text", version: 1, text: value, format: 0, mode: "normal", style: "", detail: 0 }] : [] }] } });

test("an empty global has no facts and no policy content", () => {
  for (const value of [null, {}, { terms: text(""), privacy: text("   "), refund: null }]) {
    const info = parseBusinessInformation(value);
    assert.equal(info.facts, null);
    assert.deepEqual(info.policies, { terms: null, privacy: null, refund: null });
  }
});

test("facts are complete only when every required fact is filled; exemption text is accepted", () => {
  assert.deepEqual(parseBusinessInformation(facts).facts, facts);
  for (const key of Object.keys(facts)) assert.equal(parseBusinessInformation({ ...facts, [key]: " " }).facts, null, key);
  assert.equal(parseBusinessInformation({ ...facts, terms: text("Fixture terms body") }).policies.terms !== null, true);
});

test("the global's policy text renders on the policy page", () => {
  const document = parseBusinessInformation({ terms: text("Fixture terms body") }).policies.terms;
  const html = renderToStaticMarkup(<EnglishMessages><PolicyPage policy="terms" document={document} showSeller={false} /></EnglishMessages>);
  assert.equal(html.includes("Fixture terms body"), true);
  assert.equal(html.includes("has not been published yet"), false);
  assert.equal(html.includes("Seller information"), false, "the site footer carries the facts instead");
});

test("an empty global leaves the policy page unchanged", () => {
  for (const policy of ["terms", "privacy", "refund"] as const) {
    const before = renderToStaticMarkup(<EnglishMessages><PolicyPage policy={policy} /></EnglishMessages>);
    const after = renderToStaticMarkup(<EnglishMessages><PolicyPage policy={policy} document={null} showSeller /></EnglishMessages>);
    assert.equal(after === before, true, policy);
  }
});

test("the footer keeps navigation available without rendering unapproved business facts", () => {
  for (const candidate of [null, facts]) {
    const html = renderToStaticMarkup(
      <EnglishMessages>
        <BusinessFooterView><BusinessFooterFacts facts={candidate} /></BusinessFooterView>
      </EnglishMessages>,
    );
    for (const value of Object.values(facts)) assert.equal(html.includes(value), !!candidate, value);
    for (const path of ["/help", "/help/shipping", "/terms", "/privacy", "/refund"]) {
      assert.equal(html.split(`href="${path}"`).length, 2, path);
    }
    assert.doesNotMatch(html, /Seller information has not been published/i);
  }
});

test("the Team layout declares the footer mode without a pathname rule", () => {
  const footer = renderToStaticMarkup(<EnglishMessages><BusinessFooterView /></EnglishMessages>);
  const team = renderToStaticMarkup(<TeamLayout><main>Team</main></TeamLayout>);
  const dom = new JSDOM(`<body>${footer}</body>`);
  try {
    const element = dom.window.document.querySelector("footer");
    assert.ok(element);
    const variant = [...element.classList].find((value) => value.endsWith("_&]:hidden"));
    assert.ok(variant);
    const selector = variant.slice(1, -":hidden".length - 1).replace("_&", " footer");

    assert.equal(element.matches(selector), false);
    dom.window.document.body.insertAdjacentHTML("afterbegin", team);
    assert.equal(element.matches(selector), true);
    dom.window.document.querySelector("[data-business-footer-mode]")?.remove();
    assert.equal(element.matches(selector), false);
  } finally {
    dom.window.close();
  }
});

test("source-only: site layout streams the footer; policy pages read the global", () => {
  const layout = readFileSync("src/app/(site)/layout.tsx", "utf8");
  assert.equal(/<Suspense fallback=\{null\}>\s*<BusinessFooter \/>\s*<\/Suspense>/.test(layout), true);
  for (const policy of ["terms", "privacy", "refund"]) {
    const source = readFileSync(`src/app/(site)/${policy}/page.tsx`, "utf8");
    assert.equal(source.includes("loadBusinessInformation"), true, policy);
    assert.equal(source.includes(`business.policies.${policy}`), true, policy);
  }
});
