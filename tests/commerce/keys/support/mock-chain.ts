import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import { custom, decodeFunctionData, encodeAbiParameters, encodeErrorResult, encodeEventTopics, numberToHex, type Abi, type Hex } from "viem";

/**
 * A scripted EIP-1193 provider for the Unlock adapter tests. It answers the
 * JSON-RPC methods viem uses to read, simulate, prepare and broadcast a
 * `grantKeys` call, and records every request so tests can assert on what
 * reached the chain (or that nothing did). Not chain evidence.
 */
export const lockAbi = PublicLockV14.abi as Abi;
export const lockAddress = `0x${"a".repeat(40)}` as const;
export const recipient = `0x${"b".repeat(40)}` as const;
export const target = { chainID: 84532, lock: lockAddress, recipient };
export const hashOf = (fill: string): Hex => `0x${fill.repeat(64)}`;

type Request = { method: string; params?: unknown[] };
type Handler = (params: unknown[]) => unknown;
export class RpcFailure extends Error {
  constructor(public code: number, message: string, public data?: Hex) { super(message); }
}

export const revertNotGranter = (): never => {
  throw new RpcFailure(3, "execution reverted", encodeErrorResult({ abi: lockAbi, errorName: "ONLY_LOCK_MANAGER_OR_KEY_GRANTER" }));
};

const zeroHash = hashOf("0");
const block = {
  number: "0x64", hash: hashOf("1"), parentHash: hashOf("2"), timestamp: "0x6553f100", baseFeePerGas: "0x4c4b40", gasLimit: "0x1c9c380", gasUsed: "0x0",
  transactions: [], difficulty: "0x0", extraData: "0x", logsBloom: `0x${"0".repeat(512)}`, miner: `0x${"0".repeat(40)}`, mixHash: zeroHash, nonce: "0x0000000000000000",
  receiptsRoot: zeroHash, sha3Uncles: zeroHash, size: "0x1", stateRoot: zeroHash, totalDifficulty: "0x0", transactionsRoot: zeroHash, uncles: [],
};

/** A PublicLock v14 `CancelKey` log, as `expireAndRefundFor` emits it. */
export function cancelLog(token: bigint, options: { owner?: Hex; sendTo?: Hex; refund?: bigint; address?: Hex } = {}) {
  return {
    address: options.address ?? lockAddress,
    topics: encodeEventTopics({ abi: lockAbi, eventName: "CancelKey", args: { tokenId: token, owner: options.owner ?? recipient, sendTo: options.sendTo ?? `0x${"e".repeat(40)}` } }),
    data: encodeAbiParameters([{ type: "uint256" }], [options.refund ?? 0n]),
    blockNumber: "0x64", blockHash: hashOf("1"), transactionHash: hashOf("c"), transactionIndex: "0x0", logIndex: "0x0", removed: false,
  };
}

export function transferLog(token: bigint, options: { from?: Hex; to?: Hex; address?: Hex } = {}) {
  return {
    address: options.address ?? lockAddress,
    topics: encodeEventTopics({ abi: lockAbi, eventName: "Transfer", args: { from: options.from ?? `0x${"0".repeat(40)}`, to: options.to ?? recipient, tokenId: token } }),
    data: "0x", blockNumber: "0x64", blockHash: hashOf("1"), transactionHash: hashOf("c"), transactionIndex: "0x0", logIndex: "0x0", removed: false,
  };
}

export function receipt(status: "0x1" | "0x0", logs: unknown[], to: Hex = lockAddress) {
  return {
    status, logs, to, transactionHash: hashOf("c"), blockNumber: "0x64", blockHash: hashOf("1"), transactionIndex: "0x0",
    from: `0x${"e".repeat(40)}`, contractAddress: null, cumulativeGasUsed: "0x1", gasUsed: "0x1", effectiveGasPrice: "0x1", logsBloom: `0x${"0".repeat(512)}`, type: "0x2",
  };
}

/** `eth_call` handlers keyed by the PublicLock function the calldata selects. */
export function lockCalls(calls: Partial<Record<string, Handler>>): Handler {
  return (params) => {
    const { data } = params[0] as { data: Hex };
    const { functionName } = decodeFunctionData({ abi: lockAbi, data });
    const handler = calls[functionName];
    if (!handler) throw new Error(`unscripted eth_call ${functionName}`);
    return handler(params);
  };
}

export const uint = (value: bigint): Hex => encodeAbiParameters([{ type: "uint256" }], [value]);
export const uintArray = (values: bigint[]): Hex => encodeAbiParameters([{ type: "uint256[]" }], [values]);

/** Every pre-broadcast method answered successfully; override per test. */
export function healthyChain(overrides: Record<string, Handler> = {}): Record<string, Handler> {
  return {
    eth_chainId: () => numberToHex(84532),
    eth_call: lockCalls({ totalKeys: () => uint(0n), expirationDuration: () => uint(30n * 86_400n), grantKeys: () => uintArray([1n]) }),
    eth_getTransactionCount: () => "0x0",
    eth_estimateGas: () => "0x30d40",
    eth_getBlockByNumber: () => block,
    eth_maxPriorityFeePerGas: () => "0x1",
    eth_blockNumber: () => "0x64",
    ...overrides,
  };
}

/** Answers `eth_chainId` with Base Sepolia unless a test scripts it. */
export function mockChain(scripted: Record<string, Handler>) {
  const handlers: Record<string, Handler> = { eth_chainId: () => numberToHex(84532), ...scripted };
  const requests: Request[] = [];
  const transport = custom({
    async request({ method, params }: Request) {
      requests.push({ method, params });
      const handler = handlers[method];
      if (!handler) throw new RpcFailure(-32601, `unscripted method ${method}`);
      return handler(params ?? []);
    },
  }, { retryCount: 0 });
  return { transport, requests, methods: () => requests.map((request) => request.method) };
}
