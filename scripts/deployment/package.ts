import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const directories = [
  "app",
  "components",
  "flame-backdrop",
  "hooks",
  "lib",
  "utils",
  "public",
  "styles",
  "tests",
  "scripts/deployment"
];
const files = [
  "proxy.ts",
  "fonts.ts",
  "scripts/flame-envelope-assets.ts",
  "design/flame-envelope/manifest.json",
  "design/flame-envelope/flame-envelope-illustrator.svg",
  "deployment/ops/sophomores-preview.conf",
  "deployment/ops/certbot-reload-sophomores-preview.sh",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
  ".prettierrc",
  "next-env.d.ts",
  "deployment/Dockerfile",
  "deployment/Dockerfile.dockerignore",
  "deployment/local.json",
  "scripts/deploy.ts"
];
const mandatory = new Set([
  "proxy.ts",
  "app",
  "public",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "deployment/Dockerfile",
  "deployment/Dockerfile.dockerignore"
]);
type Entry = Readonly<{
  relative: string;
  mode: number;
  digest: string;
  directory: boolean;
}>;

function assertSafeName(name: string): void {
  if (
    /^(?:\.(?:env|sops|ssh|aws|npmrc|netrc|pypirc)|id_(?:rsa|ed25519|ecdsa)|credentials|secrets?(?:[._-]|$)|keys?$)|\.(?:pem|key|p12|pfx|jks)$/i.test(
      name
    )
  ) {
    throw new Error(`Sensitive or secret-like build input rejected: ${name}`);
  }
}

function inspect(root: string, relative: string): Entry[] {
  const absolute = path.join(root, relative);
  assertSafeName(path.basename(relative));
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink())
    throw new Error(`Symlink build input rejected: ${relative}`);
  if (fs.realpathSync(absolute) !== absolute)
    throw new Error(`Symlink parent rejected: ${relative}`);
  if (stat.isDirectory()) {
    return [
      { relative, mode: 0o755, digest: "", directory: true },
      ...fs
        .readdirSync(absolute)
        .sort()
        .flatMap((name) => inspect(root, path.join(relative, name)))
    ];
  }
  if (!stat.isFile())
    throw new Error(`Unsupported build input type: ${relative}`);
  const handle = fs.openSync(
    absolute,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
  );
  try {
    const digest = createHash("sha256")
      .update(fs.readFileSync(handle))
      .digest("hex");
    return [
      {
        relative,
        mode: stat.mode & 0o111 ? 0o755 : 0o644,
        digest,
        directory: false
      }
    ];
  } finally {
    fs.closeSync(handle);
  }
}

function manifest(root: string): Entry[] {
  return [...directories, ...files]
    .flatMap((relative) => {
      const absolute = path.join(root, relative);
      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(absolute);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        if (mandatory.has(relative))
          throw new Error(`Missing required build input: ${relative}`);
        return [];
      }
      if (stat.isSymbolicLink())
        throw new Error(`Symlink build input rejected: ${relative}`);
      if (directories.includes(relative) !== stat.isDirectory())
        throw new Error(
          `Unexpected build input type (file/directory): ${relative}`
        );
      return inspect(root, relative);
    })
    .sort((a, b) =>
      a.relative < b.relative ? -1 : a.relative > b.relative ? 1 : 0
    );
}

function fingerprint(entries: Entry[]): string {
  return createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}

/** Only selected build inputs contribute; ignored workspace/private files never enter the context. */
export function sourceFingerprint(root: string): string {
  return fingerprint(manifest(fs.realpathSync(root)));
}

function prepareDestination(root: string, destination: string): void {
  if (!path.isAbsolute(destination))
    throw new Error("Snapshot destination must be absolute");
  const relative = path.relative(root, destination);
  if (!/^\.deployment\/runs\/[^/]+\/source$/.test(relative)) {
    throw new Error(
      "Snapshot destination must be .deployment/runs/<run-id>/source, outside build inputs"
    );
  }
  const parts = relative.split(path.sep);
  for (let index = 1; index < parts.length; index++) {
    const ancestor = path.join(root, ...parts.slice(0, index));
    try {
      const stat = fs.lstatSync(ancestor);
      if (stat.isSymbolicLink())
        throw new Error(`Symlink destination parent rejected: ${ancestor}`);
      if (!stat.isDirectory())
        throw new Error("Destination parent is not a directory");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      fs.mkdirSync(ancestor, { mode: 0o700 });
    }
  }
  fs.mkdirSync(destination, { mode: 0o700 }); // Exclusive: never overwrite an earlier or interrupted run.
}

function copyEntry(root: string, destination: string, entry: Entry): void {
  const target = path.join(destination, entry.relative);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
  if (entry.directory) {
    fs.mkdirSync(target, { recursive: true, mode: entry.mode });
    return;
  }
  const source = path.join(root, entry.relative);
  if (fs.realpathSync(source) !== source)
    throw new Error("Source changed to a symlink during snapshot");
  const handle = fs.openSync(
    source,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
  );
  try {
    fs.writeFileSync(target, fs.readFileSync(handle), {
      flag: "wx",
      mode: entry.mode
    });
  } finally {
    fs.closeSync(handle);
  }
}

/** Creates an exclusive local snapshot; never executes a build or accesses the network. */
export function snapshotSource(
  root: string,
  destination: string
): { fingerprint: string } {
  if (!path.isAbsolute(destination))
    throw new Error("Snapshot destination must be absolute");
  const canonicalRoot = fs.realpathSync(root);
  const canonicalDestination = path.resolve(
    canonicalRoot,
    path.relative(path.resolve(root), destination)
  );
  const entries = manifest(canonicalRoot);
  const before = fingerprint(entries);
  prepareDestination(canonicalRoot, canonicalDestination);
  try {
    entries.forEach((entry) =>
      copyEntry(canonicalRoot, canonicalDestination, entry)
    );
    if (
      sourceFingerprint(canonicalRoot) !== before ||
      sourceFingerprint(canonicalDestination) !== before
    ) {
      throw new Error(
        "Source changed during snapshot; retry after edits have stopped"
      );
    }
    return { fingerprint: before };
  } catch (error) {
    fs.rmSync(canonicalDestination, { recursive: true, force: true });
    throw error;
  }
}
