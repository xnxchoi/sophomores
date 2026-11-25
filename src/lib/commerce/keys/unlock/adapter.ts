import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import {
  BaseError, ContractFunctionRevertedError, decodeFunctionData, encodeFunctionData, getAddress, isAddressEqual, maxUint256, parseEventLogs, zeroAddress,
  type Abi, type Address, type Hex, type LocalAccount, type Transport,
} from "viem";
import { isTxHash, parseKeyGrantTarget, type KeyGrantAdapter, type KeyGrantTarget, type PrepareOutcome, type ReconcileOutcome, type ReplaceOutcome } from "../contracts";
import { POLYGON_CHAIN_ID, polygonEventLocks, polygonLockPinned, polygonPins, polygonRoleHookClear, roleHookSet, type PolygonPins } from "./polygon";
import type { KeyStateReader } from "../worker";
import { beyondAncestryCap, createSignerTransactions, replacementFee, type Inspection } from "./transactions";

/*
 * ADR-0004 chain adapter for an Unlock PublicLock v14, signed by the grant-only
 * signer (ADR-0008). `prepare` signs one grant, `broadcast` sends it once the
 * worker has recorded its hash, `prepareReplacement` re-signs a stuck grant at
 * its own nonce with a higher fee, and `reconcile` reads the receipt. Base
 * Sepolia (84532) is enabled; Polygon (137) only behind the owner's go-live
 * switch, and then only for the pinned Signet lock and the configured event
 * locks, signed by the pinned grant signer (./polygon; see ./transactions).
 *
 * Honest outcomes: everything in `prepare` happens before broadcast, so a failure
 * there is `definitelyNotSent`. Any failure from the broadcast call itself is
 * `unknown`, for reconciliation to settle. PublicLock v14 `grantKeys` always
 * mints a new key (it never extends one) and counts expired keys toward
 * `maxKeysPerAddress`, so a recipient who already holds any key on the lock is
 * refused (`recipient_has_key`) rather than given a revert or a second key.
 * A pinned Guest intent is per admission; the Guest lock's own capacity and
 * per-holder limit still apply through simulation. A
 * grant is `confirmed` only when its receipt is at the chain's depth and shows
 * exactly one mint, from this lock, to the target.
 */

const lockAbi = PublicLockV14.abi as Abi;

export type UnlockKeyGrantAdapter = KeyGrantAdapter & KeyStateReader & { inspect(txHash: Hex): Promise<Inspection> };

export type UnlockKeyGrantAdapterOptions = {
  chainID: number;
  account: LocalAccount;
  /** Callers must supply a transport explicitly. Tests use a scripted transport. */
  transport?: Transport;
  now?: () => Date;
  /** How long a prepared grant may hold its signer's lane before it expires unsent. */
  holdMs?: number;
  /** Where the go-live switch is read (default: process.env). */
  env?: Readonly<Record<string, string | undefined>>;
  /** Polygon's pinned lock and grant signer. Production uses the defaults; tests supply throwaway ones. */
  polygon?: PolygonPins;
  /** Receipt ancestry walk budget (transactions.ts); only the one-shot recovery reconcile raises it. */
  ancestryCap?: bigint;
  walkBudgetMs?: number;
};

const notSent = (code: string): PrepareOutcome & ReplaceOutcome => ({ kind: "definitelyNotSent", code });
const unknown: ReconcileOutcome = { kind: "unknown" };
export const reverted = (error: unknown): boolean => error instanceof BaseError && error.walk((cause) => cause instanceof ContractFunctionRevertedError) instanceof ContractFunctionRevertedError;

