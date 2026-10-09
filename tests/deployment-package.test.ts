import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import {
  snapshotSource,
  sourceFingerprint
} from "../scripts/deployment/package";

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => fs.rmSync(root, { recursive: true, force: true }))
);

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deployment-package-"));
  roots.push(root);
  for (const folder of ["app", "public", "deployment"])
    fs.mkdirSync(path.join(root, folder));
  for (const file of [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "deployment/Dockerfile",
    "deployment/Dockerfile.dockerignore"
  ]) {
    fs.writeFileSync(path.join(root, file), "fixture\n");
  }
  fs.writeFileSync(path.join(root, "app/page.tsx"), "page");
  fs.writeFileSync(path.join(root, "public/image.svg"), "image");
  return root;
}

test("fingerprint ignores excluded inputs, is stable, and detects bytes and executable mode", () => {
  const root = fixture();
  const original = sourceFingerprint(root);
  assert.match(original, /^[a-f0-9]{64}$/);
  fs.writeFileSync(path.join(root, ".env.template"), "excluded");
  fs.mkdirSync(path.join(root, "artifacts"));
  fs.writeFileSync(path.join(root, "artifacts/unrelated"), "excluded");
  assert.equal(sourceFingerprint(root), original);
  fs.chmodSync(path.join(root, "app/page.tsx"), 0o755);
  assert.notEqual(sourceFingerprint(root), original);
  fs.chmodSync(path.join(root, "app/page.tsx"), 0o644);
  fs.writeFileSync(path.join(root, "app/page.tsx"), "changed");
  assert.notEqual(sourceFingerprint(root), original);
});

test("snapshot copies only selected inputs and does not recursively copy its destination", () => {
  const root = fixture();
  fs.mkdirSync(path.join(root, "styles"));
  fs.writeFileSync(path.join(root, "styles/main.css"), "css");
  fs.writeFileSync(path.join(root, ".env.local"), "excluded");
  const destination = path.join(root, ".deployment/runs/release/source");
  const result = snapshotSource(root, destination);
  assert.equal(result.fingerprint, sourceFingerprint(destination));
  assert.equal(
    fs.readFileSync(path.join(destination, "styles/main.css"), "utf8"),
    "css"
  );
  assert.equal(fs.existsSync(path.join(destination, ".env.local")), false);
  assert.equal(fs.existsSync(path.join(destination, ".deployment")), false);
  assert.throws(() => snapshotSource(root, destination), /exist/i);
});

test("rejects missing required inputs and wrong source types", () => {
  for (const input of [
    "package.json",
    "pnpm-lock.yaml",
    "app",
    "public",
    "deployment/Dockerfile"
  ]) {
    const root = fixture();
    fs.rmSync(path.join(root, input), { recursive: true });
    assert.throws(() => sourceFingerprint(root), /required|missing/i);
  }
  const root = fixture();
  fs.rmSync(path.join(root, "app"), { recursive: true });
  fs.writeFileSync(path.join(root, "app"), "not a directory");
  assert.throws(() => sourceFingerprint(root), /directory|type/i);
});

test("rejects secret-like names at any depth and symlinked inputs", () => {
  for (const name of [
    ".env",
    ".env.production",
    "cert.pem",
    "private.key",
    ".sops.yaml",
    "id_rsa",
    "credentials.json",
    ".npmrc",
    "id_rsa_backup",
    "secret-backup.json",
    "keys"
  ]) {
    const root = fixture();
    fs.mkdirSync(path.join(root, "public/nested"));
    fs.writeFileSync(
      path.join(root, "public/nested", name),
      "not a real secret"
    );
    assert.throws(() => sourceFingerprint(root), /secret|sensitive/i);
  }
  const root = fixture();
  fs.symlinkSync(
    path.join(root, "package.json"),
    path.join(root, "app/linked")
  );
  assert.throws(() => sourceFingerprint(root), /symlink/i);
});

test("rejects unsafe destinations and symlinked parents without writing through them", () => {
  const root = fixture();
  assert.throws(() => snapshotSource(root, "relative"), /absolute/i);
  assert.throws(
    () => snapshotSource(root, path.join(root, "app/generated")),
    /destination|input/i
  );
  const outside = fixture();
  fs.symlinkSync(outside, path.join(root, ".deployment"));
  assert.throws(
    () => snapshotSource(root, path.join(root, ".deployment/runs/r/source")),
    /symlink/i
  );
  assert.equal(fs.existsSync(path.join(outside, "runs")), false);
});

test("concurrent source changes fail closed and leave no partial snapshot", (context) => {
  const root = fixture();
  const destination = path.join(root, ".deployment/runs/r/source");
  const write = fs.writeFileSync;
  let changed = false;
  context.mock.method(
    fs,
    "writeFileSync",
    (...args: Parameters<typeof fs.writeFileSync>) => {
      write(...args);
      if (!changed) {
        changed = true;
        write(path.join(root, "app/page.tsx"), "changed during snapshot");
      }
    }
  );
  assert.throws(() => snapshotSource(root, destination), /changed/i);
  assert.equal(fs.existsSync(destination), false);
});
