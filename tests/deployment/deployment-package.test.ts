import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, test } from "node:test";
import {
  snapshotSource,
  sourceFingerprint
} from "../../scripts/deployment/package";

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => fs.rmSync(root, { recursive: true, force: true }))
);

function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "deployment-package-")));
  roots.push(root);
  for (const folder of ["app", "public", "deployment"])
    fs.mkdirSync(path.join(root, folder));
  for (const file of [
    "proxy.ts",
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

function srcFixture() {
  const root = fixture();
  fs.mkdirSync(path.join(root, "src"));
  fs.renameSync(path.join(root, "app"), path.join(root, "src/app"));
  fs.renameSync(path.join(root, "proxy.ts"), path.join(root, "src/proxy.ts"));
  fs.mkdirSync(path.join(root, "messages"));
  fs.writeFileSync(path.join(root, "messages/en.json"), '{"locale":"English"}\n');
  fs.writeFileSync(path.join(root, "messages/ko.json"), '{"locale":"한국어"}\n');
  fs.mkdirSync(path.join(root, "patches"));
  fs.writeFileSync(path.join(root, "patches/payload.patch"), "diff --git a/fixture b/fixture\n+fixture patch\n");
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "patchedDependencies:\n  payload: patches/payload.patch\n");
  return root;
}

test("legacy manifest serialization retains its pre-change golden fingerprint", () => {
  const root = fixture();
  const golden = "608e29e9ade3838cfc991522a3df6bd5714a856c84c1f431e456f33a3e09749a";
  assert.equal(sourceFingerprint(root), golden);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src/unselected.ts"), "not another application root");
  fs.mkdirSync(path.join(root, "messages"));
  fs.writeFileSync(path.join(root, "messages/en.json"), "legacy-unselected");
  fs.mkdirSync(path.join(root, "patches"));
  fs.writeFileSync(path.join(root, "patches/payload.patch"), "legacy-unselected");
  assert.equal(sourceFingerprint(root), golden);
});

test("legacy owner ignores an unrelated regular src directory without src/app", () => {
  const root = fixture();
  const before = sourceFingerprint(root);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src/unrelated.ts"), "not an application owner");
  assert.equal(sourceFingerprint(root), before);
  const destination = path.join(root, ".deployment/runs/legacy-unrelated-src/source");
  assert.equal(snapshotSource(root, destination).fingerprint, before);
  assert.equal(sourceFingerprint(destination), before);
  assert.equal(fs.existsSync(path.join(destination, "src")), false);
  assert.equal(fs.readFileSync(path.join(destination, "proxy.ts"), "utf8"), "fixture\n");
  assert.equal(fs.readFileSync(path.join(destination, "app/page.tsx"), "utf8"), "page");
});

test("selected optional input metadata denials propagate instead of behaving like absence", (context) => {
  const lstat = fs.lstatSync;
  for (const create of [fixture, srcFixture]) {
    for (const code of ["EACCES", "EPERM"]) {
      const root = create();
      const denied = Object.assign(new Error("Synthetic optional input metadata denial"), { code });
      const metadata = context.mock.method(fs, "lstatSync", (...args: Parameters<typeof fs.lstatSync>) => {
        if (args[0] === path.join(root, "fonts.ts")) throw denied;
        return lstat(...args);
      });
      try {
        assert.throws(() => sourceFingerprint(root), (failure: unknown) => failure === denied, code);
      } finally {
        metadata.mock.restore();
      }
    }
  }
});

test("SRC profile roundtrips locales, exact patch, references and executable inputs without duplicate proxy copies", (context) => {
  const root = srcFixture();
  const inputs = ["src/hideaway/reference.ts", "tests/fixture.ts", "scripts/tool.sh", "fonts.ts", "design/flame-envelope/manifest.json", "design/flame-envelope/flame-envelope-illustrator.svg"];
  for (const relative of inputs) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), `fixture:${relative}\n`);
  }
  fs.chmodSync(path.join(root, "scripts/tool.sh"), 0o755);
  for (const relative of [".env.local", "components/ignored.ts", "artifacts/ignored", "patches/unrelated.patch", "deployment/ops/auth-config.json", "design/flame-envelope/unrelated.ai"]) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), "excluded");
  }
  const destination = path.join(root, ".deployment/runs/src-roundtrip/source");
  const write = fs.writeFileSync;
  let proxyCopies = 0;
  context.mock.method(fs, "writeFileSync", (...args: Parameters<typeof fs.writeFileSync>) => {
    if (args[0] === path.join(destination, "src/proxy.ts")) proxyCopies += 1;
    return write(...args);
  });
  const before = sourceFingerprint(root);
  const result = snapshotSource(root, destination);
  assert.equal(result.fingerprint, before);
  assert.equal(sourceFingerprint(destination), before);
  assert.equal(proxyCopies, 1);
  for (const relative of [...inputs, "src/app/page.tsx", "src/proxy.ts", "messages/en.json", "messages/ko.json", "patches/payload.patch", "pnpm-workspace.yaml"]) {
    assert.equal(fs.readFileSync(path.join(destination, relative)).equals(fs.readFileSync(path.join(root, relative))), true, relative);
  }
  assert.equal(fs.statSync(path.join(destination, "scripts/tool.sh")).mode & 0o111, 0o111);
  for (const relative of [".env.local", "components", "artifacts", "patches/unrelated.patch", "deployment/ops/auth-config.json", "design/flame-envelope/unrelated.ai", ".deployment", "proxy.ts", "app"]) {
    assert.equal(fs.existsSync(path.join(destination, relative)), false, relative);
  }
  assert.throws(() => snapshotSource(root, destination), /exist/i);
});