export function createUnlockKeyGrantAdapter({ chainID, account, transport, now = () => new Date(), holdMs = 60_000, env, polygon = polygonPins, ancestryCap, walkBudgetMs }: UnlockKeyGrantAdapterOptions): UnlockKeyGrantAdapter {
  // Polygon grants come only from the pinned grant signer: any other account is refused before a transport is built.
  if (chainID === POLYGON_CHAIN_ID && !isAddressEqual(account.address, polygon.granter)) {
    throw new Error("Unlock grants on Polygon (137) are refused: the signer is not the pinned key granter");
  }
  // The pinned event locks come from config (validated here, at start-up), unless the caller pinned them itself.
  const pins: PolygonPins = chainID === POLYGON_CHAIN_ID ? { ...polygon, eventLocks: polygon.eventLocks ?? polygonEventLocks(env) } : polygon;
  const chain = createSignerTransactions({ chainID, account, transport, holdMs, env, ancestryCap, walkBudgetMs });
  const { client } = chain;

  /** The target, only if it is well formed, on this adapter's chain, and (on Polygon) on the pinned lock. */
  const targetHere = (value: KeyGrantTarget): { lock: Address; recipient: Address } | "invalid" | "elsewhere" | "unpinned" => {
    // Chain first, so a refused chain is refused the same way whatever the shared contract lists.
    if (value?.chainID !== chainID) return "elsewhere";
    let target: KeyGrantTarget;
    try { target = parseKeyGrantTarget(value); } catch { return "invalid"; }
    if (chainID === POLYGON_CHAIN_ID && !polygonLockPinned(target.lock, pins)) return "unpinned";
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
      if (target === "unpinned") return notSent("lock_not_enabled");
      const release = await chain.hold();
      try {
        if (!(await chain.onChain())) { release(); return notSent("chain_mismatch"); }
        if (chainID === POLYGON_CHAIN_ID && !(await polygonRoleHookClear(client, target.lock))) { release(); return notSent(roleHookSet); }
        const held = await client.readContract({ address: target.lock, abi: lockAbi, functionName: "totalKeys", args: [target.recipient] }) as bigint;
        if (held > 0n && value.ticketTier !== "guest" && value.ticketMode !== "shared") { release(); return notSent("recipient_has_key"); }
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
      if (target === "unpinned") return notSent("lock_not_enabled");
      const release = await chain.hold();
      try {
        if (!(await chain.onChain())) { release(); return notSent("chain_mismatch"); }
        // Exactly one transaction per nonce can mine; once the chain counts this one as used, reconcile settles it.
        if (await chain.nonceConsumed(nonce)) { release(); return { kind: "nonceConsumed" }; }
        if (chainID === POLYGON_CHAIN_ID && !(await polygonRoleHookClear(client, target.lock))) { release(); return notSent(roleHookSet); }
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
    // Only the record's own grantKeys call is re-sent: to its lock (the pinned one on Polygon), for its recipient alone.
    rebroadcast: (record) => chain.rebroadcast(record, ({ to, data }, { target: value }) => {
      const target = targetHere(value);
      if (typeof target === "string" || !isAddressEqual(to, target.lock)) return false;
      try {
        const call = decodeFunctionData({ abi: lockAbi, data });
        const recipients = call.functionName === "grantKeys" ? (call.args?.[0] as readonly Address[] | undefined) : undefined;
        return recipients?.length === 1 && isAddressEqual(recipients[0], target.recipient);
      } catch { return false; }
    }),

    /** Reads only: whether this recipient's existing key is no longer valid (cancelled or expired) at a settled canonical block; null when that cannot be shown. */
    async keyInvalidAtDepth({ target: value, tokenID }) {
      const target = targetHere(value);
      if (typeof target === "string" || !/^[1-9][0-9]{0,76}$/.test(tokenID)) return null;
      try {
        if (!(await chain.onChain())) return null;
        const blockHash = await chain.buriedBlockHash();
        if (!blockHash) return null;
        const at = { blockHash, requireCanonical: true } as const;
        const valid = await client.readContract({ address: target.lock, abi: lockAbi, functionName: "isValidKey", args: [BigInt(tokenID)], ...at });
        if (valid !== false) return false;
        // isValidKey is false for a token not yet minted at a lagging checkpoint too (Review-A, 25 Nov): the token must
        // exist there and belong to this intent's recipient, as in the cancel adapter; otherwise nothing is proven.
        const owner = await client.readContract({ address: target.lock, abi: lockAbi, functionName: "ownerOf", args: [BigInt(tokenID)], ...at }) as Address;
        return isAddressEqual(owner, target.recipient) ? true : null;
      } catch { return null; }
    },

    async reconcile({ txHash, target: value }) {
      const target = targetHere(value);
      if (typeof target === "string" || !isTxHash(txHash)) return unknown;
      const receipt = await chain.buriedReceipt(txHash as Hex, target.lock);
      if (receipt === beyondAncestryCap) return { kind: "unknown", code: beyondAncestryCap }; // the tick alerts
      if (!receipt) return unknown; // not mined, not settled yet, or not provable; recheck later
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
