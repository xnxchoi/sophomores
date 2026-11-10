import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { evaluateUserEligibility } from "@/lib/music/eligibility";
import { searchAppleMusicSongs } from "@/lib/music/apple-music";
import type { User } from "@/payload-types";

describe("Setlists & Eligibility Logic", () => {
  const mockPayload = {
    find: async () => ({ docs: [], totalDocs: 0 })
  } as any;

  test("rejects unauthenticated users", async () => {
    const setlist = {
      id: "setlist-1",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: "active",
      maxSlotsPerUser: 2
    };

    const result = await evaluateUserEligibility(mockPayload, null, setlist);
    assert.equal(result.isEligible, false);
    assert.equal(result.reason, "unauthenticated");
    assert.equal(result.canEdit, false);
  });

  test("rejects users without playlist eligibility flag", async () => {
    const setlist = {
      id: "setlist-1",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: "active",
      maxSlotsPerUser: 2
    };

    const user: Partial<User> = {
      id: "user-1",
      email: "guest@example.com",
      isPlaylistEligible: false
    };

    const result = await evaluateUserEligibility(mockPayload, user as User, setlist);
    assert.equal(result.isEligible, false);
    assert.equal(result.reason, "ineligible_product");
    assert.equal(result.canEdit, false);
  });

  test("rejects submissions when deadline has elapsed", async () => {
    const setlist = {
      id: "setlist-1",
      deadline: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      status: "active",
      maxSlotsPerUser: 2
    };

    const user: Partial<User> = {
      id: "user-1",
      email: "attendee@example.com",
      isPlaylistEligible: true
    };

    const result = await evaluateUserEligibility(mockPayload, user as User, setlist);
    assert.equal(result.isEligible, false);
    assert.equal(result.reason, "deadline_passed");
    assert.equal(result.canEdit, false);
  });

  test("rejects submissions when setlist status is locked", async () => {
    const setlist = {
      id: "setlist-1",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: "locked",
      maxSlotsPerUser: 2
    };

    const user: Partial<User> = {
      id: "user-1",
      email: "attendee@example.com",
      isPlaylistEligible: true
    };

    const result = await evaluateUserEligibility(mockPayload, user as User, setlist);
    assert.equal(result.isEligible, false);
    assert.equal(result.reason, "setlist_locked");
    assert.equal(result.canEdit, false);
  });

  test("grants 2 slots to eligible users with an active setlist", async () => {
    const setlist = {
      id: "setlist-1",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: "active",
      maxSlotsPerUser: 2
    };

    const user: Partial<User> = {
      id: "user-1",
      email: "attendee@example.com",
      isPlaylistEligible: true
    };

    const result = await evaluateUserEligibility(mockPayload, user as User, setlist);
    assert.equal(result.isEligible, true);
    assert.equal(result.maxSlots, 2);
    assert.equal(result.usedSlots, 0);
    assert.equal(result.canEdit, true);
  });

  test("falls back to dev mock search catalog when Apple credentials are unconfigured", async () => {
    const results = await searchAppleMusicSongs("Ambient", 3);
    assert.ok(Array.isArray(results));
    assert.equal(results.length, 3);
    assert.equal(results[0].provider, "apple_music");
    assert.ok(results[0].title.includes("Ambient"));
    assert.ok(results[0].isrc);
  });
});
