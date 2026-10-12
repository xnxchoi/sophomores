import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createEntryState,
  updateEntryState
} from "../lib/teaser/entry-controller";
import { entryTokens } from "../lib/teaser/entry-tokens";

test("only a fresh top visit starts the timed introduction", () => {
  assert.equal(createEntryState(0, false), "initial");
  assert.equal(createEntryState(47, false), "initial");
  assert.equal(createEntryState(48, false), "away");
  assert.equal(createEntryState(0, true), "away");
});

test("returning from a meaningful excursion resets and remains clean indefinitely", () => {
  let state = updateEntryState("initial", 48);
  assert.equal(state, "away");
  state = updateEntryState(state, 8);
  assert.equal(state, "clean");
  for (const position of [0, -10, 1, 8, 9, 47, 0]) {
    state = updateEntryState(state, position);
    assert.equal(state, "clean");
  }
  assert.equal(updateEntryState(state, 48), "away");
});

test("top jitter does not cancel first-load timing or rearm a clean introduction", () => {
  for (const position of [-20, 0, 8, 9, 47]) {
    assert.equal(updateEntryState("initial", position), "initial");
    assert.equal(updateEntryState("clean", position), "clean");
  }
  assert.equal(updateEntryState("away", 9), "away");
});

test("rapid down-up-down transitions remain reversible without timed replays", () => {
  let state = createEntryState(0, false);
  const states = [100, 0, 100, 0, 5000, 8].map((position) => {
    state = updateEntryState(state, position);
    return state;
  });
  assert.deepEqual(states, ["away", "clean", "away", "clean", "away", "clean"]);
});

test("nonfinite scroll samples cannot corrupt or rearm the lifecycle", () => {
  assert.equal(createEntryState(Number.NaN, false), "initial");
  for (const state of ["initial", "away", "clean"] as const) {
    for (const position of [Number.NaN, Infinity, -Infinity]) {
      assert.equal(updateEntryState(state, position), state);
    }
  }
});

test("reset retains the settled post-entry layout with notifications owned only by scroll", () => {
  assert.equal("notification" in entryTokens.clean, false);
  assert.equal(entryTokens.clean.dock, 1);
  assert.equal(entryTokens.clean.scale, 1);
  assert.equal(entryTokens.clean.layout, 1);
  assert.equal(entryTokens.clean.backdrop, 1);
  assert.equal(entryTokens.clean.glyph, 1);
  assert.ok(entryTokens.return.duration > 0);
  assert.ok(entryTokens.return.duration < entryTokens.layout.delay);
});
