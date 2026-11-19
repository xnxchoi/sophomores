import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import { TeamMembers } from "@/payload/collections/team-members";

// The projection is fenced with `server-only`, which Next resolves itself; outside Next it is a no-op here.
let approvedAccountImage: typeof import("@/lib/content/team-roster.server").approvedAccountImage;
let loadTeamRoster: typeof import("@/lib/content/team-roster.server").loadTeamRoster;
let toTeamPerson: typeof import("@/lib/content/team-roster.server").toTeamPerson;
let serverOnly: ReturnType<typeof registerHooks>;
before(async () => {
  serverOnly = registerHooks({
    resolve: (specifier, context, nextResolve) => specifier === "server-only"
      ? { url: new URL("../fixtures/team/server-only.ts", import.meta.url).href, shortCircuit: true }
      : nextResolve(specifier, context),
  });
  ({ approvedAccountImage, loadTeamRoster, toTeamPerson } = await import("@/lib/content/team-roster.server"));
});
after(() => serverOnly?.deregister());

const image = "https://lh3.googleusercontent.com/a/account";
const images = new Map([["user-1", image]]);

test("only staff-approved values reach the page", () => {
  assert.deepEqual(toTeamPerson({ id: 1, displayName: " Roster Name ", role: "Design", user: "user-1" }, images), {
    id: "1",
    name: "Roster Name",
    role: "Design"
  }, "the account image stays out until staff tick Use account image");
  assert.deepEqual(toTeamPerson({ id: 1, displayName: "Roster Name", role: "Design", useAccountImage: true, user: "user-1" }, images)?.profilePic,
    { src: image, alt: "Roster Name" });
});

test("an account image shows only from an approved sign-in provider host", () => {
  assert.equal(approvedAccountImage("https://lh3.googleusercontent.com/a/x"), "https://lh3.googleusercontent.com/a/x");
  assert.equal(approvedAccountImage("https://k.kakaocdn.net/dn/x.jpg"), "https://k.kakaocdn.net/dn/x.jpg");
  for (const value of ["http://lh3.googleusercontent.com/a/x", "https://evil.example/x.jpg", "https://googleusercontent.com.evil.example/x",
    "https://user:pass@lh3.googleusercontent.com/x", "https://lh3.googleusercontent.com:8443/x", "javascript:alert(1)", "/media/x.jpg", "", null]) {
    assert.equal(approvedAccountImage(value), "", String(value));
  }
  assert.equal(toTeamPerson({ id: 1, displayName: "Name", role: "Design", useAccountImage: true, user: "u" }, new Map([["u", "https://evil.example/x.jpg"]]))?.profilePic, undefined);
});

test("an uploaded portrait wins over the account image", () => {
  const person = toTeamPerson({
    id: "a",
    displayName: "Roster Name",
    role: "Design",
    useAccountImage: true,
    portrait: { url: "/media/portrait.jpg", alt: "Portrait", width: 800, height: 900 },
    bio: "Bio",
    link: "/help",
    patronage: true,
    user: "user-1"
  }, images);
  assert.deepEqual(person?.profilePic, { src: "/media/portrait.jpg", alt: "Portrait", width: 800, height: 900 });
  assert.equal(person?.bio, "Bio");
  assert.equal(person?.href, "/help");
  assert.equal(person?.patronage, true);
});

test("entries that can't be shown are left out", () => {
  assert.equal(toTeamPerson({ id: 1, displayName: "Name", role: "Design", user: null }), null, "deleted account");
  assert.equal(toTeamPerson({ id: 1, displayName: "Name", role: " ", user: "user-1" }), null, "no role");
  assert.equal(toTeamPerson({ id: 1, displayName: "", role: "Design", user: "user-1" }), null, "no approved display name");
});

