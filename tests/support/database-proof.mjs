import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

// Opt-in real-PostgreSQL proofs. Each proof gets the exact disposable loopback
// container its fixture inspects (name, port, database, 384 MiB, named volume).
// A container that already exists under that name belongs to another run (such as
// the standalone reconciliation proof), so the proof is refused and nothing of it
// is touched. The volume is named per run, and only this run's container ID and
// labelled volume are removed.
// No application .env or DATABASE_URI is read. The I0 payment-durability and I2
// reconciliation proofs predate the reconciliation gate and are retired with the
// I2 machinery when the standard settle replaces it.
const proofs = [
  {
    file: "tests/commerce/core/membership-grant.db.test.ts",
    flag: "SUNDAY_MEMBERSHIP_DATABASE_TESTS",
    container: "sphmrs-sunday-membership-20261114", port: 55491, database: "sunday_membership_proof",
  },
  {
    // Single membership token per account: cross-product allowance, release and
    // retry, and the keyset live-key fence. Its fixture pins this exact container.
    file: "tests/commerce/domain/membership-allowance.db.test.ts",
    flag: "COMMERCE_PAYLOAD_DATABASE_TESTS",
    container: "sphmrs-i2-c4-20261114-86c655af", port: 55491, database: "i2_proof",
  },
];
const image = "postgres:16";

const args = process.argv.slice(2);
for (const arg of args) if (arg !== "--list") throw new Error(`Unknown database proof argument: ${arg}`);
if (args.includes("--list")) {
  console.log(JSON.stringify(proofs.map((proof) => proof.file)));
  process.exit(0);
}

const docker = (...dockerArgs) => spawnSync("docker", dockerArgs, { encoding: "utf8", maxBuffer: 1 << 20 });
const runLabel = "sphmrs.database-proof.run";
const runID = randomUUID();
const exists = (kind, name) => docker(kind, "inspect", "--format", "{{.Name}}", name).status === 0;
// Cleanup acts only on this run's immutable container ID and its per-run volume
// name; a failed removal is reported and fails the run rather than being ignored.
function cleanup(owned) {
  let ok = true;
  if (owned.containerID) {
    const removed = docker("rm", "--force", owned.containerID);
    if (removed.status !== 0) { ok = false; console.error(`Could not remove proof container ${owned.containerID}: ${removed.stderr.trim().slice(0, 300)}`); }
  }
  if (owned.volume) {
    const label = docker("volume", "inspect", "--format", `{{ index .Labels "${runLabel}" }}`, owned.volume);
    if (label.status === 0 && label.stdout.trim() === runID) {
      const removed = docker("volume", "rm", owned.volume);
      if (removed.status !== 0) { ok = false; console.error(`Could not remove proof volume ${owned.volume}: ${removed.stderr.trim().slice(0, 300)}`); }
    } else if (label.status === 0) { ok = false; console.error(`Proof volume ${owned.volume} is not this run's; left in place.`); }
    else {
      // A failed inspection is not proof of absence: confirm it, or report cleanup as unknown.
      const listed = docker("volume", "ls", "--quiet", "--filter", `name=^${owned.volume}$`);
      if (listed.status !== 0 || listed.stdout.trim() !== "") { ok = false; console.error(`Cleanup of proof volume ${owned.volume} is unknown; check it by hand.`); }
    }
  }
  return ok;
}

let failed = false;
for (const proof of proofs) {
  // A per-run volume name cannot collide with another run's; the container name is fixed by its fixture.
  const volume = `${proof.container}-data-${runID.slice(0, 8)}`;
  const owned = {};
  if (exists("container", proof.container)) {
    console.error(`Refusing the ${proof.container} proof: a container with that name already exists and may belong to another run.`);
    failed = true;
    continue;
  }
  try {
    const created = docker("volume", "create", "--label", `${runLabel}=${runID}`, volume);
    if (created.status !== 0) throw new Error(`Could not create the ${volume} proof volume: ${created.stderr.trim().slice(0, 300)}`);
    // `volume create` succeeds on an existing name; use the volume only if it carries this run's label.
    const label = docker("volume", "inspect", "--format", `{{ index .Labels "${runLabel}" }}`, volume);
    if (label.status !== 0 || label.stdout.trim() !== runID) throw new Error(`Refusing the ${proof.container} proof: volume ${volume} is not this run's.`);
    owned.volume = volume;
    const container = docker("create", "--name", proof.container, "--label", `${runLabel}=${runID}`,
      "--memory", "384m", "--publish", `127.0.0.1:${proof.port}:5432`,
      "--volume", `${volume}:/var/lib/postgresql/data`,
      "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--env", `POSTGRES_DB=${proof.database}`, image);
    if (container.status !== 0) throw new Error(`Could not create the ${proof.container} proof database: ${container.stderr.trim().slice(0, 300)}`);
    owned.containerID = container.stdout.trim();
    const started = docker("start", owned.containerID);
    if (started.status !== 0) {
      // The proofs share one loopback port machine-wide: say so plainly, then clean up as usual.
      if (/port is already allocated/i.test(started.stderr)) console.error(`port ${proof.port} busy: another proof run is active`);
      throw new Error(`Could not start the ${proof.container} proof database: ${started.stderr.trim().slice(0, 300)}`);
    }
    let ready = false;
    for (let attempt = 0; attempt < 60 && !ready; attempt += 1) {
      ready = docker("exec", owned.containerID, "pg_isready", "-U", "postgres", "-d", proof.database).status === 0;
      if (!ready) await delay(1000);
    }
    if (!ready) throw new Error(`${proof.container} did not become ready`);
    const run = spawnSync(process.execPath, [
      "--import", "tsx", "--import", "./tests/support/css-modules.mjs",
      "--test", "--test-concurrency=1", proof.file,
    ], {
      stdio: "inherit",
      env: {
        ...process.env, [proof.flag]: "1", DISABLE_PAYLOAD_HMR: "true", GOMAXPROCS: "1", SPHMRS_PROOF_VOLUME: volume,
        TSX_TSCONFIG_PATH: fileURLToPath(new URL("../tsconfig.json", import.meta.url)),
      },
    });
    if (run.error) throw run.error;
    failed ||= run.status !== 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Database proof failed");
    failed = true;
  } finally {
    if (!cleanup(owned)) failed = true;
  }
}
process.exit(failed ? 1 : 0);
