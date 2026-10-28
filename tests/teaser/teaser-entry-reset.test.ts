import assert from "node:assert/strict";
import { test } from "node:test";
import { mountEntry } from "../fixtures/teaser/entry-hook";

test("only a fresh top visit starts the timed introduction", () => {
  for (const [position, hash, count] of [
    [0, "", 1],
    [47, "", 1],
    [48, "", 0],
    [0, "#contacts", 0],
    [0, "#hero", 1]
  ] as const) {
    const entry = mountEntry(position, hash);
    entry.render();
    assert.equal(entry.animations(), count);
    entry.unmount();
  }
});

test("separate excursion/reset thresholds reject top jitter and rapid reversals never replay intro", () => {
  const entry = mountEntry();
  entry.render();
  for (const position of [-20, 0, 8, 9, 47]) entry.scroll(position);
  assert.equal(entry.animations(), 1);
  entry.scroll(48);
  assert.equal(entry.animations(), 2);
  entry.scroll(9);
  assert.equal(entry.animations(), 2);
  entry.scroll(8);
  assert.equal(entry.animations(), 3);
  for (const position of [0, -10, 1, 8, 9, 47, 0]) entry.scroll(position);
  assert.equal(entry.animations(), 3);
  for (const position of [100, 0, 100, 0, 5000, 8]) entry.scroll(position);
  assert.equal(entry.animations(), 9);
  assert.ok(
    entry.runs
      .slice(1)
      .every((run) =>
        run.sequence.every(([, , options]) => options.duration === 0.5)
      )
  );
  entry.unmount();
});

test("nonfinite scroll samples cannot corrupt or rearm the lifecycle", () => {
  const entry = mountEntry(Number.NaN);
  entry.render();
  for (const position of [Number.NaN, Infinity, -Infinity])
    entry.scroll(position);
  assert.equal(entry.animations(), 1);
  entry.scroll(100);
  for (const position of [Number.NaN, Infinity, -Infinity])
    entry.scroll(position);
  assert.equal(entry.animations(), 2);
  entry.scroll(8);
  for (const position of [Number.NaN, Infinity, -Infinity])
    entry.scroll(position);
  assert.equal(entry.animations(), 3);
  entry.unmount();
});
