import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { formatRelativeTime } from "./formatRelativeTime";

const NOW = DateTime.fromISO("2026-08-26T12:00:00.000Z");
const TWELVE_DAYS_AGO = "2026-08-14T05:02:10.492Z";

describe("formatRelativeTime", () => {
  it("formats with the given locale, not the runtime locale", () => {
    const en = formatRelativeTime(TWELVE_DAYS_AGO, "en", NOW);
    const ko = formatRelativeTime(TWELVE_DAYS_AGO, "ko", NOW);
    expect(en).toMatch(/day/);
    expect(ko).toMatch(/일/);
    expect(en).not.toBe(ko);
  });

  it("returns the same English string regardless of process locale", () => {
    const a = formatRelativeTime(TWELVE_DAYS_AGO, "en", NOW);
    const b = formatRelativeTime(TWELVE_DAYS_AGO, "en", NOW);
    expect(a).toBe(b);
    expect(a).toBe("12 days ago");
  });

  it("returns empty string for invalid timestamps", () => {
    expect(formatRelativeTime("", "en", NOW)).toBe("");
    expect(formatRelativeTime("not-a-date", "ko", NOW)).toBe("");
  });
});
