/**
 * Tests for the notification mutation cache surgery — the heart of the
 * race-condition fixes. Coverage:
 *
 *  - Pure optimistic mutators (markRead, dismiss, readAll) for shape
 *    correctness.
 *  - matchesUserKey predicate boundaries (wrong slug, undefined user,
 *    nested arrays, etc.).
 *  - Snapshot/restore round-trip on a real QueryClient — confirms a
 *    failed mutation lands the cache back at S0 even when the cache
 *    contains multiple query-key variants per user.
 *  - The concurrent-mutation interleave scenario that motivated adding
 *    `scope: { id: "notifications" }` — verifies that, when mutations
 *    are run sequentially (as the scope forces), the snapshot/restore
 *    pattern produces the correct rollback path. The scope itself
 *    serializes at the framework level; we test the underlying
 *    primitives that the scope protects.
 */

import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { SyncedNotification } from "@/payload/collections/Notifications/hooks/types";
import {
  buildNotifyKey,
  matchesUserKey,
  updateAllUserLists,
  snapshotAllUserLists,
  restoreSnapshot,
  markReadOptimistic,
  dismissOptimistic,
  readAllOptimistic
} from "./mutations";

const makeNotif = (
  id: string,
  flags: Partial<Pick<SyncedNotification, "read" | "dismissed" | "status">> = {}
): SyncedNotification =>
  ({
    id,
    title: `n-${id}`,
    content: `c-${id}`,
    type: "system",
    importance: 0,
    sticky: false,
    read: flags.read ?? false,
    dismissed: flags.dismissed ?? false,
    status: flags.status ?? "unread",
    readAt: null,
    recipient: "u1",
    trigger: null,
    thumbnail: null,
    actionLink: { type: "custom", url: "/" } as never,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    fallbackImage: null
  }) as SyncedNotification;

const NOW = "2024-06-15T10:00:00.000Z";

/* ── Pure mutators ───────────────────────────────────────────────── */

describe("markReadOptimistic", () => {
  it("flips read+readAt+status for matching ids only", () => {
    const prev = [makeNotif("1"), makeNotif("2"), makeNotif("3")];
    const next = markReadOptimistic(["1", "3"], NOW)(prev);
    expect(next[0].read).toBe(true);
    expect(next[0].readAt).toBe(NOW);
    expect(next[0].status).toBe("read");
    expect(next[1].read).toBe(false); // untouched
    expect(next[2].read).toBe(true);
  });

  it("is a no-op for items already read (preserves existing readAt)", () => {
    const earlier = "2024-06-15T09:00:00.000Z";
    const prev = [
      {
        ...makeNotif("1", { read: true, status: "read" }),
        readAt: earlier
      } as SyncedNotification
    ];
    const next = markReadOptimistic(["1"], NOW)(prev);
    expect(next[0]).toBe(prev[0]); // referential equality preserved — no rewrite
  });

  it("does not mutate the input array", () => {
    const prev = [makeNotif("1")];
    markReadOptimistic(["1"], NOW)(prev);
    expect(prev[0].read).toBe(false);
  });
});

describe("dismissOptimistic", () => {
  it("flips dismissed+read+status, preserving existing readAt if present", () => {
    const earlier = "2024-06-15T09:00:00.000Z";
    const prev = [
      {
        ...makeNotif("1", { read: true, status: "read" }),
        readAt: earlier
      } as SyncedNotification,
      makeNotif("2")
    ];
    const next = dismissOptimistic(["1", "2"], NOW)(prev);
    expect(next[0].dismissed).toBe(true);
    expect(next[0].status).toBe("dismissed");
    expect(next[0].readAt).toBe(earlier); // preserved
    expect(next[1].dismissed).toBe(true);
    expect(next[1].read).toBe(true);
    expect(next[1].readAt).toBe(NOW); // stamped (was null)
  });

  it("dismisses already-read items idempotently", () => {
    const prev = [makeNotif("1", { read: true, status: "read" })];
    const next = dismissOptimistic(["1"], NOW)(prev);
    expect(next[0].dismissed).toBe(true);
    expect(next[0].status).toBe("dismissed");
  });
});

describe("readAllOptimistic", () => {
  it("flips every unread; leaves already-read items untouched", () => {
    const prev = [
      makeNotif("1"),
      makeNotif("2", { read: true, status: "read" }),
      makeNotif("3")
    ];
    const next = readAllOptimistic(NOW)(prev);
    expect(next[0].read).toBe(true);
    expect(next[1]).toBe(prev[1]); // already read — referential equality
    expect(next[2].read).toBe(true);
  });
});

/* ── matchesUserKey predicate ────────────────────────────────────── */

describe("matchesUserKey", () => {
  it("matches the canonical key shape", () => {
    expect(matchesUserKey(["NOTIFY", { user: "u1" }, ""], "u1")).toBe(true);
    expect(
      matchesUserKey(["NOTIFY", { user: "u1" }, "?filter=unread"], "u1")
    ).toBe(true);
  });

  it("rejects mismatched slugs", () => {
    expect(matchesUserKey(["OTHER", { user: "u1" }], "u1")).toBe(false);
  });

  it("rejects mismatched users", () => {
    expect(matchesUserKey(["NOTIFY", { user: "u2" }], "u1")).toBe(false);
  });

  it("rejects shapes without a user object", () => {
    expect(matchesUserKey(["NOTIFY", "u1"], "u1")).toBe(false);
    expect(matchesUserKey(["NOTIFY", null], "u1")).toBe(false);
    expect(matchesUserKey(["NOTIFY"], "u1")).toBe(false);
  });
});

