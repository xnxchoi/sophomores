// The fixed loopback targets of the opt-in real-PostgreSQL proofs, in one place.
// tests/support/database-proof.mjs and every proof fixture read them from here, so
// the runner's list and the fixtures' checks can't drift apart.
//
// Every port sits below 49152. macOS hands out 49152-65535 as ephemeral ports to any
// process, so a fixed port in that range can be taken by a live process before a
// proof runs (on 23 Nov, 127.0.0.1:55493 went to a running Claude process and the
// super-admin proof couldn't start). The old 55xxx ports moved to 45xxx, keeping
// their last three digits. Ports are unique and clear of 3000 (preview) and 5432
// (local Postgres); the check below enforces that when this module loads.

import { spawnSync } from "node:child_process";
import { createServer } from "node:net";

/** @typedef {{ readonly container: string, readonly port: number, readonly database: string }} ProofTarget */

export const proofTargets = Object.freeze({
  /** I0 payment durability (payment-postgres-fixture default target). */
  paymentDurability: Object.freeze({ container: "sphmrs-i0db-r4-20261113-eda62f07", port: 45476, database: "i0db_proof_r4" }),
  /** I2 reconciliation and the membership-allowance proof that shares its container. */
  reconciliation: Object.freeze({ container: "sphmrs-i2-c4-20261114-86c655af", port: 45490, database: "i2_proof" }),
  sundayMembership: Object.freeze({ container: "sphmrs-sunday-membership-20261114", port: 45491, database: "sunday_membership_proof" }),
  setlistSlots: Object.freeze({ container: "sphmrs-setlist-slots-20261122", port: 45492, database: "setlist_slots_proof" }),
  superAdmin: Object.freeze({ container: "sphmrs-superadmin-20261122", port: 45493, database: "superadmin_proof" }),
  /** The container name is per run (runner: sphmrs-native-edition-<uuid>). */
  nativeEdition: Object.freeze({ container: "sphmrs-native-edition-", port: 45512, database: "native_edition_proof" }),
  cartWriteThrough: Object.freeze({ container: "sphmrs-cart-write-through-20261123", port: 45514, database: "cart_write_through_proof" }),
  nfcStorage: Object.freeze({ container: "sphmrs-nfc-storage-20261122", port: 45516, database: "nfc_storage_proof" }),
  walletAttachment: Object.freeze({ container: "sphmrs-w1-proof-ac40165f", port: 45521, database: "sphmrs_wallet_w1_proof" }),
  walletCatchUp: Object.freeze({ container: "sphmrs-w2-proof-82d38c7c", port: 45522, database: "sphmrs_wallet_w2_proof" }),
  editionSeed: Object.freeze({ container: "sphmrs-edition-seed-proof", port: 45523, database: "sphmrs_edition_seed_proof" }),
});

const ephemeralStart = 49152;
const reserved = new Set([3000, 5432]);
const seen = new Map();
for (const [name, { port }] of Object.entries(proofTargets)) {
  if (!Number.isInteger(port) || port < 1024 || port >= ephemeralStart || reserved.has(port))
    throw new Error(`Proof port for ${name} (${port}) must be 1024-${ephemeralStart - 1} and not 3000 or 5432`);
  if (seen.has(port)) throw new Error(`Proof port ${port} is used by both ${seen.get(port)} and ${name}`);
  seen.set(port, name);
}

/**
 * Who holds 127.0.0.1:<port>, checked before Docker is asked to publish it: "port N in
 * use by pid X (command)", or null when it is free. lsof names the holder (a listener,
 * or a live connection whose local end is that port); a bind test catches a holder
 * lsof can't see.
 * @param {number} port
 * @returns {Promise<string | null>}
 */
export async function portHolder(port) {
  const listed = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-Fpcn"], { encoding: "utf8", maxBuffer: 1 << 20 });
  if (!listed.error && listed.stdout) {
    let pid = "", command = "";
    for (const line of listed.stdout.split("\n")) {
      if (line.startsWith("p")) { pid = line.slice(1); command = ""; }
      else if (line.startsWith("c")) command = line.slice(1);
      else if (line.startsWith("n") && line.slice(1).split("->")[0].endsWith(`:${port}`))
        return `port ${port} in use by pid ${pid}${command ? ` (${command})` : ""}`;
    }
  }
  const free = await new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => server.close(() => resolve(true)));
  });
  return free ? null : `port ${port} in use (holder not visible to lsof)`;
}
