import { createHash } from "node:crypto";
import {
  createReadStream,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { resolve } from "node:path";
import { snapshotSource, sourceFingerprint } from "./package";

export type ActionContext = {
  root: string;
  runDir: string;
  release: string;
  platform: string;
};
export type DockerCommand = (argv: readonly string[]) => Promise<string>;
type Image = { id: string; release: string; platform: string };

function read<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(resolve(dir, file), "utf8")) as T;
}
function write(dir: string, file: string, value: unknown) {
  const path = resolve(dir, file);
  writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
}
async function checksum(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
function validate(context: ActionContext) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(context.release))
    throw new Error("Invalid release ID");
  if (!["linux/amd64", "linux/arm64"].includes(context.platform))
    throw new Error("Invalid target platform");
}
async function inspectImage(
  c: ActionContext,
  docker: DockerCommand
): Promise<Image> {
  const [image] = JSON.parse(
    await docker(["image", "inspect", `sophomores:${c.release}`])
  );
  if (
    !/^sha256:[a-f0-9]{64}$/.test(image?.Id) ||
    image.Config?.Labels?.["co.sophomores.release"] !== c.release ||
    `${image.Os}/${image.Architecture}` !== c.platform
  ) {
    throw new Error("Image identity/platform mismatch");
  }
  return { id: image.Id, release: c.release, platform: c.platform };
}
async function checkedImage(c: ActionContext, docker: DockerCommand) {
  const image = await inspectImage(c, docker);
  const recorded = read<Image>(c.runDir, "image.json");
  if (JSON.stringify(image) !== JSON.stringify(recorded))
    throw new Error("Image identity changed; use a new release");
  return image;
}
function checkSnapshot(c: ActionContext) {
  const expected = read<{ fingerprint: string }>(
    c.runDir,
    "snapshot.json"
  ).fingerprint;
  if (
    sourceFingerprint(resolve(c.runDir, "source")) !== expected ||
    sourceFingerprint(c.root) !== expected
  ) {
    throw new Error("Source snapshot changed; start a new run");
  }
}

// Packaging-only probe: the explicit public opt-out is limited to the no-network,
// no-published-port disposable container below. It is not private-preview acceptance.
const probe = String.raw`
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:3000/', {signal: AbortSignal.timeout(2000)});
      if (response.status !== 200) throw Error('page');
      const html = await response.text();
      const asset = html.match(/\/_next\/static\/[^\s"'<>]+/);
      if (!asset) throw Error('static asset missing');
      for (const path of [asset[0].replaceAll('&amp;', '&'), '/favicon.ico']) {
        const r = await fetch('http://127.0.0.1:3000' + path, {signal: AbortSignal.timeout(2000)});
        if (r.status !== 200) throw Error('asset');
        await r.arrayBuffer();
      }
      return;
    } catch { await sleep(1000); }
  }
  process.exitCode = 1;
}
main().catch(() => { process.exitCode = 1; });`;

async function smoke(c: ActionContext, docker: DockerCommand) {
  const image = await checkedImage(c, docker);
  const name = `sophomores-check-${c.release}`;
  // A previous crash may have left this name occupied. Never replace it blindly.
  await docker([
    "run",
    "-d",
    "--name",
    name,
    "--label",
    `co.sophomores.release=${c.release}`,
    "--network",
    "none",
    "--env",
    "PREVIEW_AUTH_MODE=public",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--pids-limit",
    "128",
    "--memory",
    "1g",
    "--cpus",
    "1",
    image.id
  ]);
  const [container] = JSON.parse(await docker(["container", "inspect", name]));
  if (
    !container?.Id ||
    container.Config?.Labels?.["co.sophomores.release"] !== c.release
  ) {
    throw new Error("Candidate ownership mismatch; manual inspection required");
  }
  try {
    await docker(["exec", container.Id, "node", "-e", probe]);
  } finally {
    await docker(["rm", "-f", container.Id]);
  }
  write(c.runDir, "smoke.json", {
    ...image,
    checkedAt: new Date().toISOString()
  });
}

