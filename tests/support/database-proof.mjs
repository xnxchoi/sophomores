import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

// Opt-in real-PostgreSQL proofs. Each proof gets the exact disposable loopback
// container its fixture inspects (name, port, database, 384 MiB, named volume),
// and the container and volume are removed afterwards, pass or fail.
// No application .env or DATABASE_URI is read. The I0 payment-durability and I2
// reconciliation proofs predate the reconciliation gate and are retired with the
// I2 machinery when the standard settle replaces it.
const proofs = [
  {
    file: "tests/commerce/core/membership-grant.db.test.ts",
    flag: "SUNDAY_MEMBERSHIP_DATABASE_TESTS",
    container: "sphmrs-sunday-membership-20261114", port: 55491, database: "sunday_membership_proof",
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
function remove(proof) {
  docker("rm", "--force", "--volumes", proof.container);
  docker("volume", "rm", "--force", `${proof.container}-data`);
}

let failed = false;
for (const proof of proofs) {
  remove(proof);
  const started = docker("run", "--detach", "--name", proof.container,
    "--memory", "384m", "--publish", `127.0.0.1:${proof.port}:5432`,
    "--volume", `${proof.container}-data:/var/lib/postgresql/data`,
    "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--env", `POSTGRES_DB=${proof.database}`, image);
  if (started.status !== 0) {
    console.error(`Could not start the ${proof.container} proof database: ${started.stderr.trim().slice(0, 300)}`);
    failed = true;
    continue;
  }
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60 && !ready; attempt += 1) {
      ready = docker("exec", proof.container, "pg_isready", "-U", "postgres", "-d", proof.database).status === 0;
      if (!ready) await delay(1000);
    }
    if (!ready) throw new Error(`${proof.container} did not become ready`);
    const run = spawnSync(process.execPath, [
      "--import", "tsx", "--import", "./tests/support/css-modules.mjs",
      "--test", "--test-concurrency=1", proof.file,
    ], {
      stdio: "inherit",
      env: {
        ...process.env, [proof.flag]: "1", DISABLE_PAYLOAD_HMR: "true", GOMAXPROCS: "1",
        TSX_TSCONFIG_PATH: fileURLToPath(new URL("../tsconfig.json", import.meta.url)),
      },
    });
    if (run.error) throw run.error;
    failed ||= run.status !== 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Database proof failed");
    failed = true;
  } finally {
    remove(proof);
  }
}
process.exit(failed ? 1 : 0);
