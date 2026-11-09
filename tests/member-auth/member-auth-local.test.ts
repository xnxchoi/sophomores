import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readlink, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { test } from "node:test";
import { prepareMemberAuthLocal, parseMemberLocalCommand } from "../../scripts/member-auth-local";
import { copyMemberPreviewSource, memberPreviewArguments, memberPreviewEnvironment, memberPreviewNodeArguments, requireMemberLoopbackAddresses } from "../../scripts/member-auth-preview";

const source = [
  "PHONE_VERIFICATION_MODE=local",
  "PHONE_VERIFICATION_ORIGIN=http://127.0.0.1:3217",
  "PHONE_VERIFICATION_DATABASE_URL=postgres://local:synthetic@127.0.0.1:5432/sophomores_verification_local",
  `PHONE_VERIFICATION_STATE_SECRET=${"a".repeat(64)}`,
  "PHONE_VERIFICATION_TRANSPORT=zoho-poll",
  "PHONE_VERIFICATION_RECIPIENT=verify@sophomores.co",
  "PHONE_VERIFICATION_ZOHO_ACCOUNT_ID=123",
  "PHONE_VERIFICATION_CARRIER_POLICY=local-skt-zoho-arc-v1",
  "PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC=1",
  "PHONE_VERIFICATION_TEST_DATABASE_URL=postgres://do-not-copy.invalid/test",
  "PHONE_VERIFICATION_ZOHO_CLIENT_SECRET=do-not-copy",
].join("\n");

