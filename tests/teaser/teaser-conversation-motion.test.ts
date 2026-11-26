import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../fixtures/english-render";
import { Orbit } from "@/components/teaser/orbit";
import { Conversation, messageVariants, metaVariants, TypingDots } from "@/components/teaser/conversation";
import { messages, principles } from "@/lib/teaser/content";
test("native card variants preserve every active and inactive color", () => {
  assert.deepEqual(messageVariants.inactive, { backgroundColor: "var(--color-carbon)", color: "var(--color-titanium)" });
  assert.deepEqual(messageVariants.first, { backgroundColor: "var(--color-gunmetal)", color: "var(--color-titanium)" });
  assert.deepEqual(messageVariants.active, { backgroundColor: "var(--color-signal-orange)", color: "var(--color-carbon-deep)" });
  assert.deepEqual(metaVariants, { inactive: { color: "var(--color-singer-stone)" }, first: { color: "var(--color-singer-stone)" }, active: { color: "var(--color-imperial-plum-darker-1)" } });
});

test("typing dots retain their exact looping opacity sequence and offsets", () => {
  const dots = TypingDots().props.children;
  for (const [index, dot] of dots.entries()) {
    assert.deepEqual(dot.props.animate, { opacity: [0.25, 1, 0.25] });
    assert.deepEqual(dot.props.transition, { duration: 0.8, delay: [0, 0.2, 0.4][index], repeat: Infinity });
  }
});

test("orbit renders only its current description for the animated narrative", () => {
  const html = renderToStaticMarkup(createElement(Orbit, { onActive: () => {} }));
  for (const [index, principle] of principles.entries()) {
    assert.equal(html.includes(principle.body), index === 0);
  }
});

test("conversation keeps accessible messages and a static image before hydration", () => {
  const html = renderToStaticMarkup(
    createElement(Conversation, { onActive: () => {} })
  );
  for (const message of messages) {
    assert.ok(html.includes(`aria-label="${message.text}"`));
  }
  assert.ok(html.includes("conversation.webp"));
  assert.ok(!html.includes("typing-note"));
  assert.ok(!html.includes("translateY(20px)"));
});