test("SRC fingerprint tracks source, locale, patch bytes and executable modes", () => {
  const root = srcFixture();
  const original = sourceFingerprint(root);
  for (const relative of ["src/app/page.tsx", "src/proxy.ts", "messages/en.json", "messages/ko.json", "patches/payload.patch"]) {
    const absolute = path.join(root, relative);
    const bytes = fs.readFileSync(absolute);
    fs.appendFileSync(absolute, "changed\n");
    assert.notEqual(sourceFingerprint(root), original, relative);
    fs.writeFileSync(absolute, bytes);
    assert.equal(sourceFingerprint(root), original);
  }
  fs.chmodSync(path.join(root, "src/proxy.ts"), 0o755);
  assert.notEqual(sourceFingerprint(root), original);
  fs.chmodSync(path.join(root, "src/proxy.ts"), 0o644);
  assert.equal(sourceFingerprint(root), original);
});

test("application profiles fail closed for both or neither owner and invalid source containers", () => {
  const both = fixture();
  fs.mkdirSync(path.join(both, "src/app"), { recursive: true });
  fs.writeFileSync(path.join(both, "src/proxy.ts"), "competing proxy");
  assert.throws(() => sourceFingerprint(both), /ambiguous|both|profile|source.*root/i);
  const neither = fixture();
  fs.rmSync(path.join(neither, "app"), { recursive: true });
  assert.throws(() => sourceFingerprint(neither), /missing|required|profile|source.*root/i);
  for (const relative of ["src", "src/app"]) {
    const root = fixture();
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), "not a source directory");
    assert.throws(() => sourceFingerprint(root), /directory|type/i, relative);
  }
  for (const relative of ["src", "src/app"]) {
    const root = fixture();
    const outside = srcFixture();
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.symlinkSync(path.join(outside, relative), path.join(root, relative), "dir");
    assert.throws(() => sourceFingerprint(root), /symlink/i, relative);
  }
});

