import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";
import type { CollectionConfig, Payload } from "payload";
import type { Pool } from "pg";

// Opt-in real-PostgreSQL proof (tests/support/database-proof.mjs). Disposable
// loopback container created for this proof only and removed afterwards. No
// application .env or DATABASE_URI is read. push:true proves the schema the
// collection configs declare, not that the generated push:false migration applies.
const target = {
  container: "sphmrs-setlist-slots-20261122",
  port: 55492,
  database: "setlist_slots_proof"
};
const databaseURL = `postgres://postgres@127.0.0.1:${target.port}/${target.database}`;
const seatIndexPath = "setlist_id, submitted_by_id, slot_index";
const orderKey = "_setlist-positions_runningOrder_order";
const orderColumn = "_setlist_positions_runningorder_order";

test(
  "setlist entries: fixed identity, staff running order apart from the entry, two-entry cap, dirty flag",
  { skip: process.env.SETLIST_SLOTS_DATABASE_TESTS !== "1", timeout: 240_000 },
  async (t) => {
    // Fail before schema creation unless Docker still identifies the owned disposable target.
    const inspected = JSON.parse(
      execFileSync("docker", ["inspect", target.container], {
        encoding: "utf8",
        maxBuffer: 65536
      })
    ) as Array<{
      Name: string;
      State: { Running: boolean };
      Config: { Env: string[] };
    }>;
    assert.equal(inspected.length, 1);
    assert.equal(inspected[0].Name, `/${target.container}`);
    assert.equal(inspected[0].State.Running, true);
    assert.equal(
      inspected[0].Config.Env.includes(`POSTGRES_DB=${target.database}`),
      true
    );

    const { buildConfig, createLocalReq, getPayload } = await import("payload");
    const { postgresAdapter } = await import("@payloadcms/db-postgres");
    const { Setlists } = await import("../../src/payload/collections/setlists");
    const { SetlistPositions } =
      await import("../../src/payload/collections/setlist-positions");
    const { Tracks } = await import("../../src/payload/collections/tracks");
    const { withMusicGrant } =
      await import("../../src/payload/collections/music-grants");
    const { capturePayloadTestLifecycle } =
      await import("../support/payload-lifecycle");
    // Payload's own fractional key generator (keys the reorder endpoint would write).
    const { generateKeyBetween } = (await import(
      new URL(
        "./config/orderable/fractional-indexing.js",
        pathToFileURL(createRequire(import.meta.url).resolve("payload"))
      ).href
    )) as {
      generateKeyBetween: (a: string | null, b: string | null) => string;
    };
    const keyAfter = (key: string, next?: string) =>
      generateKeyBetween(key, next ?? null);

    // Fixture-only failure after the dirty-flag SQL write, inside its transaction.
    let failDirtyFlag = false;
    const setlists: CollectionConfig = Setlists;
    const config = await buildConfig({
      secret: randomUUID(),
      telemetry: false,
      admin: { user: "users", disable: true },
      typescript: { autoGenerate: false },
      db: postgresAdapter({
        pool: {
          connectionString: databaseURL,
          max: 6,
          connectionTimeoutMillis: 5000,
          options:
            "-c statement_timeout=15000 -c idle_in_transaction_session_timeout=15000"
        },
        idType: "uuid",
        push: true,
        migrationDir: "tests/music"
      }),
      collections: [
        { slug: "users", auth: true, fields: [{ name: "name", type: "text" }] },
        { slug: "albums", fields: [{ name: "title", type: "text" }] },
        { slug: "tags", fields: [{ name: "title", type: "text" }] },
        setlists,
        SetlistPositions,
        Tracks
      ]
    });
    const payload: Payload = await getPayload({ config, key: randomUUID() });
    t.after(capturePayloadTestLifecycle(payload));
    // Fixture-only fault: the single-column dirty-flag write fails after the
    // track row is written, inside the same transaction.
    const adapter = payload.db as unknown as { updateOne: (args: { collection: string }) => Promise<unknown> };
    const updateOne = adapter.updateOne.bind(adapter);
    adapter.updateOne = async (args) => {
      if (failDirtyFlag && args.collection === "setlists") throw new Error("Synthetic dirty-flag failure");
      return updateOne(args);
    };
    // The proof config is a minimal subset, not the generated app config types.
    // Rows come back as plain records keyed by field name.
    type Row = Record<string, unknown> & { id: string };
    const local = payload as unknown as Record<
      "create" | "update" | "delete",
      (options: Record<string, unknown>) => Promise<Row>
    >;
    const create = (args: {
      collection: string;
      data: Record<string, unknown>;
    }) => local.create({ ...args, overrideAccess: true });
    const pool = (payload.db as unknown as { pool: Pool }).pool;
    const identity = await pool.query("SELECT current_database() AS name");
    assert.equal(identity.rows[0].name, target.database);
    // push:true builds the schema from config; the order-key constraints are
    // hand-written in migration 20261122_160000, so mirror them here.
    await pool.query(`ALTER TABLE "setlist_positions" ALTER COLUMN "${orderColumn}" SET NOT NULL`);
    const { orderKeyCheck } =
      await import("../../src/payload/migrations/20261122_160000_setlist_entries_running_order");
    await pool.query(`ALTER TABLE "setlist_positions" ADD CONSTRAINT "setlist_positions_order_key_valid" CHECK (${orderKeyCheck})`);
    await pool.query(`CREATE UNIQUE INDEX "setlist_positions_setlist_order_uidx" ON "setlist_positions" USING btree ("setlist_id", "${orderColumn}")`);
    const rows = async (sql: string, values: unknown[] = []) =>
      (await pool.query(sql, values)).rows;
    const count = async (where: string, values: unknown[]) =>
      Number(
        (
          await rows(
            `SELECT count(*)::int AS n FROM tracks WHERE ${where}`,
            values
          )
        )[0].n
      );

    const member = await create({
      collection: "users",
      data: {
        email: "member@example.test",
        password: randomUUID(),
        name: "Member"
      }
    });
    const other = await create({
      collection: "users",
      data: {
        email: "other@example.test",
        password: randomUUID(),
        name: "Other"
      }
    });
    const setlist = await create({
      collection: "setlists",
      data: {
        title: "Proof setlist",
        slug: "proof-setlist",
        deadline: new Date(Date.now() + 86_400_000).toISOString()
      }
    });
    const entry = (
      seat: number | undefined,
      title: string,
      owner: string | null = member.id
    ) =>
      create({
        collection: "tracks",
        data: {
          title,
          artist: "Proof artist",
          setlist: setlist.id,
          submittedBy: owner,
          slotIndex: seat
        }
      });
    const order = async () =>
      rows(
        `SELECT p.id, p.track_id, p.${orderColumn} AS key, t.submitted_by_id FROM setlist_positions p JOIN tracks t ON t.id = p.track_id
       WHERE p.setlist_id = $1 ORDER BY p.${orderColumn}, p.created_at`,
        [setlist.id]
      );
    const staff = {
      id: randomUUID(),
      collection: "admins",
      _strategy: "staff-better-auth",
      role: "admin"
    };
    const reorder = (positionId: string, key: string | null) =>
      local.update({
        collection: "setlist-positions",
        id: positionId,
        data: { [orderKey]: key },
        overrideAccess: false,
        user: staff
      });

    await t.test(
      "two simultaneous creates for one seat keep one row; the other is the seat clash",
      async () => {
        const results = await Promise.allSettled([
          entry(1, "First"),
          entry(1, "Second")
        ]);
        assert.equal(
          results.filter((result) => result.status === "fulfilled").length,
          1
        );
        const rejected = results.find(
          (result) => result.status === "rejected"
        ) as PromiseRejectedResult;
        assert.equal(rejected.reason.name, "ValidationError");
        assert.equal(rejected.reason.data.collection, "tracks");
        assert.deepEqual(
          rejected.reason.data.errors.map(
            (error: { path: string }) => error.path
          ),
          [seatIndexPath]
        );
        assert.equal(
          await count(
            "setlist_id = $1 AND submitted_by_id = $2 AND slot_index = 1",
            [setlist.id, member.id]
          ),
          1
        );
        await entry(2, "Second seat");
        await entry(undefined, "Curated A", null);
        await entry(undefined, "Curated B", null);
        assert.equal(
          await count("setlist_id = $1 AND submitted_by_id IS NULL", [
            setlist.id
          ]),
          2
        );
      }
    );

    await t.test(
      "every setlist track gets one position, appended in creation order, rolled back with its track",
      async () => {
        const list = await order();
        assert.equal(list.length, await count("setlist_id = $1", [setlist.id]));
        assert.equal(
          new Set(list.map((row) => row.key)).size,
          list.length,
          "distinct keys"
        );
        assert.equal(
          (
            await rows(
              "SELECT count(*)::int AS n FROM setlist_positions p LEFT JOIN tracks t ON t.id = p.track_id WHERE t.id IS NULL"
            )
          )[0].n,
          0
        );
      }
    );

    await t.test(
      "simultaneous appends get distinct keys, so the staff drag surface and the public order agree",
      async () => {
        const tied = await create({
          collection: "setlists",
          data: { title: "Tie", slug: "tie-setlist", deadline: new Date(Date.now() + 86_400_000).toISOString() }
        });
        // Eight curated tracks added at the same moment all read the same tail.
        await Promise.all(Array.from({ length: 8 }, (_, index) =>
          create({ collection: "tracks", data: { title: `Tie ${index}`, artist: "A", setlist: tied.id } })));
        const keys = await rows(`SELECT ${orderColumn} AS key FROM setlist_positions WHERE setlist_id = $1`, [tied.id]);
        assert.equal(keys.length, 8);
        assert.equal(new Set(keys.map((row) => row.key)).size, 8, "no two positions share a key");
        // Staff surface: the Running order join, sorted by Payload's default (the key alone).
        const staffDoc = await (payload as unknown as { findByID: (o: Record<string, unknown>) => Promise<Record<string, unknown>> })
          .findByID({ collection: "setlists", id: tied.id, depth: 1, overrideAccess: true });
        const staffOrder = ((staffDoc.runningOrder as { docs: Array<{ track: string | { id: string } }> }).docs)
          .map((position) => (typeof position.track === "object" ? position.track.id : position.track));
        const { runningOrder } = await import("../../src/lib/music/running-order");
        assert.deepEqual(staffOrder, await runningOrder(payload, String(tied.id)));
        // A stored tie is refused outright.
        const [first] = await rows(`SELECT id, setlist_id, ${orderColumn} AS key FROM setlist_positions WHERE setlist_id = $1 LIMIT 1`, [tied.id]);
        const extra = await create({ collection: "tracks", data: { title: "Tie extra", artist: "A" } });
        await assert.rejects(pool.query(
          `INSERT INTO setlist_positions (setlist_id, track_id, ${orderColumn}) VALUES ($1, $2, $3)`, [first.setlist_id, extra.id, first.key]));
        await local.delete({ collection: "setlists", id: tied.id, overrideAccess: true });
      }
    );

    await t.test(
      "every position keeps a valid key: a missing or malformed key is refused on create and update",
      async () => {
        const keyed = await create({
          collection: "setlists",
          data: { title: "Keys", slug: "keys-setlist", deadline: new Date(Date.now() + 86_400_000).toISOString() }
        });
        await create({ collection: "tracks", data: { title: "Keyed", artist: "A", setlist: keyed.id } });
        const [position] = await rows(`SELECT id, ${orderColumn} AS key FROM setlist_positions WHERE setlist_id = $1`, [keyed.id]);
        assert.equal(typeof position.key === "string" && position.key.length > 0, true);
        const storedKey = async () =>
          (await rows(`SELECT ${orderColumn} AS key FROM setlist_positions WHERE id = $1`, [position.id]))[0].key;
        const refusedByPayload = (error: unknown) =>
          error instanceof Error && error.name === "ValidationError";
        const refusedByDatabase = (code: string) => (error: unknown) =>
          (error as { code?: string }).code === code;
        // Keys Payload's fractional indexing can't build on: empty; a head without
        // its integer ("a" needs 2 characters, "0" needs 11, "z" needs 27); the
        // smallest key; a fraction ending in "0"; characters outside 0-9 a-z
        // (uppercase, punctuation, space).
        const malformed = ["", "a", "0", "z1", "00000000000", "a10", "a1X0", "A0", "a1!", "a 1", "!"];

        // Create through Payload: a null or empty key is replaced with a real one, never stored.
        for (const [index, missing] of [null, ""].entries()) {
          const track = await create({ collection: "tracks", data: { title: `Loose ${index}`, artist: "A" } });
          const created = await create({
            collection: "setlist-positions",
            data: { setlist: keyed.id, track: track.id, [orderKey]: missing }
          });
          assert.equal(typeof created[orderKey] === "string" && (created[orderKey] as string).length > 0, true);
        }
        // Create through Payload with a malformed key: refused.
        const sent = await create({ collection: "tracks", data: { title: "Sent key", artist: "A" } });
        for (const key of malformed.filter(Boolean))
          await assert.rejects(create({
            collection: "setlist-positions", data: { setlist: keyed.id, track: sent.id, [orderKey]: key }
          }), refusedByPayload, `create with ${JSON.stringify(key)}`);
        // Create outside Payload: the database refuses NULL and every malformed key.
        const bare = await create({ collection: "tracks", data: { title: "Bare", artist: "A" } });
        await assert.rejects(pool.query(
          `INSERT INTO setlist_positions (setlist_id, track_id, ${orderColumn}) VALUES ($1, $2, NULL)`, [keyed.id, bare.id]),
          refusedByDatabase("23502"));
        for (const key of malformed)
          await assert.rejects(pool.query(
            `INSERT INTO setlist_positions (setlist_id, track_id, ${orderColumn}) VALUES ($1, $2, $3)`, [keyed.id, bare.id, key]),
            refusedByDatabase("23514"), `insert ${JSON.stringify(key)}`);

        // Update through Payload, as staff and as a trusted write: refused, key unchanged.
        for (const key of [null, ...malformed]) {
          await assert.rejects(reorder(position.id, key), refusedByPayload, `staff ${JSON.stringify(key)}`);
          await assert.rejects(local.update({
            collection: "setlist-positions", id: position.id, data: { [orderKey]: key }, overrideAccess: true
          }), refusedByPayload, `trusted ${JSON.stringify(key)}`);
        }
        assert.equal(await storedKey(), position.key);
        // Update outside Payload: the database refuses it.
        await assert.rejects(pool.query(
          `UPDATE setlist_positions SET ${orderColumn} = NULL WHERE id = $1`, [position.id]), refusedByDatabase("23502"));
        for (const key of malformed)
          await assert.rejects(pool.query(
            `UPDATE setlist_positions SET ${orderColumn} = $2 WHERE id = $1`, [position.id, key]),
            refusedByDatabase("23514"), `update ${JSON.stringify(key)}`);
        assert.equal(await storedKey(), position.key);

        // Afterwards the setlist still works: a valid staff reorder moves the
        // position, a new track appends after it, and Payload's generator can
        // build on every stored key.
        const moved = keyAfter(position.key as string);
        await reorder(position.id, moved);
        assert.equal(await storedKey(), moved);
        const appended = await create({ collection: "tracks", data: { title: "After reorder", artist: "A", setlist: keyed.id } });
        const keys = await rows(
          `SELECT track_id, ${orderColumn} AS key FROM setlist_positions WHERE setlist_id = $1 ORDER BY ${orderColumn}`, [keyed.id]);
        assert.equal(keys[keys.length - 1].track_id, appended.id);
        for (const row of keys) assert.equal(typeof keyAfter(row.key as string), "string");
        await local.delete({ collection: "setlists", id: keyed.id, overrideAccess: true });
      }
    );

    await t.test(
      "staff reorder moves only the position; owners and other keys stay",
      async () => {
        const before = await order();
        const [first, , third] = before;
        await reorder(first.id, keyAfter(third.key, before[3]?.key)); // after third, before the next
        const after = await order();
        assert.equal(after.length, before.length);
        for (const row of after) {
          const was = before.find((old) => old.id === row.id)!;
          assert.equal(
            row.submitted_by_id,
            was.submitted_by_id,
            "owner unchanged"
          );
          if (row.id !== first.id)
            assert.equal(row.key, was.key, "other keys unchanged");
        }
        const ids = after.map((row) => row.id);
        assert.equal(ids.indexOf(first.id) > ids.indexOf(third.id), true);
      }
    );

    await t.test(
      "a member cannot reorder, through Local API access or Payload's reorder endpoint",
      async () => {
        const [first, second] = await order();
        const memberUser = { ...member, collection: "users" };
        await assert.rejects(
          local.update({
            collection: "setlist-positions",
            id: first.id,
            data: { [orderKey]: "Zz" },
            overrideAccess: false,
            user: memberUser
          }),
          (error: Error) => error.name === "Forbidden"
        );
        const endpoint = payload.config.endpoints.find(
          (candidate) => candidate.path === "/reorder"
        );
        assert.ok(endpoint, "orderable reorder endpoint registered");
        const call = async (user: unknown) => {
          const req = await createLocalReq({ user: user as never }, payload);
          Object.assign(req, {
            json: async () => ({
              collectionSlug: "setlist-positions",
              docsToMove: [first.id],
              newKeyWillBe: "greater",
              orderableFieldName: orderKey,
              target: { id: second.id, key: second.key }
            })
          });
          return Promise.resolve(endpoint.handler(req as never)).then(
            (response: Response) => response.status,
            (error: { status?: number }) => error.status ?? 500
          );
        };
        assert.equal(await call(memberUser), 403);
        assert.equal(
          (await order()).find((row) => row.id === first.id)!.key,
          first.key
        );
        assert.equal(await call(staff), 200);
      }
    );

    await t.test(
      "a member editing an entry cannot put back an order key staff changed meanwhile",
      async () => {
        const list = await order();
        const own = list.find((row) => row.submitted_by_id === member.id)!;
        const staffKey = keyAfter(list[list.length - 1].key);
        const req = await createLocalReq(
          { user: { ...member, collection: "users" } as never },
          payload
        );
        const memberEdit = withMusicGrant(
          req,
          {
            kind: "entry-write",
            userId: member.id,
            setlistId: setlist.id,
            entryId: own.track_id
          },
          () =>
            local.update({
              collection: "tracks",
              id: own.track_id,
              data: { note: "Member edit" },
              overrideAccess: false,
              req
            })
        );
        const results = await Promise.allSettled([
          memberEdit,
          reorder(own.id, staffKey)
        ]);
        assert.deepEqual(
          results.map((result) => result.status),
          ["fulfilled", "fulfilled"]
        );
        assert.equal(
          (await order()).find((row) => row.id === own.id)!.key,
          staffKey,
          "staff order survives the member edit"
        );
        assert.equal(
          (
            await rows("SELECT note FROM tracks WHERE id = $1", [own.track_id])
          )[0].note,
          "Member edit"
        );
      }
    );

    await t.test(
      "a member's entry is never re-attributed, on any path",
      async () => {
        const own = (await order()).find(
          (row) => row.submitted_by_id === member.id
        )!;
        for (const data of [
          { submittedBy: other.id },
          { slotIndex: 2 },
          { setlist: null },
          { submittedBy: null }
        ]) {
          await assert.rejects(
            local.update({
              collection: "tracks",
              id: own.track_id,
              data,
              overrideAccess: true
            }),
            (error: Error & { data?: { errors?: Array<{ path: string }> } }) =>
              error.name === "ValidationError" &&
              error.data?.errors?.[0]?.path === Object.keys(data)[0],
            JSON.stringify(data)
          );
        }
        assert.equal(
          (
            await rows("SELECT submitted_by_id FROM tracks WHERE id = $1", [
              own.track_id
            ])
          )[0].submitted_by_id,
          member.id
        );
      }
    );

    await t.test(
      "concurrent staff reorder and member delete leave a consistent list",
      async () => {
        const before = await order();
        const own = before.find((row) => row.submitted_by_id === member.id)!;
        const req = await createLocalReq(
          { user: { ...member, collection: "users" } as never },
          payload
        );
        const memberDelete = withMusicGrant(
          req,
          {
            kind: "entry-write",
            userId: member.id,
            setlistId: setlist.id,
            entryId: own.track_id
          },
          () =>
            local.delete({
              collection: "tracks",
              id: own.track_id,
              overrideAccess: false,
              req
            })
        );
        await Promise.allSettled([
          memberDelete,
          reorder(own.id, keyAfter(before[before.length - 1].key))
        ]);
        const after = await order();
        assert.equal(
          await count("id = $1", [own.track_id]),
          0,
          "the entry is gone"
        );
        assert.equal(
          after.some(
            (row) => row.id === own.id || row.track_id === own.track_id
          ),
          false,
          "its position went with it"
        );
        assert.equal(
          (
            await rows(
              "SELECT count(*)::int AS n FROM setlist_positions WHERE setlist_id = $1",
              [setlist.id]
            )
          )[0].n,
          await count("setlist_id = $1", [setlist.id]),
          "one position per remaining track"
        );
        for (const row of after)
          assert.equal(
            row.key,
            before.find((old) => old.id === row.id)!.key,
            "no other key moved"
          );
      }
    );

    await t.test(
      "a member's new entry joins the end; deleting one leaves the others' keys",
      async () => {
        const before = await order();
        const added = await entry(1, "Added later");
        const after = await order();
        assert.equal(after[after.length - 1].track_id, added.id);
        await local.delete({
          collection: "tracks",
          id: after[0].track_id,
          overrideAccess: true
        });
        const remaining = await order();
        for (const row of remaining)
          assert.equal(row.key, after.find((old) => old.id === row.id)!.key);
        assert.equal(remaining.length, before.length);
      }
    );

    await t.test(
      "a track write marks its setlist dirty in the same transaction",
      async () => {
        await pool.query(
          "UPDATE setlists SET needs_sync = false WHERE id = $1",
          [setlist.id]
        );
        await entry(undefined, "Marks dirty", null);
        assert.equal(
          (
            await rows("SELECT needs_sync FROM setlists WHERE id = $1", [
              setlist.id
            ])
          )[0].needs_sync,
          true
        );
      }
    );

    await t.test(
      "the dirty flag leaves the setlist's updated_at as it is",
      async () => {
        await pool.query("UPDATE setlists SET needs_sync = false WHERE id = $1", [setlist.id]);
        const [before] = await rows("SELECT updated_at FROM setlists WHERE id = $1", [setlist.id]);
        await new Promise((resolve) => setTimeout(resolve, 20));
        await entry(undefined, "Keeps updated_at", null);
        const [after] = await rows("SELECT needs_sync, updated_at FROM setlists WHERE id = $1", [setlist.id]);
        assert.equal(after.needs_sync, true);
        assert.equal((after.updated_at as Date).toISOString(), (before.updated_at as Date).toISOString());
      }
    );

    await t.test(
      "a dirty-flag failure fails the track write and rolls back the track and its position",
      async () => {
        await pool.query(
          "UPDATE setlists SET needs_sync = false WHERE id = $1",
          [setlist.id]
        );
        const tracksBefore = await count("setlist_id = $1", [setlist.id]);
        const positionsBefore = (await order()).length;
        failDirtyFlag = true;
        try {
          await assert.rejects(
            entry(undefined, "Rolled back", null),
            /Synthetic dirty-flag failure/
          );
        } finally {
          failDirtyFlag = false;
        }
        assert.equal(
          await count("setlist_id = $1", [setlist.id]),
          tracksBefore
        );
        assert.equal((await order()).length, positionsBefore);
        assert.equal(
          (
            await rows("SELECT needs_sync FROM setlists WHERE id = $1", [
              setlist.id
            ])
          )[0].needs_sync,
          false
        );
      }
    );

    await t.test(
      "deleting a setlist takes its running order with it",
      async () => {
        const gone = await create({
          collection: "setlists",
          data: {
            title: "Gone",
            slug: "gone-setlist",
            deadline: new Date(Date.now() + 86_400_000).toISOString()
          }
        });
        await create({
          collection: "tracks",
          data: { title: "On gone", artist: "A", setlist: gone.id }
        });
        assert.equal(
          (
            await rows(
              "SELECT count(*)::int AS n FROM setlist_positions WHERE setlist_id = $1",
              [gone.id]
            )
          )[0].n,
          1
        );
        await local.delete({
          collection: "setlists",
          id: gone.id,
          overrideAccess: true
        });
        assert.equal(
          (
            await rows(
              "SELECT count(*)::int AS n FROM setlist_positions WHERE setlist_id = $1",
              [gone.id]
            )
          )[0].n,
          0
        );
      }
    );
  }
);
