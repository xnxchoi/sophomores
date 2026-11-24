import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { logMemberFailure } from "@/lib/member-auth/http";

// Standard-security baseline: an unexpected auth failure is logged by its error class and a correlation ID only.
// Its message and stack can carry user or database data, so they never reach the log.
const personal = "member@example.invalid";
const dsn = "postgres://db.internal:5432/members";

test("a failure is logged by class and correlation ID, never its message, stack or cause", () => {
  const logged: unknown[][] = [];
  class DatabaseError extends Error { override name = "DatabaseError"; }
  const error = new DatabaseError(`duplicate key for ${personal} at ${dsn}`, { cause: new Error(personal) });
  const id = logMemberFailure("Auth handler error.", error, (...values) => logged.push(values));
  assert.equal(logged.length, 1);
  const [context, detail] = logged[0] as [string, { errorClass: string; correlationId: string }];
  assert.equal(context, "Auth handler error.");
  assert.deepEqual(Object.keys(detail).sort(), ["correlationId", "errorClass"]);
  assert.equal(detail.errorClass, "DatabaseError");
  assert.match(detail.correlationId, /^[0-9a-f-]{36}$/);
  assert.equal(detail.correlationId, id, "the returned ID matches the log line");
  const serialized = JSON.stringify(logged);
  for (const leak of [personal, dsn, "duplicate key", "at "]) assert.equal(serialized.includes(leak), false, leak);
});

test("odd thrown values never leak either: a name that carries data, a string, null", () => {
  for (const thrown of [Object.assign(new Error("x"), { name: `Bad ${personal}` }), `failed for ${personal}`, null, { name: 42 }]) {
    const logged: unknown[][] = [];
    logMemberFailure("Auth handler error.", thrown, (...values) => logged.push(values));
    assert.equal((logged[0][1] as { errorClass: string }).errorClass, "Error");
    assert.equal(JSON.stringify(logged).includes(personal), false);
  }
  const ids = new Set(Array.from({ length: 5 }, () => logMemberFailure("x", null, () => {})));
  assert.equal(ids.size, 5, "a fresh correlation ID per failure");
});

test("the auth route logs through it and returns the correlation ID; no owned API route logs a raw error", () => {
  const route = readFileSync("src/app/api/auth/[...all]/route.ts", "utf8");
  assert.match(route, /correlationId = logMemberFailure\("Auth handler error\.", error\)/);
  assert.match(route, /unavailable\.headers\.set\("X-Correlation-Id", correlationId\)/);
  // A console call that passes a caught error (or its message or stack) straight through.
  const rawError = /console\.(?:error|warn|log|info)\([^)]*,\s*(?:error|err|e|cause|reason)(?:\.(?:message|stack))?\s*\)/;
  const files = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
  for (const file of ["src/app/api/auth", "src/app/api/member", "src/app/api/phone-verification"].flatMap(files)) {
    assert.doesNotMatch(readFileSync(file, "utf8"), rawError, file);
  }
});