async function fixture(run: (root: string, input: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "member-local-"));
  try {
    const directory = join(root, ".deployment/phone-verification-local");
    await mkdir(directory, { recursive: true });
    const input = join(directory, "runtime.env");
    await writeFile(input, source, { mode: 0o600 });
    await run(root, input);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test("local auth setup preserves verifier state and creates private disabled-provider configuration", async () => {
  await fixture(async (root, input) => {
    const path = await prepareMemberAuthLocal(root);
    const values = parseEnv(await readFile(path, "utf8"));
    assert.equal(values.MEMBER_AUTH_MODE, "local");
    assert.equal(values.MEMBER_AUTH_ORIGIN, "http://localhost:3240");
    assert.equal(values.PHONE_VERIFICATION_ORIGIN, values.MEMBER_AUTH_ORIGIN);
    assert.equal(values.MEMBER_AUTH_DATABASE_URL, values.PHONE_VERIFICATION_DATABASE_URL);
    assert.match(values.MEMBER_AUTH_SECRET ?? "", /^[a-f0-9]{64}$/);
    assert.notEqual(values.MEMBER_AUTH_SECRET, values.PHONE_VERIFICATION_STATE_SECRET);
    assert.equal(values.MEMBER_AUTH_MAIL_MODE, "disabled");
    assert.equal(values.PHONE_VERIFICATION_ZOHO_CLIENT_SECRET, undefined);
    assert.equal(values.PHONE_VERIFICATION_TEST_DATABASE_URL, undefined);
    assert.equal(values.MEMBER_AUTH_GOOGLE_CLIENT_SECRET, undefined);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.equal(await readFile(input, "utf8"), source);
    await assert.rejects(prepareMemberAuthLocal(root));
  });
});

test("local auth preparation refuses a public verifier configuration", async () => {
  await fixture(async (root, input) => {
    await writeFile(input, source.replace("http://127.0.0.1:3217", "https://example.com"));
    await assert.rejects(prepareMemberAuthLocal(root));
  });
});

test("local setup rejects unknown carrier policy switches rather than copying them", async () => {
  await fixture(async (root, input) => {
    await writeFile(input, source.replace("local-skt-zoho-arc-v1", "unapproved-policy"));
    await assert.rejects(prepareMemberAuthLocal(root));
  });
});

test("local command and preview arguments cannot widen the private pilot", () => {
  assert.equal(parseMemberLocalCommand(["prepare"]), "prepare");
  assert.equal(parseMemberLocalCommand(["migrate"]), "migrate");
  for (const args of [[], ["deploy"], ["migrate", "--production"]])
    assert.throws(() => parseMemberLocalCommand(args));
  assert.deepEqual(memberPreviewArguments("/snapshot", "http://localhost:3240"),
    ["dev", "/snapshot", "--hostname", "localhost", "--port", "3240", "--webpack"]);
  for (const origin of ["http://0.0.0.0:3240", "https://localhost:3240", "http://localhost:3240/path"])
    assert.throws(() => memberPreviewArguments("/snapshot", origin));
  const env = memberPreviewEnvironment({
    PHONE_VERIFICATION_ZOHO_REFRESH_TOKEN: "inbox-secret",
    MEMBER_AUTH_SECRET: "server-only-secret",
    NEXT_PUBLIC_MEMBER_AUTH_SECRET: "must-not-expose",
  });
  assert.equal(env.PHONE_VERIFICATION_ZOHO_REFRESH_TOKEN, undefined);
  assert.equal(env.NEXT_PUBLIC_MEMBER_AUTH_SECRET, undefined);
  assert.equal(env.MEMBER_AUTH_SECRET, "server-only-secret");
  assert.equal(env.PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY,
    join(process.cwd(), '.deployment/phone-verification-local/receiver-health'));
});

test("localhost listener resolution must stay entirely on loopback", () => {
  assert.doesNotThrow(() => requireMemberLoopbackAddresses(["127.0.0.1", "::1"]));
  for (const addresses of [[], ["0.0.0.0"], ["192.168.1.1"], ["127.0.0.1", "203.0.113.1"]])
    assert.throws(() => requireMemberLoopbackAddresses(addresses));
});

test("the local web child has an explicit bounded heap independent of caller environment", () => {
  assert.deepEqual(memberPreviewNodeArguments("/repo", "/snapshot", "http://localhost:3240"), [
    "--max-old-space-size=1024", "/repo/node_modules/next/dist/bin/next", "dev", "/snapshot",
    "--hostname", "localhost", "--port", "3240", "--webpack"
  ]);
});

test("isolated canonical preview preserves the src graph and copies generated-file owners", async () => {
  const root = await mkdtemp(join(tmpdir(), "member-preview-src-"));
  const directory = join(root, "snapshot");
  try {
    await mkdir(join(root, "src/app/(payload)/admin"), {recursive:true});
    await writeFile(join(root, "src/app/(payload)/admin/importMap.js"), "original map");
    for (const name of ["proxy.ts", "payload.config.ts", "payload-types.ts", "cssVariables.ts"])
      await writeFile(join(root, "src", name), name);
    for (const name of ["components", "lib", "hooks", "styles", "i18n", "providers", "stores", "utils", "utilities", "constants", "hideaway"])
      await mkdir(join(root, "src", name));
    for (const name of ["public", "messages", "node_modules", "migrations"]) await mkdir(join(root, name));
    for (const name of ["package.json", "tsconfig.json", "next-env.d.ts", "next.config.ts", "postcss.config.mjs"])
      await writeFile(join(root, name), name);
    await writeFile(join(root, "fonts.ts"), 'export const font = "./public/fonts/font.woff2";');
    await mkdir(directory);
    await copyMemberPreviewSource(root, directory);
    assert.equal(await readFile(join(directory, "src/proxy.ts"), "utf8"), "proxy.ts");
    for (const name of ["components", "lib", "hooks", "styles", "i18n", "providers", "stores", "utils", "utilities", "constants", "hideaway"])
      assert.equal(await readlink(join(directory, "src", name)), join(root, "src", name));
    for (const name of ["public", "messages", "node_modules", "migrations"])
      assert.equal(await readlink(join(directory, name)), join(root, name));
    await writeFile(join(directory, "src/payload.config.ts"), "snapshot config");
    await writeFile(join(directory, "src/payload-types.ts"), "snapshot types");
    await writeFile(join(directory, "src/app/(payload)/admin/importMap.js"), "snapshot map");
    assert.equal(await readFile(join(root, "src/payload.config.ts"), "utf8"), "payload.config.ts");
    assert.equal(await readFile(join(root, "src/payload-types.ts"), "utf8"), "payload-types.ts");
    assert.equal(await readFile(join(root, "src/app/(payload)/admin/importMap.js"), "utf8"), "original map");
    const source = await readFile(join(process.cwd(), "scripts/member-auth-preview.ts"), "utf8");
    assert.equal(source.includes("loadPayloadMemberConfig(process.env)"), true);
    assert.equal(source.includes("loadMemberAuthConfig"), false);
  } finally { await rm(root, {recursive:true,force:true}); }
});

test("in-place dev preserves the guard's inherited heap and supports Next-only when membership is disabled", () => {
  const enabled = memberPreviewNodeArguments("/repo", "/repo", "http://localhost:3000", true);
  assert.deepEqual(enabled, ["/repo/node_modules/next/dist/bin/next", "dev", "/repo", "--hostname", "127.0.0.1", "--port", "3000", "--webpack"]);
  assert.deepEqual(memberPreviewNodeArguments("/repo", "/repo", null, true), [
    "/repo/node_modules/next/dist/bin/next", "dev", "/repo", "--hostname", "127.0.0.1", "--port", "3000", "--webpack"
  ]);
  assert.equal(enabled.some((argument) => argument.includes("old-space")), false);
  assert.throws(() => memberPreviewNodeArguments("/repo", "/snapshot", null));
  const env = memberPreviewEnvironment({ DATABASE_URI:"private-db", BETTER_AUTH_SECRET:"private-auth", NODE_OPTIONS:"--max-old-space-size=512", NEXT_PUBLIC_BETTER_AUTH_SECRET:"do-not-publish" });
  assert.equal(env.DATABASE_URI, "private-db");
  assert.equal(env.BETTER_AUTH_SECRET, "private-auth");
  assert.equal(env.NODE_OPTIONS, "--max-old-space-size=512");
  assert.equal(env.NEXT_PUBLIC_BETTER_AUTH_SECRET, undefined);
});

test("normal dev delegates to the existing supervised launcher after private environment loading", async () => {
  const source = await readFile(join(process.cwd(), "scripts/member-auth-preview.ts"), "utf8");
  assert.equal(source.indexOf("loadEnvConfig(root, true") < source.indexOf("loadPayloadMemberConfig(process.env)"), true);
  assert.equal(source.includes('if (!config && !inPlace)'), true);
  assert.equal(source.includes('config && process.env.PHONE_VERIFICATION_TRANSPORT === "zoho-poll"'), true);
  const manifest = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));
  assert.equal(manifest.scripts.dev.includes("--max-gib 5 --node-old-space-mib 3072"), true);
  assert.equal(manifest.scripts.dev.includes("scripts/member-auth-preview.ts --in-place"), true);
  assert.equal(manifest.scripts.dev.includes("docker desktop start && docker start postgres && wait-on tcp:4141"), true);
});