/** Local-only stages. Network/account/provider mutations are deliberately not implemented here. */
export async function deploymentAction(
  action: string,
  c: ActionContext,
  docker: DockerCommand
): Promise<void> {
  validate(c);
  switch (action) {
    case "snapshot":
      write(
        c.runDir,
        "snapshot.json",
        snapshotSource(c.root, resolve(c.runDir, "source"))
      );
      return;
    case "check-snapshot":
      checkSnapshot(c);
      return;
    case "check-retry-snapshot":
      if (
        existsSync(resolve(c.runDir, "source")) ||
        existsSync(resolve(c.runDir, "snapshot.json"))
      )
        throw new Error(
          "Snapshot has partial or complete evidence; inspect before resetting"
        );
      return;
    case "check-retry-build":
      checkSnapshot(c);
      if (
        existsSync(resolve(c.runDir, "image.json")) ||
        (
          await docker(["image", "ls", "--quiet", `sophomores:${c.release}`])
        ).trim()
      )
        throw new Error("Build image exists; inspect before resetting");
      return;
    case "check-retry-smoke":
      await checkedImage(c, docker);
      if (
        (
          await docker([
            "ps",
            "-aq",
            "--filter",
            `name=^/sophomores-check-${c.release}$`
          ])
        ).trim()
      )
        throw new Error(
          "Candidate container remains; inspect before resetting"
        );
      return;
    case "check-retry-export":
      await checkedImage(c, docker);
      if (
        existsSync(resolve(c.runDir, "image.tar")) ||
        existsSync(resolve(c.runDir, "artifact.json"))
      )
        throw new Error("Export artifact exists; inspect before resetting");
      return;
    case "build": {
      checkSnapshot(c);
      if (
        (
          await docker(["image", "ls", "--quiet", `sophomores:${c.release}`])
        ).trim()
      )
        throw new Error(
          "Release image tag already exists; inspect it or use a new run"
        );
      await docker([
        "buildx",
        "build",
        "--builder",
        "default",
        "--load",
        "--platform",
        c.platform,
        "--build-arg",
        `RELEASE_ID=${c.release}`,
        "--label",
        `co.sophomores.release=${c.release}`,
        "--tag",
        `sophomores:${c.release}`,
        "--file",
        resolve(c.runDir, "source/deployment/Dockerfile"),
        resolve(c.runDir, "source")
      ]);
      write(c.runDir, "image.json", await inspectImage(c, docker));
      return;
    }
    case "check-build":
      await checkedImage(c, docker);
      return;
    case "smoke":
      await smoke(c, docker);
      return;
    case "check-smoke": {
      const image = await checkedImage(c, docker);
      const evidence = read<Image>(c.runDir, "smoke.json");
      if (
        evidence.id !== image.id ||
        evidence.release !== c.release ||
        evidence.platform !== c.platform
      )
        throw new Error("Smoke evidence is stale");
      return;
    }
    case "export": {
      const image = await checkedImage(c, docker);
      const path = resolve(c.runDir, "image.tar");
      await docker(["image", "save", "--output", `${path}.tmp`, image.id]);
      renameSync(`${path}.tmp`, path);
      write(c.runDir, "artifact.json", {
        ...image,
        sha256: await checksum(path)
      });
      return;
    }
    case "check-export": {
      const image = await checkedImage(c, docker);
      const artifact = read<Image & { sha256: string }>(
        c.runDir,
        "artifact.json"
      );
      if (
        artifact.id !== image.id ||
        artifact.release !== c.release ||
        artifact.platform !== c.platform ||
        artifact.sha256 !== (await checksum(resolve(c.runDir, "image.tar")))
      )
        throw new Error("Artifact identity/checksum mismatch");
      return;
    }
    default:
      throw new Error("Unknown deployment action");
  }
}
