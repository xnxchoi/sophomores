import assert from "node:assert/strict";
import test from "node:test";
import { createCursorStore } from "@/stores/Cursor/CursorStore";

test("direct site entry starts with an idle cursor, not an unfinished preloader", () => {
  const store = createCursorStore();
  assert.equal(store.getState().cursorState, null);
  assert.equal(store.getState().marquee, false);
});

test("actual tasks can still explicitly show and clear a busy cursor", () => {
  const store = createCursorStore();
  store.getState().setCursorState("LOADING...");
  assert.equal(store.getState().cursorState, "LOADING...");
  store.getState().setCursorState(null);
  assert.equal(store.getState().cursorState, null);
});
