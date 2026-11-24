import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import { decodeFunctionData, encodeFunctionData, getAddress, isAddressEqual, parseEventLogs, type Abi, type Address, type Hex, type LocalAccount, type Transport } from "viem";
import { isTxHash, parseKeyGrantTarget, type CancelPrepareOutcome, type CancelReconcileOutcome, type KeyCancelAdapter, type KeyGrantTarget, type ReplaceOutcome } from "../contracts";
import { reverted } from "./adapter";
import { POLYGON_CHAIN_ID, polygonEventLocks, polygonLockPinned, POLYGON_SIGNET_LOCK } from "./polygon";
import { createSignerTransactions, replacementFee } from "./transactions";

/*
 * ADR-0009 cancel adapter for an Unlock PublicLock v14, signed by the separate
 * lock-manager authority (ADR-0008), never the grant signer: before signing it
 * checks on chain that its account is a lock manager, and the grant signer is
 * not one.
 *
 * Function: `expireAndRefundFor(tokenId, 0)` (PublicLockV14.sol, MixinRefunds).
 * - Only a lock manager may call it (`_onlyLockManager`), which is the separate
 *   cancel authority. `cancelAndRefund` is also callable by the key's owner,
 *   key manager or an approved address, and pays a refund computed from the
 *   lock's price out of the lock; the KRW refund is PortOne's, so the on-chain
 *   refund here is an explicit zero.
 * - It expires the key at the block's timestamp, keeps the ownership record
 *   (token and owner stay readable as evidence), clears the original duration
 *   and price so the key can never renew, and emits
 *   `CancelKey(tokenId, owner, sendTo, refund)`, which reconcile matches
 *   exactly. `setKeyExpiration` emits only `ExpirationChanged` and leaves the
 *   key renewable; `burn` destroys the record and is a transfer subject to the
 *   lock's transfer rules.
 * - It reverts `KEY_NOT_VALID` on a key that is already invalid, so `isValidKey`
 *   is read first: no transaction only if invalidity also holds at confirmation depth.
 * - The ownership record stays, so `totalKeys(recipient)` stays at least 1: a
 *   later grant to the same recipient parks as `recipient_has_key` for a person.
 *
 * A stuck cancel is re-sent from its recorded bytes, or re-signed at its own
 * nonce with a higher fee (`prepareCancelReplacement`), like a stuck grant.
 */

const lockAbi = PublicLockV14.abi as Abi;
const tokenPattern = /^[1-9]\d{0,76}$/;

export type UnlockKeyCancelAdapterOptions = {
  chainID: number; account: LocalAccount; transport?: Transport; holdMs?: number;
  /** Where the go-live switch is read (default: process.env). */
  env?: Readonly<Record<string, string | undefined>>;
  /** On Polygon, the Signet lock (default: the pinned one); the configured event locks are also accepted. */
  polygonLock?: Address;
};

const notSent = (code: string): CancelPrepareOutcome => ({ kind: "definitelyNotSent", code });
const unknown: CancelReconcileOutcome = { kind: "unknown" };

