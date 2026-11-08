import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { stagger } from "motion/react";
import { Orbit } from "@/components/teaser/orbit";
import { Conversation, messageVariants, metaVariants, TypingDots } from "@/components/teaser/conversation";
import { messages, principles } from "@/lib/teaser/content";
test("message words use Motion's native fifty-millisecond stagger", () => {
  assert.deepEqual([0, 1, 2].map((index) => stagger(0.05)(index, 3)), [0, 0.05, 0.1]);
  const source = readFileSync(new URL("../../components/teaser/conversation.tsx", import.meta.url), "utf8");
  assert.match(source, /delay: stagger\(0\.05\)\(wordIndex, words\.length\)/);
  assert.match(source, /duration: 0\.2/);
  assert.match(source, /step === 1 && activeViewport/);
});

test("native card variants preserve every active and inactive color", () => {
  assert.deepEqual(messageVariants.inactive, { backgroundColor: "#161616", color: "#fff" });
  assert.deepEqual(messageVariants.first, { backgroundColor: "#292929", color: "#fff" });
  assert.deepEqual(messageVariants.active, { backgroundColor: "#ff4c25", color: "#000" });
  assert.deepEqual(metaVariants, { inactive: { color: "#bbb" }, first: { color: "#aaa" }, active: { color: "#552014" } });
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
