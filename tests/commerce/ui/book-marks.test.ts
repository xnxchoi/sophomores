import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createMarkStore, type Stroke } from "../../../src/components/commerce/book3d/look-inside";

// The highlighter's saved marks (look-inside.tsx, Review-B r4): only committed strokes are ever saved; a stroke in
// flight that a pan or pinch takes back never reaches storage, even when an earlier stroke's delayed save is pending.
function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const stroke = (leaf: number): Stroke => ({ leaf, back: false, ink: "pink", points: [0.2, 0.3] });

test("save A, start B while A's save is pending, the pan undoes B, leave before the save: only A reloads", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const storage = memoryStorage();
    const marks = createMarkStore("book3d:p1:marks", storage);
    const a = stroke(1);
    marks.commit(a); // A ends: its save is pending (400 ms)
    mock.timers.tick(250); // B starts 250 ms later: painted, never committed; the pan then takes it back
    assert.deepEqual(marks.strokes(), [a], "B in flight is not a committed stroke");
    marks.flush(); // leaving the page writes the pending save at once
    assert.deepEqual(createMarkStore("book3d:p1:marks", storage).strokes(), [a]);
  } finally {
    mock.timers.reset();
  }
});

test("A's delayed save snapshots committed strokes when it fires; B is saved only once it ends as a stroke", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const storage = memoryStorage();
    const marks = createMarkStore("book3d:p1:marks", storage);
    const a = stroke(1), b = stroke(2);
    marks.commit(a);
    mock.timers.tick(400);
    assert.deepEqual(createMarkStore("book3d:p1:marks", storage).strokes(), [a]);
    marks.commit(b);
    mock.timers.tick(400);
    assert.deepEqual(createMarkStore("book3d:p1:marks", storage).strokes(), [a, b]);
  } finally {
    mock.timers.reset();
  }
});

test("no storage or a broken saved value reads as no marks", () => {
  assert.deepEqual(createMarkStore("k", null).strokes(), []);
  assert.deepEqual(createMarkStore("k", { getItem: () => "not json", setItem: () => {} }).strokes(), []);
});