export function createUnlockKeyCancelAdapter({ chainID, account, transport, holdMs = 60_000, env, polygonLock = POLYGON_SIGNET_LOCK }: UnlockKeyCancelAdapterOptions): KeyCancelAdapter {
  const pins = { lock: polygonLock, eventLocks: chainID === POLYGON_CHAIN_ID ? polygonEventLocks(env) : [], granter: polygonLock };
  const chain = createSignerTransactions({ chainID, account, transport, holdMs, env });
  const { client } = chain;
  const read = (lock: Address, functionName: string, args: unknown[], blockHash?: Hex) => client.readContract({
    address: lock, abi: lockAbi, functionName, args, ...(blockHash ? { blockHash, requireCanonical: true } : {}),
  });

  const targetHere = (value: KeyGrantTarget): { lock: Address; recipient: Address } | "invalid" | "elsewhere" | "unpinned" => {
    if (value?.chainID !== chainID) return "elsewhere";
    let target: KeyGrantTarget;
    try { target = parseKeyGrantTarget(value); } catch { return "invalid"; }
    if (chainID === POLYGON_CHAIN_ID && !polygonLockPinned(target.lock, pins)) return "unpinned";
    return { lock: getAddress(target.lock), recipient: getAddress(target.recipient) };
  };

  return {
    signer: chain.signer,

    async prepareCancel({ target: value, tokenID, nonceFloor }) {
      const target = targetHere(value);
      if (target === "invalid") return notSent("invalid_target");
      if (target === "elsewhere") return notSent("chain_not_enabled");
      if (target === "unpinned") return notSent("lock_not_enabled");
      if (!tokenPattern.test(tokenID)) return notSent("invalid_token");
      const token = BigInt(tokenID);
      const release = await chain.hold();
      try {
        if (!(await chain.onChain())) { release(); return notSent("chain_mismatch"); }
        if (await read(target.lock, "isLockManager", [chain.address]) !== true) { release(); return notSent("not_lock_manager"); }
        const owner = await read(target.lock, "ownerOf", [token]) as Address;
        if (!isAddressEqual(owner, target.recipient)) { release(); return notSent("token_mismatch"); }
        const valid = await read(target.lock, "isValidKey", [token]);
        if (valid === false) {
          const blockHash = await chain.buriedBlockHash();
          if (!blockHash || await read(target.lock, "isValidKey", [token], blockHash) !== false) {
            release(); return notSent("key_invalidity_unconfirmed");
          }
          const buriedOwner = await read(target.lock, "ownerOf", [token], blockHash) as Address;
          release();
          return isAddressEqual(buriedOwner, target.recipient) ? { kind: "confirmedKeyInvalid" } : notSent("key_invalidity_unconfirmed");
        }
        if (valid !== true) { release(); return notSent("key_invalidity_unconfirmed"); }
        const args = [token, 0n] as const;
        await client.simulateContract({ account, address: target.lock, abi: lockAbi, functionName: "expireAndRefundFor", args });
        const signed = await chain.sign(release, { to: target.lock, data: encodeFunctionData({ abi: lockAbi, functionName: "expireAndRefundFor", args }), nonce: await chain.nextNonce(nonceFloor) });
        if (signed === "fee_above_ceiling") { release(); return notSent(signed); }
        return { kind: "prepared", ...signed };
      } catch (error) {
        release();
        return notSent(reverted(error) ? "simulation_reverted" : "rpc_unavailable");
      }
    },

    async prepareCancelReplacement({ target: value, tokenID, nonce, previous }): Promise<ReplaceOutcome> {
      const target = targetHere(value);
      if (target === "invalid") return { kind: "definitelyNotSent", code: "invalid_target" };
      if (target === "elsewhere") return { kind: "definitelyNotSent", code: "chain_not_enabled" };
      if (target === "unpinned") return { kind: "definitelyNotSent", code: "lock_not_enabled" };
      if (!tokenPattern.test(tokenID)) return { kind: "definitelyNotSent", code: "invalid_token" };
      const release = await chain.hold();
      try {
        if (!(await chain.onChain())) { release(); return { kind: "definitelyNotSent", code: "chain_mismatch" }; }
        // Exactly one transaction per nonce can mine; once the chain counts this one as used, reconcile settles it.
        if (await chain.nonceConsumed(nonce)) { release(); return { kind: "nonceConsumed" }; }
        if (await read(target.lock, "isLockManager", [chain.address]) !== true) { release(); return { kind: "definitelyNotSent", code: "not_lock_manager" }; }
        const fees = replacementFee(previous, await chain.estimateFees(), chain.ceiling);
        if (!fees) { release(); return { kind: "definitelyNotSent", code: "fee_ceiling_reached" }; }
        const args = [BigInt(tokenID), 0n] as const;
        await client.simulateContract({ account, address: target.lock, abi: lockAbi, functionName: "expireAndRefundFor", args });
        const signed = await chain.sign(release, { to: target.lock, data: encodeFunctionData({ abi: lockAbi, functionName: "expireAndRefundFor", args }), nonce, fees });
        if (signed === "fee_above_ceiling") { release(); return { kind: "definitelyNotSent", code: "fee_ceiling_reached" }; }
        return { kind: "prepared", txHash: signed.txHash, raw: signed.raw, fee: signed.fee };
      } catch (error) {
        release();
        return { kind: "definitelyNotSent", code: reverted(error) ? "simulation_reverted" : "rpc_unavailable" };
      }
    },

    broadcast: ({ txHash }) => chain.broadcast({ txHash }),
    release: ({ txHash }) => chain.release({ txHash }),
    // Only the record's own expireAndRefundFor call is re-sent: to its lock (the pinned one on Polygon), for its token.
    rebroadcast: (record) => chain.rebroadcast(record, ({ to, data }, { target: value, tokenID }) => {
      const target = targetHere(value);
      if (typeof target === "string" || !tokenID || !tokenPattern.test(tokenID) || !isAddressEqual(to, target.lock)) return false;
      try {
        const call = decodeFunctionData({ abi: lockAbi, data });
        return call.functionName === "expireAndRefundFor" && call.args?.[0] === BigInt(tokenID);
      } catch { return false; }
    }),

    /** `confirmed` only for exactly one `CancelKey` of this token, from this lock, with no refund, at the chain's depth. */
    async reconcileCancel({ txHash, target: value, tokenID }) {
      const target = targetHere(value);
      if (typeof target === "string" || !isTxHash(txHash) || !tokenPattern.test(tokenID)) return unknown;
      const receipt = await chain.buriedReceipt(txHash as Hex, target.lock);
      if (!receipt) return unknown;
      if (receipt.status !== "success") return { kind: "definitelyReverted", code: "tx_reverted" };
      const cancels = parseEventLogs({ abi: lockAbi, eventName: "CancelKey", logs: receipt.logs })
        .filter((log) => isAddressEqual(log.address, target.lock)) as unknown as { args: { tokenId: bigint; refund: bigint } }[];
      if (cancels.length !== 1) return unknown;
      const [{ args }] = cancels;
      return args.tokenId === BigInt(tokenID) && args.refund === 0n ? { kind: "confirmed" } : unknown;
    },
  };
}
