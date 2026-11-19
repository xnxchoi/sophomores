import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../fixtures/english-render";
import { homepageSSRFixture } from "../fixtures/homepage-ssr";

const homepage = homepageSSRFixture();

const sectionIds = ["hero", "origin", "strategy", "people", "contacts"];

test("homepage continues through every original chapter and footer exactly once", () => {
  const dom = new JSDOM(renderToStaticMarkup(<homepage.Home />));
  try {
    const document = dom.window.document;
    assert.equal(document.querySelectorAll("main").length, 1);
    for (const id of sectionIds) {
      assert.equal(
        document.querySelectorAll(`#${id}`).length,
        1,
        `${id} must be mounted exactly once`
      );
    }
    const sections = [...document.querySelectorAll("section[id]")]
      .map((section) => section.id)
      .filter((id) => sectionIds.includes(id));
    assert.deepEqual(sections, sectionIds);
    const footer = document.querySelector("#contacts footer");
    assert.ok(footer, "The original invitation footer belongs in the page");
    assert.match(footer.textContent ?? "", /sophomores 2026/);
    assert.match(footer.textContent ?? "", /Back to the beginning/);
    assert.ok(document.querySelector("#contacts [data-footer-backdrop]"));
    assert.equal(document.querySelectorAll("[data-warp-study]").length, 1);
  } finally {
    dom.window.close();
  }
});
