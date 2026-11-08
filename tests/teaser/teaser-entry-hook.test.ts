import assert from "node:assert/strict";
import { test } from "node:test";
import { mountEntry } from "../fixtures/teaser/entry-hook";
import { entryTokens } from "@/lib/teaser/entry-tokens";

test("returning to the top animates clean state and releases its listeners", () => {
  const entry = mountEntry(200);
  assert.deepEqual(entry.render(), entryTokens.complete);
  assert.equal(entry.animations(), 0);
  assert.deepEqual(entry.scroll(0), entryTokens.complete);
  assert.equal(entry.animations(), 1);
  entry.unmount();
  assert.equal(entry.listeners(), 0);
});

test("one native sequence owns the exact entry offsets and no notification channel", () => {
  const entry = mountEntry();
  entry.render();
  assert.equal(entry.animations(), 1);
  assert.equal(entry.runs[0].sequence.length, 5);
  assert.equal(entry.segmentFor("notification"), undefined);
  assert.equal(entry.segmentFor("layout")?.[2].at, 3);
  assert.equal(entry.segmentFor("layout")?.[2].duration, 0.5);
  entry.scroll(200);
  entry.scroll(0);
  assert.equal(entry.segmentFor("notification"), undefined);
  assert.equal(entry.segmentFor("layout")?.[2].at, 0);
  assert.equal(entry.segmentFor("layout")?.[2].duration, 0.5);
  entry.unmount();
});

test("scrolling away from clean state animates without replaying the introduction", () => {
  const entry = mountEntry(200);
  entry.render();
  assert.deepEqual(entry.scroll(0), entryTokens.complete);
  assert.deepEqual(entry.scroll(200), entryTokens.complete);
  assert.equal(entry.animations(), 2);
  assert.ok(
    entry.runs.every((run) =>
      run.sequence.every(([, , options]) => options.duration === 0.5)
    )
  );
  entry.unmount();
});

test("cold loads animate once while deep links start settled", () => {
  const cold = mountEntry();
  cold.render();
  assert.equal(cold.animations(), 1);
  cold.unmount();
  const deep = mountEntry(0, "#contacts");
  assert.deepEqual(deep.render(), entryTokens.complete);
  assert.equal(deep.animations(), 0);
  deep.unmount();
});

test("visibility controls the entire native sequence and never restarts a finished intro", () => {
  const entry = mountEntry();
  entry.render();
  const run = entry.runs[0];
  entry.visibility("hidden");
  assert.equal(run.control.state, "paused");
  entry.visibility("visible");
  assert.equal(run.control.state, "running");
  run.finish();
  entry.visibility("hidden");
  entry.visibility("visible");
  assert.equal(run.control.state, "finished");
  entry.unmount();
  assert.equal(run.control.state, "stopped");
});

test("interruption stops the prior sequence; late completion and effect replay cannot restart intro", () => {
  const entry = mountEntry();
  entry.render();
  const intro = entry.runs[0];
  entry.scroll(100);
  assert.equal(intro.control.state, "stopped");
  intro.finish();
  entry.scroll(0);
  entry.render();
  assert.equal(entry.runs.length, 3);
  assert.ok(
    entry.runs
      .slice(1)
      .every((run) =>
        run.sequence.every(([, , options]) => options.duration === 0.5)
      )
  );
  entry.unmount();
});
