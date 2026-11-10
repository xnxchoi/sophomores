import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { safeEnvironment } from "../../scripts/deployment/command";
import { payloadEnvironmentSchema } from "../../src/lib/payload/configuration";

test("builder checks receive valid synthetic command-scoped Payload configuration offline", () => {
  const dockerfile = readFileSync(new URL("../../deployment/Dockerfile", import.meta.url), "utf8");
  const instructions = dockerfile.replace(/\\\r?\n/g, " ").split(/\r?\n/);
  const verification = instructions.find((line) => /^RUN\s/.test(line) && line.includes("pnpm test"));
  assert.ok(verification, "builder verification command exists");
  const environment = Object.fromEntries(
    [...verification.matchAll(/\b(DATABASE_URI|PAYLOAD_SECRET)=([^\s;&]+)/g)]
      .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, "")]),
  );
  assert.equal(payloadEnvironmentSchema.safeParse(environment).success, true,
    "actual Payload schema accepts explicit builder values");
  const uri = new URL(environment.DATABASE_URI);
  assert.equal(uri.hostname, "127.0.0.1");
  assert.equal(uri.port, "1", "synthetic database must not target an available service");
  assert.match(environment.PAYLOAD_SECRET, /(?:synthetic|validation|packaging|build)/i);
  assert.match(verification, /--network=none\b/);
  assert.match(verification, /\bexport\b[^;]*DATABASE_URI=/);
  for (const command of ["pnpm test:functional", "pnpm exec next typegen", "pnpm typecheck", "pnpm build"]) {
    assert.ok(verification.includes(command), `${command} retains scoped configuration`);
  }
  assert.equal(instructions.some((line) => /^(?:ENV|ARG)\s.*\b(?:DATABASE_URI|PAYLOAD_SECRET)\b/.test(line)), false,
    "synthetic values must not become persistent image defaults or build arguments");
});

test("deployment child environment strips real application, provider and Node preload configuration", () => {
  const denied = ["DATABASE_URI", "PAYLOAD_SECRET", "BETTER_AUTH_SECRET", "PREVIEW_AUTH_MODE", "BREVO_SMTP_PASS", "GOOGLE_CLIENT_SECRET", "NODE_OPTIONS", "NODE_PATH"];
  const input = Object.fromEntries(denied.map((key) => [key, "private-host-value"]));
  const result = safeEnvironment({ ...input, PATH: "/bin", HOME: "/safe-home" });
  for (const key of denied) assert.equal(result[key], undefined, `${key} is not inherited`);
  assert.equal(result.PATH, "/bin");
  assert.equal(result.HOME, "/safe-home");
  assert.equal(payloadEnvironmentSchema.safeParse(result).success, false,
    "sanitizing a host does not silently supply runtime credentials");
});

test("real Payload configuration remains mandatory and rejects missing or malformed credentials", () => {
  for (const input of [undefined, null, {}, { DATABASE_URI: "", PAYLOAD_SECRET: "" },
    { DATABASE_URI: "https://example.com", PAYLOAD_SECRET: "x".repeat(32) },
    { DATABASE_URI: "postgresql://localhost/app", PAYLOAD_SECRET: "short" }]) {
    assert.equal(payloadEnvironmentSchema.safeParse(input).success, false);
  }
  assert.equal(payloadEnvironmentSchema.safeParse({
    DATABASE_URI: "postgresql://localhost/app", PAYLOAD_SECRET: "x".repeat(32),
  }).success, true);
});
