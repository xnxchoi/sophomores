import assert from "node:assert/strict";
import test from "node:test";
import type {
  CheckboxField,
  CollectionConfig,
  Field,
  PayloadRequest
} from "payload";
import { Admins } from "@/payload/collections/admins";
import { Setlists } from "@/payload/collections/setlists";
import { authenticateStaffSession } from "@/lib/auth/staff-strategy";
import { isAuthorizedCurator } from "@/lib/music/curator";

// Curator authority must be granted on the admins row, never derived from a
// verified staff-domain email: the staff strategy provisions a missing admins
// row for any such email. These tests drive that real chain.
type Row = Record<string, unknown> & { id: string; email: string };

const fieldNamed = (fields: Field[], name: string): Field => {
  const field = fields.find(
    (candidate) => "name" in candidate && candidate.name === name
  );
  assert.ok(field, name);
  return field;
};
const curatorField = fieldNamed(
  Admins.fields,
  "setlistCurator"
) as CheckboxField;

// In-memory admins store applying the collection's own field defaults on create,
// as Payload does, so provisioning gets exactly what the real collection gives it.
function staffPayload(email: string, rows: Row[]) {
  return {
    betterAuth: {
      api: {
        getSession: async () => ({
          user: { email, emailVerified: true, name: "Fixture", id: "ba-1" }
        })
      }
    },
    find: async (args: { where: { email: { equals: string } } }) => {
      const docs = rows.filter((row) => row.email === args.where.email.equals);
      return { docs, totalDocs: docs.length };
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const defaults = Object.fromEntries(
        Admins.fields.flatMap((field) =>
          "name" in field && "defaultValue" in field
            ? [[field.name, field.defaultValue]]
            : []
        )
      );
      const row = {
        ...defaults,
        ...args.data,
        id: `admin-${rows.length + 1}`
      } as Row;
      rows.push(row);
      return row;
    },
    logger: { info: () => {}, error: () => {} }
  };
}

const signIn = async (email: string, rows: Row[]) =>
  (
    await authenticateStaffSession({
      headers: new Headers(),
      payload: staffPayload(email, rows) as never
    })
  ).user;

test("a freshly provisioned staff-domain admin is not a curator until a super admin grants it", async () => {
  const rows: Row[] = [];
  const provisioned = await signIn("new.person@sophomores.co", rows);
  assert.ok(provisioned, "the verified staff session is admitted to the CMS");
  assert.equal(
    rows.length,
    1,
    "the strategy provisioned the missing admins row"
  );
  assert.equal(rows[0].role, "staff");
  assert.equal(rows[0].setlistCurator, false);
  assert.equal(isAuthorizedCurator(provisioned), false);

  rows[0].setlistCurator = true;
  assert.equal(
    isAuthorizedCurator(await signIn("new.person@sophomores.co", rows)),
    true
  );

  rows[0].setlistCurator = false;
  assert.equal(
    isAuthorizedCurator(await signIn("new.person@sophomores.co", rows)),
    false,
    "revoking takes effect on the next sign-in read"
  );
});

test("no role is curator authority without the grant", async () => {
  for (const role of ["staff", "editor", "admin"]) {
    const rows: Row[] = [
      {
        id: "admin-1",
        email: "existing@sophomores.co",
        name: "Existing",
        role,
        setlistCurator: false
      }
    ];
    assert.equal(
      isAuthorizedCurator(await signIn("existing@sophomores.co", rows)),
      false,
      role
    );
  }
});

test("only a super admin can set the curator grant", () => {
  const principal = (role: string) => ({
    collection: "admins",
    _strategy: "staff-better-auth",
    role,
    id: `${role}-1`
  });
  const request = (user: unknown) => ({
    req: { user } as unknown as PayloadRequest
  });
  assert.equal(curatorField.defaultValue, false);
  for (const operation of ["create", "update"] as const) {
    const access = curatorField.access?.[operation];
    assert.ok(access, operation);
    assert.equal(access(request(principal("admin")) as never), true, operation);
    for (const user of [
      principal("staff"),
      principal("editor"),
      { ...principal("staff"), setlistCurator: true },
      { collection: "users", role: "admin" },
      null
    ])
      assert.equal(
        access(request(user) as never),
        false,
        `${operation} ${JSON.stringify(user)}`
      );
  }
  // A staff or editor admin cannot write its own admins row at all.
  const update = (Admins.access as NonNullable<CollectionConfig["access"]>)
    .update!;
  assert.equal(update(request(principal("staff")) as never), false);
});

test("only a granted curator can set a setlist's Apple Music owner token", () => {
  const group = fieldNamed(Setlists.fields, "appleMusic") as Field & {
    fields: Field[];
  };
  const token = fieldNamed(group.fields, "ownerUserToken") as Field & {
    access: Record<string, (args: unknown) => boolean>;
  };
  const request = (user: unknown) => ({ req: { user } });
  const staff = {
    collection: "admins",
    _strategy: "staff-better-auth",
    role: "admin",
    id: "admin-1"
  };
  for (const operation of ["create", "update"]) {
    assert.equal(
      token.access[operation](request({ ...staff, setlistCurator: true })),
      true,
      operation
    );
    assert.equal(token.access[operation](request(staff)), false, operation);
    assert.equal(
      token.access[operation](
        request({ collection: "users", setlistCurator: true })
      ),
      false,
      operation
    );
  }
});
