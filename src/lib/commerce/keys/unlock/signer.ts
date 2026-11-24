import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { isAddress, isAddressEqual, type Hex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

/*
 * Throwaway Base Sepolia signers live outside the repo, one env file each, at
 * mode 0600 (ADR-0008: the grant signer holds only KEY_GRANTER; the lock
 * manager is a separate authority). Loading never prints, logs or rethrows key
 * material: every refusal is a fixed message with no cause attached.
 */
export const signerDirectory = join(homedir(), ".config", "sphmrs");
export const keyGranterFile = join(signerDirectory, "base-sepolia-key-granter.env");
export const lockManagerFile = join(signerDirectory, "base-sepolia-lock-manager.env");
export type SignerPrefix = "UNLOCK_TEST_GRANTER" | "UNLOCK_TEST_LOCK_MANAGER" | "UNLOCK_LIVE_GRANTER" | "UNLOCK_LIVE_LOCK_MANAGER";

const privateKeyPattern = /^0x[0-9a-f]{64}$/i;

export class SignerLoadError extends Error {
  override name = "SignerLoadError";
}

/** Reads a regular, non-symlinked file owned by `uid` with no group or other access. */
async function readOwnerOnly(file: string, uid: number | undefined): Promise<string> {
  let link: boolean;
  try { link = (await lstat(file)).isSymbolicLink(); } catch { throw new SignerLoadError("Signer file is missing or unreadable"); }
  if (link) throw new SignerLoadError("Signer file must not be a symbolic link");
  let handle;
  try { handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW); } catch { throw new SignerLoadError("Signer file is missing or unreadable"); }
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new SignerLoadError("Signer file must be a regular file");
    if (uid !== undefined && info.uid !== uid) throw new SignerLoadError("Signer file must be owned by the user running this process");
    if ((info.mode & 0o077) !== 0) throw new SignerLoadError("Signer file must be readable by its owner only (mode 0600)");
    return await handle.readFile("utf8");
  } catch (error) {
    if (error instanceof SignerLoadError) throw error;
    throw new SignerLoadError("Signer file is missing or unreadable");
  } finally {
    await handle.close();
  }
}

/** Loads `<prefix>_PRIVATE_KEY` and checks it derives `<prefix>_ADDRESS`. */
export async function loadSignerAccount(file: string, prefix: SignerPrefix, { uid = process.getuid?.() }: { uid?: number } = {}): Promise<PrivateKeyAccount> {
  const text = await readOwnerOnly(file, uid);
  let variables: Record<string, string | undefined>;
  try { variables = parseEnv(text); } catch { throw new SignerLoadError("Signer file could not be parsed"); }
  const key = variables[`${prefix}_PRIVATE_KEY`];
  const expected = variables[`${prefix}_ADDRESS`];
  if (!key || !expected) throw new SignerLoadError("Signer file is missing its key or address");
  if (!privateKeyPattern.test(key)) throw new SignerLoadError("Signer key is not a 32-byte hex value");
  if (!isAddress(expected, { strict: false })) throw new SignerLoadError("Signer address is not an address");
  let account: PrivateKeyAccount;
  try { account = privateKeyToAccount(key as Hex); } catch { throw new SignerLoadError("Signer key is not a valid secp256k1 key"); }
  if (!isAddressEqual(account.address, expected)) throw new SignerLoadError("Signer key does not match its recorded address");
  return account;
}

export function loadKeyGranterAccount(file = keyGranterFile): Promise<PrivateKeyAccount> {
  return loadSignerAccount(file, "UNLOCK_TEST_GRANTER");
}

/** The separate lock-manager authority (ADR-0008), used only to cancel keys (ADR-0009). */
export function loadLockManagerAccount(file = lockManagerFile): Promise<PrivateKeyAccount> {
  return loadSignerAccount(file, "UNLOCK_TEST_LOCK_MANAGER");
}
