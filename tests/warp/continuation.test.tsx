import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { Node, Project, SyntaxKind } from "ts-morph";
import { homepageSSRFixture } from "../fixtures/homepage-ssr";

const homepage = homepageSSRFixture();

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
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

test("footer invitation retains a native closed dialog and meaningful controls", () => {
  const dom = new JSDOM(renderToStaticMarkup(<homepage.Home />));
  try {
    const document = dom.window.document;
    const trigger =
      document.querySelector<HTMLButtonElement>("#contacts button");
    assert.ok(trigger);
    assert.match(trigger.textContent ?? "", /The first invitation/);
    const dialogs = document.querySelectorAll<HTMLDialogElement>(
      "dialog"
    );
    assert.equal(dialogs.length, 1);
    const dialog = dialogs[0];
    assert.equal(dialog.hasAttribute("open"), false);
    const heading = document.getElementById(
      dialog.getAttribute("aria-labelledby") ?? ""
    );
    assert.ok(
      heading?.textContent?.trim(),
      "The dialog must have a nonempty accessible heading"
    );
    assert.ok(dialog.querySelector("button[aria-label='Close invitation']"));
    assert.match(
      dialog.textContent ?? "",
      /No email is collected and no reservation is made/
    );
    assert.equal(dialog.querySelector("form") === null, true);
  } finally {
    dom.window.close();
  }
});

test("appending the continuation preserves every existing warp node and map owner", () => {
  const project = new Project({ useInMemoryFileSystem: true });
  const source = project.createSourceFile(
    "warp.tsx",
    read("../../src/components/Warp/index.tsx")
  );
  const warp = source
    .getVariableDeclarationOrThrow("Warp")
    .getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction);
  const tag = (
    node:
      import("ts-morph").JsxElement | import("ts-morph").JsxSelfClosingElement
  ) =>
    Node.isJsxElement(node)
      ? node.getOpeningElement().getTagNameNode().getText()
      : node.getTagNameNode().getText();
  const nodes = warp
    .getDescendants()
    .filter(
      (node) => Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)
    );
  const additions = nodes.filter((node) => tag(node) === "TeaserContinuation");
  assert.equal(
    additions.length,
    1,
    "Append one continuation, not a second full experience"
  );
  const addition = additions[0];
  assert.deepEqual(
    addition.getAncestors().filter(Node.isJsxElement).reverse().map(tag),
    ["main"]
  );
  const originalNodes = nodes.filter(
    (node) =>
      !["TeaserContinuation", "WarpControls", "SequenceEditor"].includes(
        tag(node)
      )
  );
  assert.ok(
    addition.getStart() > originalNodes.at(-1)!.getEnd(),
    "Continuation must follow the original Hero/Story handoff"
  );
  const controls = nodes.filter((node) => tag(node) === "WarpControls");
  assert.ok(
    controls.length <= 1,
    "At most one explicitly requested development panel"
  );
  for (const control of controls) {
    assert.deepEqual(
      control.getAncestors().filter(Node.isJsxElement).reverse().map(tag),
      ["main"]
    );
    assert.ok(
      control.getStart() > addition.getEnd(),
      "Development panel follows the continuation"
    );
  }
  const shape = nodes
    .filter(
      (node) =>
        !["TeaserContinuation", "WarpControls", "SequenceEditor"].includes(
          tag(node)
        )
    )
    .map((node) => ({
      tag: tag(node),
      parents: node.getAncestors().filter(Node.isJsxElement).reverse().map(tag),
      maps: node
        .getAncestors()
        .filter(Node.isCallExpression)
        .filter((call) => call.getExpression().getText().endsWith(".map"))
        .reverse()
        .map((call) => call.getExpression().getText())
    }));
  assert.deepEqual(
    shape,
    JSON.parse(read("./fixtures/user-node-hierarchy.json")),
    "Never reparent or replace the user's warp nodes"
  );
});

test("continuation reuses original chapter components, footer renderer and shared dialog without another scroll root", () => {
  const source = read("../../src/components/teaser/continuation.tsx");
  assert.doesNotMatch(source, /<ReactLenis\b|<Hero\b|<Story\b|<Orbit\b|useEntry\(/);
  for (const component of [
    "Conversation",
    "People",
    "Invitation",
    "InvitationDialog"
  ]) {
    assert.match(source, new RegExp(`<${component}\\b`));
  }
  assert.match(source, /<SceneLoader[\s\S]*?\bfooter\b/);
  assert.match(source, /onActive=\{onActive\}/);
  assert.match(source, /\.showModal\(\)/);
  assert.match(source, /lenis\?\.stop\(\)/);
  assert.match(source, /lenis\?\.start\(\)/);
  const original = read("../../src/components/teaser/experience.tsx");
  assert.match(
    original,
    /<InvitationDialog\b/,
    "Original experience must share rather than duplicate the dialog"
  );
});
