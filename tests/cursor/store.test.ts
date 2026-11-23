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

// The book's Look inside claims the cursor (Review-B r1, book cursor): its fade belongs to its own claim, and it releases
// only what it still holds.
test("a claim's fade exit never applies to another owner's label, and release is compare-and-release", () => {
  const store = createCursorStore();
  const book = {};
  store.getState().claimCursor(book, "Look inside", "fade");
  assert.equal(store.getState().cursorExit, "fade");
  store.getState().setCursorState("FOCUS"); // the pointer moves onto a button
  assert.equal(store.getState().cursorExit, "instant");
  store.getState().releaseCursor(book); // the book's late release must not clear the button's state
  assert.equal(store.getState().cursorState, "FOCUS");
  store.getState().claimCursor(book, "Look inside", "fade");
  store.getState().releaseCursor(book);
  assert.equal(store.getState().cursorState, null);
  assert.equal(store.getState().cursorExit, "fade", "the leaving pill keeps its fade");
  store.getState().setCursorState("Next");
  assert.equal(store.getState().cursorExit, "instant");
});