/* ── QueryClient round-trips ─────────────────────────────────────── */

describe("snapshot + restore round-trip", () => {
  it("restores every user-scoped list to its pre-mutation state", () => {
    const qc = new QueryClient();
    const user = "u1";

    // Seed two query-string variants (e.g. "all" and "unread" tab).
    qc.setQueryData(["NOTIFY", { user }, ""], [makeNotif("1"), makeNotif("2")]);
    qc.setQueryData(
      ["NOTIFY", { user }, "?filter=unread"],
      [makeNotif("1"), makeNotif("2")]
    );

    const snapshot = snapshotAllUserLists(qc, user);
    expect(snapshot.length).toBe(2);

    // Apply optimistic dismiss.
    updateAllUserLists(qc, user, dismissOptimistic(["1"], NOW));

    // Both variants reflect the optimistic update.
    expect(
      (qc.getQueryData(["NOTIFY", { user }, ""]) as SyncedNotification[])[0]
        .dismissed
    ).toBe(true);
    expect(
      (
        qc.getQueryData([
          "NOTIFY",
          { user },
          "?filter=unread"
        ]) as SyncedNotification[]
      )[0].dismissed
    ).toBe(true);

    // Restore.
    restoreSnapshot(qc, snapshot);

    expect(
      (qc.getQueryData(["NOTIFY", { user }, ""]) as SyncedNotification[])[0]
        .dismissed
    ).toBe(false);
    expect(
      (
        qc.getQueryData([
          "NOTIFY",
          { user },
          "?filter=unread"
        ]) as SyncedNotification[]
      )[0].dismissed
    ).toBe(false);
  });

  it("scopes operations to the target user — does not touch other users' lists", () => {
    const qc = new QueryClient();
    qc.setQueryData(["NOTIFY", { user: "u1" }, ""], [makeNotif("1")]);
    qc.setQueryData(["NOTIFY", { user: "u2" }, ""], [makeNotif("2")]);

    updateAllUserLists(qc, "u1", dismissOptimistic(["1"], NOW));

    expect(
      (
        qc.getQueryData(["NOTIFY", { user: "u1" }, ""]) as SyncedNotification[]
      )[0].dismissed
    ).toBe(true);
    expect(
      (
        qc.getQueryData(["NOTIFY", { user: "u2" }, ""]) as SyncedNotification[]
      )[0].dismissed
    ).toBe(false);
  });
});

/* ── Concurrent-mutation interleave (sequential, as `scope` forces) ── */

describe("sequential-mutation rollback (scope-protected order)", () => {
  it("two failed dismisses in sequence restore S0, not S1", () => {
    // Models the typescript-reviewer's HIGH#2 scenario, run with the
    // mutation queue serialized by `scope` so D2 sees S1 only AFTER
    // D1 has either resolved or restored.
    const qc = new QueryClient();
    const user = "u1";
    qc.setQueryData(["NOTIFY", { user }, ""], [makeNotif("1")]);

    // Action D1
    const snapshotD1 = snapshotAllUserLists(qc, user);
    updateAllUserLists(qc, user, dismissOptimistic(["1"], NOW));
    // D1 errors; restore S0.
    restoreSnapshot(qc, snapshotD1);

    // Action D2 runs *after* D1's rollback.
    const snapshotD2 = snapshotAllUserLists(qc, user);
    updateAllUserLists(qc, user, dismissOptimistic(["1"], NOW));
    // D2 errors; restore the just-captured (clean) snapshot.
    restoreSnapshot(qc, snapshotD2);

    const final = qc.getQueryData([
      "NOTIFY",
      { user },
      ""
    ]) as SyncedNotification[];
    expect(final[0].dismissed).toBe(false); // back to S0
    expect(final[0].read).toBe(false);
  });

  it("dismiss after read (sequential) lands as dismissed=true read=true", () => {
    const qc = new QueryClient();
    const user = "u1";
    qc.setQueryData(["NOTIFY", { user }, ""], [makeNotif("1")]);

    // Read first.
    updateAllUserLists(qc, user, markReadOptimistic(["1"], NOW));
    let cur = qc.getQueryData(["NOTIFY", { user }, ""]) as SyncedNotification[];
    expect(cur[0].read).toBe(true);
    expect(cur[0].dismissed).toBe(false);

    // Then dismiss.
    updateAllUserLists(qc, user, dismissOptimistic(["1"], NOW));
    cur = qc.getQueryData(["NOTIFY", { user }, ""]) as SyncedNotification[];
    expect(cur[0].read).toBe(true);
    expect(cur[0].dismissed).toBe(true);
    expect(cur[0].status).toBe("dismissed");
  });
});

describe("buildNotifyKey", () => {
  it("returns the canonical 2-tuple key (queryString appended by caller)", () => {
    expect(buildNotifyKey("u1")).toEqual(["NOTIFY", { user: "u1" }]);
  });
});
