import assert from "node:assert/strict";
import test from "node:test";
import { createStepQueue } from "../lib/teaser/step-queue";

function harness() {
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
  });
  return { queue, flights, settlements, snaps };
}

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
