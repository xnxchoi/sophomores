import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { Node, Project, SyntaxKind } from "ts-morph";
import { Warp } from "../../components/Warp";
import { stories } from "../../lib/teaser/content";
import { analogueRunwayHeightVh } from "../../lib/teaser/step-motion";

const project = new Project({ useInMemoryFileSystem: true });
const study = project.createSourceFile(
  "study.tsx",
  readFileSync(
    new URL("../../components/Warp/index.tsx", import.meta.url),
    "utf8"
  )
);
const field = project.createSourceFile(
  "field.tsx",
  readFileSync(
    new URL("../../components/Warp/warp-field.tsx", import.meta.url),
    "utf8"
  )
);

test("the exact user-authored node hierarchy and mapped children remain unchanged", () => {
  const tag = (
    node:
      import("ts-morph").JsxElement | import("ts-morph").JsxSelfClosingElement
  ) =>
    Node.isJsxElement(node)
      ? node.getOpeningElement().getTagNameNode().getText()
      : node.getTagNameNode().getText();
  const shape = study
    .getVariableDeclarationOrThrow("Warp")
    .getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction)
    .getDescendants()
    .filter(
      (node) => Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)
    )
    // Only the explicitly requested page continuation/developer panel may be appended.
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
  const expected = JSON.parse(
    readFileSync(
      new URL("./fixtures/user-node-hierarchy.json", import.meta.url),
      "utf8"
    )
  );
  assert.deepEqual(
    shape,
    expected,
    "Never reparent, replace or remove the original user-authored JSX nodes"
  );
});

test("both existing h2 halves share the existing parent div animation scope", () => {
  const scope = study
    .getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
    .find((node) =>
      node.getAttribute("ref")?.getText().includes("headlineScope")
    );
  assert.ok(scope);
  assert.equal(scope.getTagNameNode().getText(), "div");
  const owner = scope.getParentIfKindOrThrow(SyntaxKind.JsxElement);
  const headings = owner
    .getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
    .filter((node) => node.getTagNameNode().getText() === "motion.h2");
  assert.equal(headings.length, 2);
  const dom = new JSDOM(renderToStaticMarkup(<Warp />));
  try {
    const headline = dom.window.document.querySelector(
      "section[aria-label='Entry sequence'] > div"
    );
    assert.ok(headline);
    assert.equal(headline.getAttribute("aria-label"), stories[3].title);
    assert.equal(headline.querySelectorAll("h2").length, 2);
    assert.equal(
      headline.querySelectorAll("[data-warp-char]").length,
      dom.window.document.querySelectorAll("[data-warp-char]").length
    );
  } finally {
    dom.window.close();
  }
});

test("scroll target has actual travel and leaves viewport pinning to its existing child", () => {
  const dom = new JSDOM(renderToStaticMarkup(<Warp />));
  try {
    const runway = dom.window.document.querySelector(
      "section[aria-label='Entry sequence']"
    );
    assert.ok(runway);
    assert.equal(
      runway.getAttribute("style"),
      `height:${analogueRunwayHeightVh()}svh`
    );
    assert.equal(runway.classList.contains("sticky"), false);
    assert.ok(runway.firstElementChild?.classList.contains("sticky"));
    assert.equal(
      runway.children.length,
      4,
      "Keep all four user-authored section children"
    );
  } finally {
    dom.window.close();
  }
});

test("field and passage stay nested in their original shared subtree with fixed viewport positioning", () => {
  const dom = new JSDOM(renderToStaticMarkup(<Warp />));
  try {
    const runway = dom.window.document.querySelector(
      "section[aria-label='Entry sequence']"
    );
    const fieldGroup = runway?.children[1];
    assert.ok(fieldGroup);
    assert.ok(fieldGroup.classList.contains("fixed"));
    const scene = fieldGroup.querySelector("[data-warp-scene]");
    const passage = fieldGroup.querySelector("[data-warp-passage]");
    assert.ok(scene && passage);
    assert.equal(scene.closest("section"), runway);
    assert.equal(passage.parentElement, fieldGroup);
    assert.equal(scene.querySelector("[class*='opacity-']"), null);
    assert.ok(passage.classList.contains("absolute"));
  } finally {
    dom.window.close();
  }
});

test("ring preserves its display-space color without renderer tone mapping", () => {
  const ring = field.getFunctionOrThrow("Ring");
  const material = ring
    .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
    .find((node) => node.getTagNameNode().getText() === "shaderMaterial");
  const toneMapped = material?.getAttribute("toneMapped");
  assert.equal(toneMapped?.getText().replace(/\s/g, ""), "toneMapped={false}");
});

test("renderer failure still hands readiness to the readable fallback", () => {
  const boundary = field
    .getClassOrThrow("FieldBoundary")
    .getMethodOrThrow("render");
  const fallback = boundary
    .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
    .find((node) => node.getTagNameNode().getText() === "FieldFallback");
  assert.ok(
    fallback,
    "error boundary must render the fallback, not an empty fragment"
  );
  assert.equal(
    fallback.getAttribute("onReady")?.getText().replace(/\s/g, ""),
    "onReady={this.props.onReady}"
  );
  const effect = field
    .getFunctionOrThrow("FieldFallback")
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((call) => call.getExpression().getText() === "useEffect");
  assert.deepEqual(
    effect?.getArguments().map((argument) => argument.getText()),
    ["onReady", "[onReady]"]
  );
});

test("homepage composition omits study-only controls by default", () => {
  const dom = new JSDOM(renderToStaticMarkup(<Warp />));
  try {
    assert.equal(
      dom.window.document.querySelector("[data-warp-controls]"),
      null
    );
  } finally {
    dom.window.close();
  }
});
