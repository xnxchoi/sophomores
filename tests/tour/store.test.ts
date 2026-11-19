import assert from "node:assert/strict";
import { test } from "node:test";
import { createTourStore } from "../../src/stores/Tour/TourStore";

test("interface tour preserves navigation bounds and close behavior", () => {
  const store = createTourStore();
  store.getState().openInterfaceTour();
  assert.equal(store.getState().ifActive, true);
  store.getState().ifPrev();
  assert.equal(store.getState().ifIndex, 0);
  store.getState().ifGoTo(999);
  assert.equal(store.getState().ifIndex, store.getState().ifTargets.length - 1);
  const last = store.getState().ifTargets.length - 1;
  // Done closes, and the dialog keeps the last step through its exit instead of flashing step 1.
  store.getState().ifNext();
  assert.equal(store.getState().ifActive, false);
  assert.equal(store.getState().ifIndex, last);
  assert.equal(store.getState().regActive, false);
  // Reopening always starts at step 1.
  store.getState().openInterfaceTour();
  assert.equal(store.getState().ifActive, true);
  assert.equal(store.getState().ifIndex, 0);
});

test("closing mid-guide keeps the step until the guide is reopened", () => {
  const store = createTourStore();
  store.getState().openInterfaceTour();
  store.getState().ifNext();
  assert.equal(store.getState().ifIndex, 1);
  store.getState().closeInterfaceTour();
  assert.equal(store.getState().ifActive, false);
  assert.equal(store.getState().ifIndex, 1);
  store.getState().openInterfaceTour();
  assert.equal(store.getState().ifIndex, 0);
});

test("tour target and dismiss registries preserve previous snapshots", () => {
  const store = createTourStore();
  const before = store.getState();
  store.getState().markSessionDismissed("seen");
  assert.equal(before.sessionDismissed.has("seen"), false);
  assert.equal(store.getState().hasSessionDismissed("seen"), true);
  store.getState().registerTarget({ id: "target", label: "Target", element: {} as HTMLElement });
  assert.equal(before.targetRegistry.size, 0);
  const registered = store.getState().targetRegistry;
  store.getState().unregisterTarget("target");
  assert.equal(registered.size, 1);
  assert.equal(store.getState().targetRegistry.size, 0);
});
