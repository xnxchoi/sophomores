import assert from "node:assert/strict";
import test from "node:test";
import { createStepQueue } from "../lib/teaser/step-queue";

function harness(mode: "adjacent" | "latest" = "adjacent") {
  const flights: { to: number; finish: () => void; stopped: boolean; paused: boolean }[] = [];
  const settlements: boolean[] = [];
  const snaps: number[] = [];
  const queue = createStepQueue(0, {
    start(to, finish) {
      const flight = { to, finish, stopped: false, paused: false };
      flights.push(flight);
      return {
        stop: () => { flight.stopped = true; },
        pause: () => { flight.paused = true; },
        play: () => { flight.paused = false; },
      };
    },
    display: () => {},
    snap: (to) => snaps.push(to),
    settle: (value) => settlements.push(value),
  }, mode);
  return { queue, flights, settlements, snaps };
}

test("latest mode moves directly to the requested card without intermediate holds", () => {
  const { queue, flights, settlements } = harness("latest");
  queue.seek(3);
  assert.deepEqual(flights.map(({ to }) => to), [3]);
  queue.seek(3);
  assert.equal(flights.length, 1);
  flights[0].finish();
  assert.equal(settlements.at(-1), true);
});

test("latest mode reverses immediately even back to the last completed card", () => {
  const { queue, flights, settlements } = harness("latest");
  queue.seek(3);
  queue.seek(0);
  assert.equal(flights[0].stopped, true);
  assert.deepEqual(flights.map(({ to }) => to), [3, 0]);
  flights[0].finish();
  assert.equal(settlements.at(-1), false);
  assert.equal(flights.length, 2);
  flights[1].finish();
  assert.equal(settlements.at(-1), true);
});

test("latest retargets retain visibility pause and invalidate work on snap or disposal", () => {
  const { queue, flights, snaps, settlements } = harness("latest");
  queue.setPaused(true);
  queue.seek(3);
  queue.seek(1);
  assert.ok(flights.every((flight) => flight.paused));
  queue.setPaused(false);
  assert.equal(flights[1].paused, false);
  queue.seek(0, true);
  flights[1].finish();
  assert.deepEqual(snaps, [0]);
  assert.equal(settlements.at(-1), true);
  queue.seek(2);
  queue.dispose();
  flights[2].finish();
  queue.seek(3);
  assert.equal(flights.length, 3);
  assert.equal(flights[2].stopped, true);
});

test("target changes finish the current adjacent tween before following the latest destination", () => {
  const { queue, flights, settlements } = harness();
  queue.seek(3);
  queue.seek(2);
  assert.deepEqual(flights.map(({ to }) => to), [1]);
  assert.equal(flights[0].stopped, false);
  flights[0].finish();
  assert.deepEqual(flights.map(({ to }) => to), [1, 2]);
  flights[1].finish();
  assert.equal(settlements.at(-1), true);
});

test("reversal starts from the exact completed index, not a rounded intermediate pose", () => {
  const { queue, flights } = harness();
  queue.seek(3);
  queue.seek(0);
  flights[0].finish();
  assert.deepEqual(flights.map(({ to }) => to), [1, 0]);
  flights[1].finish();
  assert.equal(flights.length, 2);
});

test("endpoint or still snap invalidates stale completions", () => {
  const { queue, flights, snaps, settlements } = harness();
  queue.seek(3);
  queue.seek(3, true);
  assert.equal(flights[0].stopped, true);
  assert.deepEqual(snaps, [3]);
  flights[0].finish();
  assert.equal(flights.length, 1);
  assert.equal(settlements.at(-1), true);
  queue.seek(1);
  assert.equal(flights[1].to, 2);
});

test("visibility pause applies to current and subsequent motion; dispose rejects stale work", () => {
  const { queue, flights } = harness();
  queue.setPaused(true);
  queue.seek(2);
  assert.equal(flights[0].paused, true);
  queue.setPaused(false);
  assert.equal(flights[0].paused, false);
  queue.dispose();
  flights[0].finish();
  queue.seek(3);
  assert.equal(flights[0].stopped, true);
  assert.equal(flights.length, 1);
});

test("an already settled destination does not create a redundant tween", () => {
  const { queue, flights, settlements } = harness();
  queue.seek(0);
  assert.equal(flights.length, 0);
  assert.equal(settlements.at(-1), true);
});
