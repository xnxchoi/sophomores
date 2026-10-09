import assert from "node:assert/strict";
import { test } from "node:test";
import { launchLabel } from "../lib/teaser/motion";
test("launchLabel never invents a date for missing or malformed configuration", () => {
  const now = new Date("2026-10-02T00:00:00Z");
  for (const date of [null, "", "not-a-date"]) {
    assert.equal(launchLabel(date, now), "Date to be announced");
  }
});

test("launchLabel formats the confirmed calendar date in Seoul, not the host timezone", () => {
  const label = launchLabel(
    "2026-10-12T15:30:00Z",
    new Date("2026-10-02T00:00:00Z")
  );
  assert.match(label, /13/);
  assert.match(label, /Oct/i);
  const past = launchLabel(
    "2026-09-01T00:00:00Z",
    new Date("2026-10-02T00:00:00Z")
  );
  assert.match(past, /Sep/i);
  assert.doesNotMatch(past, /-\d+\s*days/i);
});