test("each profile requires its matching regular proxy and application root", () => {
  for (const create of [fixture, srcFixture]) {
    const prefix = create === fixture ? "" : "src/";
    for (const relative of [`${prefix}app`, `${prefix}proxy.ts`]) {
      for (const invalid of ["missing", "wrong type", "symlink"]) {
        const root = create();
        const absolute = path.join(root, relative);
        fs.rmSync(absolute, { recursive: true });
        if (invalid === "wrong type") {
          if (relative.endsWith("proxy.ts")) fs.mkdirSync(absolute);
          else fs.writeFileSync(absolute, "not a directory");
        }
        if (invalid === "symlink") {
          const outside = create();
          fs.symlinkSync(path.join(outside, relative), absolute);
        }
        assert.throws(() => sourceFingerprint(root), /missing|required|type|directory|symlink|profile|source.*root/i, `${relative}: ${invalid}`);
      }
    }
  }
});

test("SRC requires locale directory, exact patch and shared mandatory build inputs", () => {
  for (const relative of ["messages", "patches/payload.patch", "public", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "deployment/Dockerfile", "deployment/Dockerfile.dockerignore"]) {
    const root = srcFixture();
    fs.rmSync(path.join(root, relative), { recursive: true });
    assert.throws(() => sourceFingerprint(root), /required|missing/i, relative);
  }
  for (const relative of ["messages", "patches/payload.patch"]) {
    const root = srcFixture();
    fs.rmSync(path.join(root, relative), { recursive: true });
    if (relative === "messages") fs.writeFileSync(path.join(root, relative), "not a directory");
    else fs.mkdirSync(path.join(root, relative));
    assert.throws(() => sourceFingerprint(root), /directory|type/i, relative);
  }
});

test("SRC rejects nested secrets, symlinks and symlinked patch parents", () => {
  for (const name of [".env", ".env.production", "cert.pem", "private.key", ".sops.yaml", "id_rsa", "credentials.json", ".npmrc", "id_rsa_backup", "secret-backup.json", "keys"]) {
    const root = srcFixture();
    fs.mkdirSync(path.join(root, "src/nested"));
    fs.writeFileSync(path.join(root, "src/nested", name), "not a real secret");
    assert.throws(() => sourceFingerprint(root), /secret|sensitive/i, name);
  }
  for (const relative of ["src/app/linked", "messages", "patches", "patches/payload.patch"]) {
    const root = srcFixture();
    const outside = srcFixture();
    fs.rmSync(path.join(root, relative), { recursive: true, force: true });
    fs.symlinkSync(path.join(outside, relative === "src/app/linked" ? "src/app/page.tsx" : relative), path.join(root, relative));
    assert.throws(() => sourceFingerprint(root), /symlink/i, relative);
  }
});

test("SRC enforces safe exclusive destinations without writing through symlink parents", () => {
  const root = srcFixture();
  assert.throws(() => snapshotSource(root, "relative"), /absolute/i);
  assert.throws(() => snapshotSource(root, path.join(root, "src/generated")), /destination|input/i);
  const outside = srcFixture();
  fs.symlinkSync(outside, path.join(root, ".deployment"));
  assert.throws(() => snapshotSource(root, path.join(root, ".deployment/runs/r/source")), /symlink/i);
  assert.equal(fs.existsSync(path.join(outside, "runs")), false);
});

test("SRC rejects a regular-file destination ancestor without overwriting it", () => {
  const root = srcFixture();
  const before = sourceFingerprint(root);
  const ancestor = path.join(root, ".deployment");
  const sentinel = "regular file must remain untouched\n";
  fs.writeFileSync(ancestor, sentinel);
  const destination = path.join(ancestor, "runs/blocked/source");
  assert.throws(() => snapshotSource(root, destination), /parent.*not.*directory/i);
  assert.equal(fs.lstatSync(ancestor).isFile(), true);
  assert.equal(fs.readFileSync(ancestor, "utf8"), sentinel);
  assert.equal(fs.existsSync(destination), false);
  assert.equal(sourceFingerprint(root), before);
});

test("SRC concurrent source changes remove partial snapshots", (context) => {
  const root = srcFixture();
  const destination = path.join(root, ".deployment/runs/race/source");
  const write = fs.writeFileSync;
  let changed = false;
  context.mock.method(fs, "writeFileSync", (...args: Parameters<typeof fs.writeFileSync>) => {
    write(...args);
    if (!changed) {
      changed = true;
      write(path.join(root, "src/app/page.tsx"), "changed during snapshot");
    }
  });
  assert.throws(() => snapshotSource(root, destination), /changed/i);
  assert.equal(fs.existsSync(destination), false);
});

