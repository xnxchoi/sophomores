import test, { describe } from "node:test";
import assert from "node:assert/strict";
import type { Payload } from "payload";
import { evaluateUserEligibility, isAccountActivated } from "@/lib/music/eligibility";
import { eventAccountKey } from "@/lib/commerce/event-account";
import { getAppleMusicPlaylist, searchAppleMusicSongs } from "@/lib/music/apple-music";
import { isAuthorizedCurator } from "@/lib/music/curator";
import type { User } from "@/payload-types";

test("catalog-only playlist reads use the developer credential and never the user library", async (t) => {
  const environment = process.env;
  let userTokenReads = 0;
  const fetch = t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    assert.equal(url, "https://api.music.apple.com/v1/catalog/kr/playlists/pl.u-catalog-only-fixture");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer fixture-dev");
    assert.equal(new Headers(init?.headers).has("Music-User-Token"), false);
    return Response.json({ data: [{ id: "pl.u-catalog-only-fixture", relationships: { tracks: {
      data: [{ id: "catalog-track", attributes: { name: "Catalog track" } }]
    } } }] });
  });
  try {
    process.env = new Proxy({ NODE_ENV: "test" } as NodeJS.ProcessEnv, {
      get(target, key, receiver) {
        if (key === "APPLE_MUSIC_USER_TOKEN") userTokenReads++;
        return Reflect.get(target, key, receiver);
      }
    });
    await assert.rejects(
      () => getAppleMusicPlaylist("https://music.apple.com/kr/playlist/p.library", undefined, { catalogOnly: true }),
      /public Apple Music catalog playlist/
    );
    await assert.rejects(
      () => getAppleMusicPlaylist("pl.u-no-credentials-fixture", undefined, { catalogOnly: true }),
      /credentials incomplete/
    );
    assert.equal(fetch.mock.callCount(), 0);
    process.env.APPLE_DEVELOPER_TOKEN = "fixture-dev";
    const playlist = await getAppleMusicPlaylist(
      "https://music.apple.com/kr/playlist/pl.u-catalog-only-fixture",
      "fixture-explicit-user-token",
      { catalogOnly: true }
    );
    assert.deepEqual(playlist.tracks.map((track) => track.id), ["catalog-track"]);
    assert.equal(fetch.mock.callCount(), 1);
    assert.equal(userTokenReads, 0, "catalog reads must not inspect the unset user-token field");
  } finally {
    process.env = environment;
  }
});

