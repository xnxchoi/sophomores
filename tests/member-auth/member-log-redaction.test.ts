import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { failureClass, logAuthFailure } from "@/lib/auth/failure-log";
import { authHandlerFailed } from "@/lib/member-auth/http";
import { MemberError } from "@/lib/member-auth/contracts";

// Standard-security baseline: an auth failure is logged by a fixed label and a correlation ID only. The thrown value
// is never read: its name, message, stack and cause can carry user or database data, and a getter can throw.
const personal = "member@example.invalid";
const identifierShaped = "member_example_invalid"; // passes any identifier-syntax check, yet is personal
const dsn = "postgres://db.internal:5432/members";

const capture = () => {
  const logged: unknown[][] = [];
  return { logged, log: (...values: unknown[]) => { logged.push(values); } };
};
const touched: string[] = [];
const hostileError = (): Error => {
  const error = new Error(`duplicate key for ${personal} at ${dsn}`, { cause: new Error(personal) });
  for (const key of ["name", "message", "stack", "cause", "code"]) {
    Object.defineProperty(error, key, { get() { touched.push(key); throw new Error(personal); } });
  }
  return error;
};
const hostileProxy = () => new Proxy({}, {
  get() { touched.push("get"); throw new Error(personal); },
  getPrototypeOf() { touched.push("getPrototypeOf"); throw new Error(personal); },
  has() { throw new Error(personal); },
  ownKeys() { throw new Error(personal); },
  getOwnPropertyDescriptor() { throw new Error(personal); }
});

test("the label comes from our closed set, never from the value", () => {
  class DatabaseError extends Error { override name = identifierShaped; }
  assert.equal(failureClass(new DatabaseError(personal)), "Error", "an identifier-shaped name is not logged");
  assert.equal(failureClass(Object.assign(new TypeError(personal), { name: identifierShaped })), "TypeError");
  assert.equal(failureClass(new MemberError("UNAVAILABLE")), "MemberError");
  for (const odd of [`failed for ${personal}`, null, undefined, 42, { name: identifierShaped }]) assert.equal(failureClass(odd), "Unknown");
});

test("a failure logs only the label and a fresh correlation ID; no property of the thrown value is read", () => {
  touched.length = 0;
  const { logged, log } = capture();
  const id = logAuthFailure("Auth handler error.", hostileError(), log);
  assert.deepEqual(touched, [], "name, message, stack, cause and code are never read");
  assert.equal(logged.length, 1);
  const [context, detail] = logged[0] as [string, Record<string, string>];
  assert.equal(context, "Auth handler error.");
  assert.deepEqual(detail, { errorClass: "Error", correlationId: id });
  assert.match(id, /^[0-9a-f-]{36}$/);
  const serialized = JSON.stringify(logged);
  for (const leak of [personal, identifierShaped, dsn, "duplicate key"]) assert.equal(serialized.includes(leak), false, leak);
  const ids = new Set(Array.from({ length: 5 }, () => logAuthFailure("x", null, () => {})));
  assert.equal(ids.size, 5, "a fresh correlation ID per failure");
});

test("a throwing proxy cannot escape: the label is Unknown and nothing throws", () => {
  touched.length = 0;
  const { logged, log } = capture();
  assert.doesNotThrow(() => logAuthFailure("Auth handler error.", hostileProxy(), log));
  assert.equal((logged[0][1] as { errorClass: string }).errorClass, "Unknown");
  assert.equal(touched.includes("get"), false, "no property is read from the proxy");
});

test("the route's failure answer is still a 503 carrying the logged correlation ID, for any thrown value", async () => {
  for (const discovery of [false, true]) {
    for (const thrown of [hostileError(), hostileProxy(), `failed for ${personal}`]) {
      const { logged, log } = capture();
      const response = authHandlerFailed(discovery, thrown, log);
      assert.equal(response.status, 503);
      const id = response.headers.get("X-Correlation-Id");
      assert.equal(id, (logged[0][1] as { correlationId: string }).correlationId);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      const body = await response.text();
      assert.equal(body.includes(personal), false);
      assert.deepEqual(JSON.parse(body).error.code, "UNAVAILABLE");
    }
  }
});

test("the auth route answers failures through it, and no owned auth code reads a thrown value into a log", () => {
  const route = readFileSync("src/app/api/auth/[...all]/route.ts", "utf8");
  assert.match(route, /catch \(error\) \{\s*\/\/[^\n]*\n\s*return authHandlerFailed\(discovery, error\);/);
  // A console call that passes a caught error (or its message or stack) straight through.
  const rawError = /console\.(?:error|warn|log|info)\([^)]*,\s*(?:error|err|e|cause|reason)(?:\.(?:message|stack))?\s*\)/;
  // Reading the caught value's name or code for a log line (the pattern this fix removed).
  const readsThrown = /\((?:error|err|e)\s+as\s+\{[^}]*\b(?:name|code)\?:/;
  const files = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
  for (const file of ["src/app/api/auth", "src/app/api/member", "src/app/api/phone-verification"].flatMap(files)) {
    assert.doesNotMatch(readFileSync(file, "utf8"), rawError, file);
  }
  for (const file of ["src/lib/auth/options.ts", "src/lib/auth/staff.ts", "src/payload/seed/super-admin.ts"]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), readsThrown, file);
  }
});