test("SRC source swap between realpath and open cannot bypass O_NOFOLLOW", (context) => {
  const root = srcFixture();
  const outside = fixture();
  const source = path.join(root, "src/app/page.tsx");
  const destination = path.join(root, ".deployment/runs/no-follow/source");
  const open = fs.openSync;
  let sourceOpens = 0;
  context.mock.method(fs, "openSync", (...args: Parameters<typeof fs.openSync>) => {
    if (args[0] === source && ++sourceOpens === 2) {
      assert.notEqual(Number(args[1]) & fs.constants.O_NOFOLLOW, 0);
      fs.unlinkSync(source);
      fs.symlinkSync(path.join(outside, "app/page.tsx"), source);
    }
    return open(...args);
  });
  assert.throws(() => snapshotSource(root, destination), /ELOOP|symlink|symbolic/i);
  assert.equal(fs.existsSync(destination), false);
  assert.equal(fs.readFileSync(path.join(outside, "app/page.tsx"), "utf8"), "page");
});

test("Docker runtime copies match WORKDIR and patched install receives its exact patch first", () => {
  const dockerfile = fs.readFileSync(new URL("../../deployment/Dockerfile", import.meta.url), "utf8");
  assert.equal((dockerfile.match(/^WORKDIR \/app$/gm) ?? []).length, 2);
  for (const [source, target] of [["/app/.next/standalone", "./"], ["/app/.next/static", "./.next/static"], ["/app/public", "./public"]]) {
    assert.ok(dockerfile.includes(`COPY --from=builder --chown=node:node ${source} ${target}`));
  }
  assert.doesNotMatch(dockerfile, /^COPY --from=builder[^\n]*\/src\/app\//m);
  const patch = dockerfile.indexOf("COPY patches/payload.patch ./patches/payload.patch");
  const install = dockerfile.indexOf("RUN corepack install && pnpm install --frozen-lockfile");
  assert.ok(patch >= 0 && install > patch, "The workspace patch must exist before frozen installation");
});

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

test("snapshot includes shared hooks and root font declarations used by application imports", () => {
  const root = fixture();
  fs.mkdirSync(path.join(root, "hooks"));
  fs.writeFileSync(path.join(root, "hooks/use-entry.ts"), "export const sharedHook = true;");
  fs.writeFileSync(path.join(root, "fonts.ts"), "export const sharedFonts = true;");
  const before = sourceFingerprint(root);
  fs.appendFileSync(path.join(root, "hooks/use-entry.ts"), "\n// changed hook");
  assert.notEqual(sourceFingerprint(root), before);
  const afterHook = sourceFingerprint(root);
  fs.appendFileSync(path.join(root, "fonts.ts"), "\n// changed font");
  assert.notEqual(sourceFingerprint(root), afterHook);
  const destination = path.join(root, ".deployment/runs/shared-modules/source");
  snapshotSource(root, destination);
  for (const relative of ["hooks/use-entry.ts", "fonts.ts"]) {
    assert.equal(fs.readFileSync(path.join(destination, relative), "utf8"), fs.readFileSync(path.join(root, relative), "utf8"));
  }
});

test("rejects missing required inputs and wrong source types", () => {
  for (const input of [
    "proxy.ts",
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

test("snapshot includes the authentication gate and exact ingress fixtures, not deployment secrets", () => {
  const root = fixture();
  const ops = path.join(root, "deployment/ops");
  fs.mkdirSync(ops);
  for (const name of [
    "sophomores-preview.conf",
    "certbot-reload-sophomores-preview.sh"
  ])
    fs.writeFileSync(path.join(ops, name), "fixture");
  fs.writeFileSync(path.join(ops, "auth-config.json"), "excluded");
  const destination = path.join(root, ".deployment/runs/release/source");
  snapshotSource(root, destination);
  assert.equal(
    fs.readFileSync(path.join(destination, "proxy.ts"), "utf8"),
    "fixture\n"
  );
  assert.ok(
    fs.existsSync(
      path.join(destination, "deployment/ops/sophomores-preview.conf")
    )
  );
  assert.ok(
    fs.existsSync(
      path.join(
        destination,
        "deployment/ops/certbot-reload-sophomores-preview.sh"
      )
    )
  );
  assert.equal(
    fs.existsSync(path.join(destination, "deployment/ops/auth-config.json")),
    false
  );
});


test("snapshot retains executable mask generator and exact durable test fixtures without unrelated design files", async () => {
  const root = fixture();
  const project = path.resolve(import.meta.dirname, "../..");
  const installedThree = JSON.parse(fs.readFileSync(path.join(project, "package.json"), "utf8")).dependencies.three;
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ private: true, dependencies: { three: installedThree } }));
  const inputs = [
    "scripts/flame-envelope-assets.ts",
    "components/gl/flame-backdrop/appearance.ts",
    "components/gl/flame-backdrop/mask/profile.ts",
    "components/gl/flame-backdrop/mask/svg.ts"
  ];
  for (const relative of inputs) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.copyFileSync(path.join(project, relative.startsWith("components/") ? `src/${relative}` : relative), path.join(root, relative));
  }
  const { createIllustratorSourceSvg } = await import(pathToFileURL(path.join(project, "scripts/flame-envelope-assets.ts")).href);
  fs.mkdirSync(path.join(root, "design/flame-envelope"), { recursive: true });
  fs.writeFileSync(path.join(root, "design/flame-envelope/manifest.json"), "{}");
  fs.writeFileSync(path.join(root, "design/flame-envelope/flame-envelope-illustrator.svg"), createIllustratorSourceSvg());
  const designInputs = [
    "design/flame-envelope/manifest.json",
    "design/flame-envelope/flame-envelope-illustrator.svg"
  ];
  fs.writeFileSync(path.join(root, "design/flame-envelope/unrelated.ai"), "excluded");
  fs.mkdirSync(path.join(root, "utils/browser"), { recursive: true });
  fs.copyFileSync(path.join(project, "src/utils/browser/visibility.ts"), path.join(root, "utils/browser/visibility.ts"));
  const destination = path.join(root, ".deployment/runs/mask-fixtures/source");
  snapshotSource(root, destination);
  for (const relative of [...inputs, ...designInputs]) {
    assert.equal(fs.readFileSync(path.join(destination, relative), "utf8"), fs.readFileSync(path.join(root, relative), "utf8"));
  }
  assert.equal(fs.existsSync(path.join(destination, "design/flame-envelope/unrelated.ai")), false);
  assert.equal(fs.readFileSync(path.join(destination, "utils/browser/visibility.ts"), "utf8"), fs.readFileSync(path.join(root, "utils/browser/visibility.ts"), "utf8"));
  assert.equal(fs.existsSync(path.join(destination, "node_modules")), false);
  // Source snapshots declare dependencies; model the install step with the already-installed package.
  fs.mkdirSync(path.join(destination, "node_modules"));
  fs.symlinkSync(fs.realpathSync(path.join(project, "node_modules/three")), path.join(destination, "node_modules/three"), "dir");
  const generator = await import(pathToFileURL(path.join(destination, "scripts/flame-envelope-assets.ts")).href);
  assert.match(generator.createMaskAssetSvg(), /<svg/);
  assert.equal(generator.createIllustratorSourceSvg(), fs.readFileSync(path.join(destination, "design/flame-envelope/flame-envelope-illustrator.svg"), "utf8"));
});

test("SRC executable generator resolves snapshot-owned aliases from snapshot cwd and tsconfig", () => {
  const root = srcFixture();
  const project = path.resolve(import.meta.dirname, "../..");
  const inputs = [
    "scripts/flame-envelope-assets.ts",
    "src/components/gl/flame-backdrop/appearance.ts",
    "src/components/gl/flame-backdrop/mask/profile.ts",
    "src/components/gl/flame-backdrop/mask/svg.ts"
  ];
  for (const relative of inputs) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.copyFileSync(path.join(project, relative), path.join(root, relative));
  }
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ private: true, type: "module" }));
  fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: {
    target: "ES2022", module: "ESNext", moduleResolution: "Bundler",
    paths: { "@/*": ["./src/*"] }
  } }));
  fs.mkdirSync(path.join(root, "design/flame-envelope"), { recursive: true });
  fs.writeFileSync(path.join(root, "design/flame-envelope/manifest.json"), "{}");
  const reuseInstalledDependencies = (directory: string) => {
    fs.mkdirSync(path.join(directory, "node_modules"));
    for (const name of ["three", "tsx"])
      fs.symlinkSync(fs.realpathSync(path.join(project, "node_modules", name)), path.join(directory, "node_modules", name), "dir");
  };
  const execute = (directory: string, createFixture = false) => {
    const script = `
      import { createHash } from 'node:crypto';
      import { readFileSync, writeFileSync } from 'node:fs';
      import { resolve } from 'node:path';
      import { createMaskAssetSvg, createIllustratorSourceSvg } from './scripts/flame-envelope-assets.ts';
      const svg = createIllustratorSourceSvg();
      const file = 'design/flame-envelope/flame-envelope-illustrator.svg';
      if (process.env.CREATE_FIXTURE === '1') writeFileSync(file, svg);
      const digest = (value) => createHash('sha256').update(value).digest('hex');
      console.log(JSON.stringify({
        maskDigest: digest(createMaskAssetSvg()), illustratorDigest: digest(svg),
        durableMatches: svg === readFileSync(file, 'utf8'),
        ownConfig: process.env.TSX_TSCONFIG_PATH === resolve('tsconfig.json')
      }));`;
    const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: directory,
      env: {
        NODE_ENV: "test",
        NODE_OPTIONS: process.env.NODE_OPTIONS,
        TSX_TSCONFIG_PATH: path.join(directory, "tsconfig.json"),
        TSX_DISABLE_CACHE: "1", CREATE_FIXTURE: createFixture ? "1" : "0"
      },
      encoding: "utf8", timeout: 30_000, maxBuffer: 4096
    });
    assert.equal(child.error === undefined, true, "Isolated generator must complete within its bounded output/time");
    assert.equal(child.status, 0, `Isolated generator stderr digest: ${createHash("sha256").update(child.stderr).digest("hex")}`);
    return JSON.parse(child.stdout) as { maskDigest: string; illustratorDigest: string; durableMatches: boolean; ownConfig: boolean };
  };
  reuseInstalledDependencies(root);
  const original = execute(root, true);
  assert.equal(original.ownConfig, true);
  assert.equal(original.durableMatches, true);
  const destination = path.join(root, ".deployment/runs/src-generator/source");
  const before = sourceFingerprint(root);
  snapshotSource(root, destination);
  assert.equal(sourceFingerprint(destination), before);
  assert.equal(fs.existsSync(path.join(destination, "node_modules")), false);
  reuseInstalledDependencies(destination);
  assert.deepEqual(execute(destination), original);
  const relative = "src/components/gl/flame-backdrop/mask/profile.ts";
  const source = fs.readFileSync(path.join(destination, relative), "utf8");
  const changed = source.replace('"M -15 47"', '"M -14 47"');
  assert.equal(changed !== source, true);
  fs.writeFileSync(path.join(destination, relative), changed);
  assert.notEqual(sourceFingerprint(destination), before);
  const isolated = execute(destination);
  assert.equal(isolated.ownConfig, true);
  assert.equal(isolated.durableMatches, false);
  assert.notEqual(isolated.maskDigest, original.maskDigest);
  assert.notEqual(isolated.illustratorDigest, original.illustratorDigest);
  assert.equal(sourceFingerprint(root), before, "Snapshot edits cannot mutate their source fixture");
});
