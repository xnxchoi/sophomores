import test, { describe } from "node:test";
import assert from "node:assert/strict";
import type { Payload } from "payload";
import { evaluateUserEligibility, isAccountActivated } from "@/lib/music/eligibility";
import { searchAppleMusicSongs } from "@/lib/music/apple-music";
import { isAuthorizedCurator } from "@/lib/music/curator";
import type { User } from "@/payload-types";

describe("Setlists & Eligibility Logic", () => {
  const mockPayload = {
    find: async () => ({ docs: [], totalDocs: 0 }),
    update: async () => ({})
  } as unknown as Payload;

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
      emailVerified: true,
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
      emailVerified: true,
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
      emailVerified: true,
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

  test("identifies authorized curators correctly", () => {
    assert.equal(isAuthorizedCurator(null), false);
    assert.equal(isAuthorizedCurator({ email: "attendee@gmail.com", role: "customer" }), false);
    assert.equal(isAuthorizedCurator({ email: "staff@sophomores.co" }), true);
    assert.equal(isAuthorizedCurator({ email: "seanschoi@sophomores.co" }), true);
    assert.equal(isAuthorizedCurator({ email: "seanschoi@lostinseoul.com" }), true);
    assert.equal(isAuthorizedCurator({ role: "admin" }), true);
  });

  test("validates account activation criteria correctly", () => {
    assert.equal(isAccountActivated(null), false);
    // Unactivated / placeholder accounts
    assert.equal(
      isAccountActivated({ email: "unactivated-gift-92938@sophomores.co", emailVerified: true } as User),
      false
    );
    assert.equal(
      isAccountActivated({ email: "guest@placeholder.sophomores.co", emailVerified: true } as User),
      false
    );
    assert.equal(
      isAccountActivated({ email: "user@example.com", phoneNumber: "invalid-phone", emailVerified: true } as User),
      false
    );
    // Unverified account
    assert.equal(
      isAccountActivated({ email: "guest@example.com", emailVerified: false } as User),
      false
    );
    // Suspended account
    assert.equal(
      isAccountActivated({ email: "guest@example.com", emailVerified: true, membershipStatus: "suspended" } as User),
      false
    );
    // Verified account
    assert.equal(
      isAccountActivated({ email: "guest@example.com", emailVerified: true } as User),
      true
    );
    // Phone verified account
    assert.equal(
      isAccountActivated({ email: "guest@example.com", phoneNumberVerified: true } as User),
      true
    );
  });

  test("rejects ticket holders whose account is unactivated", async () => {
    const setlist = {
      id: "setlist-1",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: "active",
      maxSlotsPerUser: 2
    };

    // User has a bound ticket, but their account is in unactivated gift state
    const unactivatedUser: Partial<User> = {
      id: "user-gift-1",
      email: "unactivated-gift-102@sophomores.co",
      isPlaylistEligible: true
    };

    const result = await evaluateUserEligibility(mockPayload, unactivatedUser as User, setlist);
    assert.equal(result.isEligible, false);
    assert.equal(result.reason, "account_unactivated");
    assert.equal(result.canEdit, false);
  });

  test("grants eligibility when ticket is bound via paid order and account is activated", async () => {
    const setlist = {
      id: "setlist-1",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: "active",
      maxSlotsPerUser: 2
    };

    const buyerUser: Partial<User> = {
      id: "user-buyer-1",
      email: "buyer@example.com",
      emailVerified: true,
      isPlaylistEligible: false // Not yet explicitly flagged on doc
    };

    const payloadWithOrder = {
      find: async ({ collection }: { collection: string }) => {
        if (collection === "orders") {
          return { docs: [{ id: "order-1", status: "paid" }], totalDocs: 1 };
        }
        return { docs: [], totalDocs: 0 };
      },
      update: async () => ({})
    } as unknown as Payload;

    const result = await evaluateUserEligibility(payloadWithOrder, buyerUser as User, setlist);
    assert.equal(result.isEligible, true);
    assert.equal(result.maxSlots, 2);
    assert.equal(result.canEdit, true);
  });
});