describe("Setlists & Eligibility Logic", () => {
  // Hardening C: one live admission for the setlist's event; any write is a failure.
  const admissionCounts: unknown[] = [];
  const mockPayload = {
    find: async () => ({ docs: [], totalDocs: 0 }),
    count: async ({ collection, where }: { collection: string; where: unknown }) => {
      assert.equal(collection, "commerce-admissions");
      admissionCounts.push(where);
      return { totalDocs: 1 };
    },
    update: async () => assert.fail("Eligibility never writes")
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

  test("a setlist with no event admits no one, even an activated account once flagged", async () => {
    // Owner, 23 Nov: "Nobody until set". The stored flag no longer grants anything.
    const setlist = {
      id: "setlist-1",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: "active",
      maxSlotsPerUser: 2
    };

    const user: Partial<User> = {
      id: "user-1",
      email: "guest@example.com",
      emailVerified: true,
      isPlaylistEligible: true
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

  for (const [name, change, reason] of [
    ["a draft", { status: "draft" }, "setlist_locked"],
    ["an unknown status", { status: "open" }, "setlist_locked"],
    ["an unreadable deadline", { deadline: "not-a-date" }, "deadline_passed"]
  ] as const) {
    test(`rejects submissions on ${name}`, async () => {
      const setlist = {
        id: "setlist-1",
        deadline: new Date(Date.now() + 86400000).toISOString(),
        status: "active",
        maxSlotsPerUser: 2,
        event: { id: "event-1" },
        ...change
      };
      const user: Partial<User> = { id: "user-1", email: "attendee@example.com", emailVerified: true };
      const result = await evaluateUserEligibility(mockPayload, user as User, setlist);
      assert.equal(result.isEligible, false);
      assert.equal(result.reason, reason);
      assert.equal(result.canEdit, false);
    });
  }

  test("grants 2 slots to an activated account with a live admission for the setlist's event", async () => {
    const setlist = {
      id: "setlist-1",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: "active",
      maxSlotsPerUser: 2,
      event: { id: "event-1" }
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
    // Curator authority is a verified CMS staff principal, never an email domain or a role claim.
    assert.equal(isAuthorizedCurator({ email: "staff@sophomores.co", emailVerified: true, collection: "users" }), false);
    assert.equal(isAuthorizedCurator({ role: "admin" }), false);
    assert.equal(isAuthorizedCurator({ collection: "users", role: "admin" }), false);
    assert.equal(isAuthorizedCurator({ collection: "admins", role: "admin", _strategy: "other" }), false);
    // CMS staff need the super-admin-set grant; no role is curator authority by itself.
    for (const role of ["staff", "editor", "admin"]) {
      assert.equal(isAuthorizedCurator({ collection: "admins", role, _strategy: "staff-better-auth" }), false, role);
      assert.equal(isAuthorizedCurator({ collection: "admins", role, _strategy: "staff-better-auth", setlistCurator: false }), false, role);
      assert.equal(isAuthorizedCurator({ collection: "admins", role, _strategy: "staff-better-auth", setlistCurator: true }), true, role);
    }
    assert.equal(isAuthorizedCurator({ collection: "admins", role: "staff", _strategy: "staff-better-auth", setlistCurator: "true" }), false);
    assert.equal(isAuthorizedCurator({ collection: "users", setlistCurator: true }), false);
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
      maxSlotsPerUser: 2,
      event: "event-1"
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

  test("a legacy paid order no longer grants a playlist (owner, 22 Nov: no past orders exist)", async () => {
    const setlist = {
      id: "setlist-1",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: "active",
      maxSlotsPerUser: 2,
      event: "event-1"
    };
    const buyerUser: Partial<User> = { id: "user-buyer-1", email: "buyer@example.com", emailVerified: true };
    const collections: string[] = [];
    const payloadWithOrder = {
      find: async ({ collection }: { collection: string }) => {
        collections.push(collection);
        return collection === "orders" ? { docs: [{ id: "order-1", status: "paid" }], totalDocs: 1 } : { docs: [], totalDocs: 0 };
      },
      count: async () => ({ totalDocs: 0 }),
      update: async () => assert.fail("Eligibility never writes")
    } as unknown as Payload;
    const result = await evaluateUserEligibility(payloadWithOrder, buyerUser as User, setlist);
    assert.deepEqual([result.isEligible, result.reason], [false, "ineligible_product"]);
    assert.equal(collections.includes("orders"), false);
  });

  test("only a live admission for this setlist's event and this account counts, read fresh each time", async () => {
    // Revoked tickets (status) and refunded-but-used ones (benefitReview hold) are excluded.
    admissionCounts.length = 0;
    const setlist = { id: "setlist-1", deadline: new Date(Date.now() + 86400000).toISOString(), status: "active",
      maxSlotsPerUser: 2, event: "event-1" };
    const user: Partial<User> = { id: "user-1", email: "attendee@example.com", emailVerified: true };
    await evaluateUserEligibility(mockPayload, user as User, setlist);
    await evaluateUserEligibility(mockPayload, user as User, setlist);
    const where = { and: [
      { event: { equals: "event-1" } },
      { eventAccountKey: { equals: eventAccountKey("event-1", "user-1") } },
      { status: { not_equals: "revoked" } },
      { or: [{ benefitReview: { equals: false } }, { benefitReview: { exists: false } }] }
    ] };
    assert.deepEqual(admissionCounts, [where, where]);
  });
});
