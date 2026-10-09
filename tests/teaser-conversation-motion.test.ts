import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Orbit } from "../components/teaser/orbit";
import { Conversation } from "../components/teaser/conversation";
import { messages, principles } from "../lib/teaser/content";
import {
  conversationMotion,
  messageColors,
  orbitDescriptionMotion,
  shouldAnimateTyping,
  wordRevealTransition
} from "../lib/teaser/conversation-motion";

test("typing runs only on the second message while visible and motion-enabled", () => {
  for (const step of [0, 1, 2]) {
    for (const inView of [false, true]) {
      for (const visible of [false, true]) {
        for (const still of [false, true]) {
          assert.equal(
            shouldAnimateTyping({ step, inView, visible, still }),
            step === 1 && inView && visible && !still
          );
        }
      }
    }
  }
});

test("message words stagger fifty milliseconds with a two-hundred millisecond reveal", () => {
  assert.deepEqual(
    [0, 1, 2].map((index) => wordRevealTransition(index).delay),
    [0, 0.05, 0.1]
  );
  assert.equal(wordRevealTransition(5).duration, 0.2);
  assert.equal(conversationMotion.wordOffsetY, 20);
  assert.equal(conversationMotion.colorDuration, 0.35);
  assert.equal(conversationMotion.typingDuration, 0.8);
  assert.deepEqual(conversationMotion.typingDelays, [0, 0.2, 0.4]);
});

test("active card colors preserve the first card's neutral treatment", () => {
  assert.deepEqual(messageColors(0, true), {
    backgroundColor: "#292929",
    color: "#fff",
    meta: "#aaa"
  });
  assert.deepEqual(messageColors(1, true), {
    backgroundColor: "#ff4c25",
    color: "#000",
    meta: "#552014"
  });
  assert.deepEqual(messageColors(2, false), {
    backgroundColor: "#161616",
    color: "#fff",
    meta: "#bbb"
  });
});

test("orbit descriptions exit before entering with the source slide distances and no blur", () => {
  assert.deepEqual(orbitDescriptionMotion.initial, { opacity: 0, y: 40 });
  assert.deepEqual(orbitDescriptionMotion.animate, { opacity: 1, y: 0 });
  assert.deepEqual(orbitDescriptionMotion.exit, {
    opacity: 0,
    y: -60,
    transition: { duration: 0.6, delay: 0.2 }
  });
  assert.deepEqual(orbitDescriptionMotion.transition, {
    duration: 1.2,
    ease: [0.5, 0, 0, 1]
  });
});

test("still orbit exposes every description while animated orbit has only its current description", () => {
  const still = renderToStaticMarkup(
    createElement(Orbit, { still: true, onActive: () => {} })
  );
  const animated = renderToStaticMarkup(
    createElement(Orbit, { still: false, onActive: () => {} })
  );
  for (const [index, principle] of principles.entries()) {
    assert.ok(still.includes(principle.body));
    assert.equal(animated.includes(principle.body), index === 0);
  }
});

test("still conversation keeps complete accessible messages and the static image, not typing", () => {
  const html = renderToStaticMarkup(
    createElement(Conversation, { still: true, onActive: () => {} })
  );
  for (const message of messages) {
    assert.ok(html.includes(`aria-label="${message.text}"`));
  }
  assert.ok(html.includes("conversation-image"));
  assert.ok(!html.includes("typing-note"));
  assert.ok(!html.includes("translateY(20px)"));
});
