import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import {
  BaseError, ContractFunctionRevertedError, encodeFunctionData, getAddress, isAddressEqual, maxUint256, parseEventLogs, zeroAddress,
  type Abi, type Address, type Hex, type LocalAccount, type Transport,
} from "viem";
import { isTxHash, parseKeyGrantTarget, type KeyGrantAdapter, type KeyGrantTarget, type PrepareOutcome, type ReconcileOutcome, type ReplaceOutcome } from "../contracts";
import { createSignerTransactions, replacementFee, type Inspection } from "./transactions";

/*
 * ADR-0004 chain adapter for an Unlock PublicLock v14, signed by the grant-only
 * signer (ADR-0008). `prepare` signs one grant, `broadcast` sends it once the
 * worker has recorded its hash, `prepareReplacement` re-signs a stuck grant at
 * its own nonce with a higher fee, and `reconcile` reads the receipt. Only Base
 * Sepolia (84532) is enabled (see ./transactions for nonces, fees and depth).
 *
 * Honest outcomes: everything in `prepare` happens before broadcast, so a failure
 * there is `definitelyNotSent`. Any failure from the broadcast call itself is
 * `unknown`, for reconciliation to settle. PublicLock v14 `grantKeys` always
 * mints a new key (it never extends one) and counts expired keys toward
 * `maxKeysPerAddress`, so a recipient who already holds any key on the lock is
 * refused (`recipient_has_key`) rather than given a revert or a second key. A
 * grant is `confirmed` only when its receipt is at the chain's depth and shows
 * exactly one mint, from this lock, to the target.
 */

const lockAbi = PublicLockV14.abi as Abi;

export type UnlockKeyGrantAdapter = KeyGrantAdapter & { inspect(txHash: Hex): Promise<Inspection> };

export type UnlockKeyGrantAdapterOptions = {
  chainID: number;
  account: LocalAccount;
  /** Defaults to the public Base Sepolia RPC. Tests pass a scripted transport. */
  transport?: Transport;
  now?: () => Date;
  /** How long a prepared grant may hold its signer's lane before it expires unsent. */
  holdMs?: number;
};

const notSent = (code: string): PrepareOutcome & ReplaceOutcome => ({ kind: "definitelyNotSent", code });
const unknown: ReconcileOutcome = { kind: "unknown" };
export const reverted = (error: unknown): boolean => error instanceof BaseError && error.walk((cause) => cause instanceof ContractFunctionRevertedError) instanceof ContractFunctionRevertedError;

export function createUnlockKeyGrantAdapter({ chainID, account, transport, now = () => new Date(), holdMs = 60_000 }: UnlockKeyGrantAdapterOptions): UnlockKeyGrantAdapter {
  const chain = createSignerTransactions({ chainID, account, transport, holdMs });
  const { client } = chain;

  /** The target, only if it is well formed and on this adapter's chain. */
  const targetHere = (value: KeyGrantTarget): { lock: Address; recipient: Address } | "invalid" | "elsewhere" => {
    // Chain first, so a refused chain is refused the same way whatever the shared contract lists.
    if (value?.chainID !== chainID) return "elsewhere";
    let target: KeyGrantTarget;
    try { target = parseKeyGrantTarget(value); } catch { return "invalid"; }
    return { lock: getAddress(target.lock), recipient: getAddress(target.recipient) };
  };

  /** `grantKeys` arguments: expiry and supply are the lock's own configuration, not decided here. */
  async function grantCall(target: { lock: Address; recipient: Address }): Promise<{ to: Address; data: Hex }> {
    const duration = await client.readContract({ address: target.lock, abi: lockAbi, functionName: "expirationDuration" }) as bigint;
    const expiry = duration === maxUint256 ? maxUint256 : BigInt(Math.floor(now().getTime() / 1000)) + duration;
    const args = [[target.recipient], [expiry], [zeroAddress]] as const;
    await client.simulateContract({ account, address: target.lock, abi: lockAbi, functionName: "grantKeys", args });
    return { to: target.lock, data: encodeFunctionData({ abi: lockAbi, functionName: "grantKeys", args }) };
  }

  return {
    signer: chain.signer,
    inspect: chain.inspect,

    async prepare({ target: value, nonceFloor }) {
      const target = targetHere(value);
      if (target === "invalid") return notSent("invalid_target");
      if (target === "elsewhere") return notSent("chain_not_enabled");
      const release = await chain.hold();
      try {
        if (!(await chain.onChain())) { release(); return notSent("chain_mismatch"); }
        const held = await client.readContract({ address: target.lock, abi: lockAbi, functionName: "totalKeys", args: [target.recipient] }) as bigint;
        if (held > 0n) { release(); return notSent("recipient_has_key"); }
        const call = await grantCall(target);
        const signed = await chain.sign(release, { ...call, nonce: await chain.nextNonce(nonceFloor) });
        if (signed === "fee_above_ceiling") { release(); return notSent(signed); }
        return { kind: "prepared", ...signed };
      } catch (error) {
        release();
        return notSent(reverted(error) ? "simulation_reverted" : "rpc_unavailable");
      }
    },

    async prepareReplacement({ target: value, nonce, previous }) {
      const target = targetHere(value);
      if (target === "invalid") return notSent("invalid_target");
      if (target === "elsewhere") return notSent("chain_not_enabled");
      const release = await chain.hold();
      try {
        if (!(await chain.onChain())) { release(); return notSent("chain_mismatch"); }
        // Exactly one transaction per nonce can mine; once the chain counts this one as used, reconcile settles it.
        if (await chain.nonceConsumed(nonce)) { release(); return { kind: "nonceConsumed" }; }
        const fees = replacementFee(previous, await chain.estimateFees(), chain.ceiling);
        if (!fees) { release(); return notSent("fee_ceiling_reached"); }
        const call = await grantCall(target);
        const signed = await chain.sign(release, { ...call, nonce, fees });
        if (signed === "fee_above_ceiling") { release(); return notSent("fee_ceiling_reached"); }
        return { kind: "prepared", txHash: signed.txHash, raw: signed.raw, fee: signed.fee };
      } catch (error) {
        release();
        return notSent(reverted(error) ? "simulation_reverted" : "rpc_unavailable");
      }
    },

    broadcast: ({ txHash }) => chain.broadcast({ txHash }),
    release: ({ txHash }) => chain.release({ txHash }),
    rebroadcast: ({ raw }) => chain.rebroadcast({ raw }),

    async reconcile({ txHash, target: value }) {
      const target = targetHere(value);
      if (typeof target === "string" || !isTxHash(txHash)) return unknown;
      const receipt = await chain.buriedReceipt(txHash as Hex, target.lock);
      if (!receipt) return unknown; // not mined, not deep enough yet, or not provable; recheck later
      if (receipt.status !== "success") return { kind: "definitelyReverted", code: "tx_reverted" };
      const transfers = parseEventLogs({ abi: lockAbi, eventName: "Transfer", logs: receipt.logs })
        .filter((log) => isAddressEqual(log.address, target.lock)) as unknown as { args: { from: Address; to: Address; tokenId: bigint } }[];
      if (transfers.length !== 1) return unknown;
      const [{ args }] = transfers;
      if (!isAddressEqual(args.from, zeroAddress) || !isAddressEqual(args.to, target.recipient)) return unknown;
      return { kind: "confirmed", tokenID: args.tokenId.toString() };
    },
  };
}
