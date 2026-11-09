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
  store.getState().ifNext();
  assert.equal(store.getState().ifActive, false);
  assert.equal(store.getState().ifIndex, 0);
  assert.equal(store.getState().regActive, false);
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
