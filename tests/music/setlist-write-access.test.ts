import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { Setlists } from "@/payload/collections/setlists";
import { Tracks } from "@/payload/collections/tracks";
import { withMusicGrant } from "@/payload/collections/music-grants";

// Tracks/Setlists writes run through Payload access. Payload REST and admin
// writes carry no grant, so members are refused there; only the setlist entry
// routes open a request-scoped grant for the member's own entry.
const member = {
  id: "member-1",
  collection: "users",
  email: "member@example.test"
};
const other = {
  id: "member-2",
  collection: "users",
  email: "other@example.test"
};
const staff = {
  id: "staff-1",
  collection: "admins",
  role: "staff",
  _strategy: "staff-better-auth"
};
const setlistId = "11111111-1111-4111-8111-111111111111";
const request = (user: unknown) =>
  ({ user, payloadAPI: "REST", context: {} }) as unknown as PayloadRequest;
const slotData = (overrides: Record<string, unknown> = {}) => ({
  title: "Track",
  artist: "Artist",
  setlist: setlistId,
  submittedBy: member.id,
  slotIndex: 1,
  ...overrides
});
const access = Tracks.access!;
const create = (req: PayloadRequest, data: Record<string, unknown>) =>
  access.create!({ req, data } as never);
const update = (req: PayloadRequest, data: Record<string, unknown>) =>
  access.update!({ req, data, id: "track-1" } as never);
const remove = (req: PayloadRequest) =>
  access.delete!({ req, id: "track-1" } as never);
const createGrant = (seat = 1, userId = member.id) => ({
  kind: "entry-create" as const,
  userId,
  setlistId,
  seat
});
const writeGrant = (entryId = "track-1", userId = member.id) => ({
  kind: "entry-write" as const,
  userId,
  setlistId,
  entryId
});
const grant = createGrant;

test("a member without a route grant cannot create, update or delete Tracks (REST stays staff-only)", async () => {
  for (const user of [null, member]) {
    const req = request(user);
    assert.equal(Boolean(await create(req, slotData())), false);
    assert.equal(Boolean(await update(req, { title: "Changed" })), false);
    assert.equal(Boolean(await remove(req)), false);
  }
});

test("staff keep Tracks CRUD", async () => {
  const req = request(staff);
  assert.equal(await create(req, slotData()), true);
  assert.equal(await update(req, {}), true);
  assert.equal(await remove(req), true);
});

test("a create grant admits only the member's own new entry on its seat", async () => {
  const req = request(member);
  await withMusicGrant(req, createGrant(), async () => {
    assert.equal(await create(req, slotData()), true);
    // Another owner, setlist or seat, a missing owner, or an order key is refused.
    assert.equal(await create(req, slotData({ submittedBy: other.id })), false);
    assert.equal(await create(req, slotData({ setlist: "22222222-2222-4222-8222-222222222222" })), false);
    assert.equal(await create(req, slotData({ slotIndex: 2 })), false);
    assert.equal(await create(req, slotData({ submittedBy: undefined })), false);
    assert.equal(await create(req, slotData({ "_setlist-positions_runningOrder_order": "a0" })), false);
    // A create grant is not an edit or delete grant.
    assert.equal(await update(req, { title: "Changed" }), false);
    assert.equal(await remove(req), false);
  });
});

test("a write grant admits edits and deletes of that one entry, by id and stored owner", async () => {
  const req = request(member);
  const own = { and: [
    { id: { equals: "track-1" } },
    { submittedBy: { equals: member.id } },
    { setlist: { equals: setlistId } }
  ] };
  await withMusicGrant(req, writeGrant(), async () => {
    assert.deepEqual(await update(req, { title: "Changed", note: "n" }), own);
    assert.deepEqual(await remove(req), own);
    // Owner, setlist, seat and order are never member input on an edit.
    for (const data of [{ submittedBy: other.id }, { submittedBy: member.id }, { setlist: setlistId }, { slotIndex: 1 },
      { "_setlist-positions_runningOrder_order": "a0" }])
      assert.equal(await update(req, data), false, JSON.stringify(data));
    assert.equal(await create(req, slotData()), false);
  });
});

test("a grant names one member and one request, and closes after the write", async () => {
  const req = request(member);
  const otherReq = request(member);
  await withMusicGrant(req, grant(1, other.id), async () => {
    assert.equal(
      await create(req, slotData({ submittedBy: other.id })),
      false,
      "grant user must be the request user"
    );
  });
  await withMusicGrant(req, grant(), async () => {
    assert.equal(
      Boolean(await create(otherReq, slotData())),
      false,
      "another request holds no grant"
    );
  });
  assert.equal(
    Boolean(await create(req, slotData())),
    false,
    "grant is gone after the write"
  );
  await assert.rejects(
    () =>
      withMusicGrant(req, grant(), async () => {
        throw new Error("write failed");
      }),
    /write failed/
  );
  assert.equal(
    Boolean(await create(req, slotData())),
    false,
    "grant is gone after a failed write"
  );
});

test("Setlists updates stay staff-only; a member with a staff-looking email or role is refused", async () => {
  const setlistUpdate = (req: PayloadRequest, data: Record<string, unknown>) =>
    Setlists.access!.update!({ req, data, id: setlistId } as never);
  const forged = { id: "member-3", collection: "users", email: "fixture@sophomores.co", role: "admin" };
  assert.equal(Boolean(await setlistUpdate(request(forged), { appleMusic: { playlistId: "p.x" } })), false);
  // A slot grant on the request gives no Setlists write.
  const req = request(member);
  await withMusicGrant(req, grant(), async () => {
    assert.equal(Boolean(await setlistUpdate(req, { appleMusic: { playlistId: "p.x" } })), false);
  });
  assert.equal(await setlistUpdate(request(staff), { appleMusic: { playlistId: "p.x" } }), true);
});

test("the hidden seat (slotIndex) accepts only whole seats 1 and 2", () => {
  const field = Tracks.fields.find(
    (candidate) => "name" in candidate && candidate.name === "slotIndex"
  ) as {
    validate: (value: unknown) => true | string;
  };
  for (const value of [1, 2, null, undefined])
    assert.equal(field.validate(value), true);
  for (const value of [1.5, 0.5, 0, 3, -1])
    assert.equal(typeof field.validate(value), "string");
});