test("a published entry survives the projection with its account held as an id", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const payload = {
    find: async (input: Record<string, unknown>) => {
      calls.push(input);
      if (input.collection === "users") return { docs: [{ id: "user-2", image }] };
      return { docs: [
        { id: 7, displayName: "Name", role: "Design", useAccountImage: false, status: "published", user: "user-1" },
        { id: 8, displayName: "Other", role: "Design", useAccountImage: true, status: "published", user: "user-2" }
      ] };
    }
  };
  const people = await loadTeamRoster(payload as never);
  assert.deepEqual(people, [
    { id: "7", name: "Name", role: "Design" },
    { id: "8", name: "Other", role: "Design", profilePic: { src: image, alt: "Other" } }
  ]);
  const [entries, accounts] = calls;
  assert.deepEqual(entries.where, { status: { equals: "published" } });
  assert.deepEqual(entries.sort, ["order", "id"]);
  assert.deepEqual(entries.populate, { media: { url: true, alt: true, width: true, height: true } });
  assert.equal("users" in (entries.populate as object), false, "the account is never populated");
  assert.deepEqual(accounts.where, { id: { in: ["user-2"] } }, "only accounts with an approved image are read");
  assert.deepEqual(accounts.select, { image: true }, "and only their image");
  const serialized = JSON.stringify(people);
  for (const leak of ["user-1", "user-2"]) assert.ok(!serialized.includes(leak), leak);
});

test("no account read happens when no image is approved", async () => {
  const collections: unknown[] = [];
  const payload = { find: async (input: Record<string, unknown>) => {
    collections.push(input.collection);
    return { docs: [{ id: 1, displayName: "Name", role: "Design", user: "user-1" }] };
  } };
  await loadTeamRoster(payload as never);
  assert.deepEqual(collections, ["team-members"]);
});

type AccessArgs = { req: { user: unknown } };
const anonymous = { req: { user: null } };
const member = { req: { user: { id: "user-1", collection: "users", role: ["user"] } } };
const staff = { req: { user: { collection: "admins", _strategy: "staff-better-auth", role: "editor" } } };

test("REST and GraphQL reads are staff-only, whatever the query shape", () => {
  // Payload applies collection read access to every find, findByID, count and GraphQL read, before select,
  // depth, populate, where or sort are considered, so denying the read covers every query shape.
  const read = TeamMembers.access?.read as (args: AccessArgs) => unknown;
  assert.equal(read(anonymous), false, "anonymous");
  assert.equal(read(member), false, "signed-in member, including the linked one");
  assert.equal(read(staff), true, "CMS staff");
});

test("every field is staff-read, and the account link is staff-set", () => {
  for (const field of TeamMembers.fields) {
    if (!("name" in field)) continue;
    const access = field.access as { read?: (args: AccessArgs) => unknown; create?: (args: AccessArgs) => unknown; update?: (args: AccessArgs) => unknown } | undefined;
    assert.ok(access?.read, `${field.name} has field read access`);
    assert.equal(access.read(anonymous), false, `${field.name}: anonymous`);
    assert.equal(access.read(member), false, `${field.name}: member`);
    assert.equal(access.read(staff), true, `${field.name}: staff`);
  }
  const user = TeamMembers.fields.find((field) => "name" in field && field.name === "user") as { access: Record<string, (args: AccessArgs) => unknown> };
  assert.equal(user.access.create(member), false);
  assert.equal(user.access.update(member), false);
  assert.equal(TeamMembers.fields.some((field) => "virtual" in field && field.virtual), false, "no virtual account fields");
});

test("publishing needs a staff-approved display name", () => {
  const field = TeamMembers.fields.find((each) => "name" in each && each.name === "displayName");
  const validate = (field && "validate" in field ? field.validate : undefined) as (value: string, options: { siblingData: { status: string } }) => true | string;
  assert.equal(validate("", { siblingData: { status: "draft" } }), true);
  assert.equal(typeof validate(" ", { siblingData: { status: "published" } }), "string");
  assert.equal(validate("Name", { siblingData: { status: "published" } }), true);
});

test("a saved link must be one the page will show", () => {
  const link = TeamMembers.fields.find((field) => "name" in field && field.name === "link");
  const validate = (link && "validate" in link ? link.validate : undefined) as (value: string) => true | string;
  assert.equal(validate("/help"), true);
  assert.equal(validate("https://example.com"), true);
  assert.equal(typeof validate("//evil.com"), "string");
  assert.equal(typeof validate("javascript:alert(1)"), "string");
});
