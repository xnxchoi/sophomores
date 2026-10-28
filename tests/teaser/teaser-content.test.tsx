import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chapters,
  messages,
  principles,
  stories,
  teaser,
  values
} from "../../lib/teaser/content";

test("teaser identifies the club without inventing a confirmed launch date", () => {
  assert.equal(teaser.name, "sophomores");
  assert.equal(teaser.domain, "sophomores.co");
  assert.equal(teaser.launchAt, null);
  assert.equal(teaser.launchHint, "In ~10 days");
});

test("chapter navigation follows the complete intended narrative order", () => {
  assert.deepEqual(
    chapters.map(({ id }) => id),
    ["hero", "origin", "how", "strategy", "people", "contacts"]
  );
  assert.equal(new Set(chapters.map(({ id }) => id)).size, chapters.length);
  for (const chapter of chapters) {
    assert.ok(
      chapter.label.trim().length > 0,
      `${chapter.id} needs an accessible label`
    );
  }
});

test("the origin story has four complete cards with distinct titles", () => {
  assert.equal(stories.length, 4);
  assert.equal(new Set(stories.map(({ title }) => title)).size, stories.length);
  for (const story of stories) {
    assert.ok(story.title.trim().length > 0);
    assert.ok(story.body.trim().length > 0);
    assert.ok(story.tone.trim().length > 0);
  }
});

test("the three principles have display copy and explicit color identities", () => {
  assert.equal(principles.length, 3);
  for (const principle of principles) {
    assert.ok(principle.title.trim().length > 0);
    assert.ok(principle.body.trim().length > 0);
    assert.ok(principle.color.trim().length > 0);
  }
});

test("the message sequence has three attributed, nonempty messages", () => {
  assert.equal(messages.length, 3);
  for (const message of messages) {
    assert.ok(message.from.trim().length > 0);
    assert.ok(message.text.trim().length > 0);
  }
});

test("the values section has three illustrated content entries", () => {
  assert.equal(values.length, 3);
  for (const value of values) {
    assert.ok(value.image.trim().length > 0);
    assert.ok(value.body.trim().length > 0);
  }
});
