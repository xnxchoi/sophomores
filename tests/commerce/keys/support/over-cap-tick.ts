import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { numberToHex, type Hex } from "viem";
import { runKeyGrantTick } from "@/lib/commerce/keys/grant-catch-up";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { fakePayload } from "./fake-payload";
import { hashOf, healthyChain, lockAddress, mockChain, receipt, recipient, transferLog } from "./mock-chain";

/**
 * A tick whose one in-flight grant is beyond the ancestry cap: its receipt is in block 100, the finalized block is 400.
 * Fake Payload and a scripted chain only (no RPC, no key, no database). Its synthetic intent is 00000000-0000-4000-8000-0000000000a1.
 */
export function overCapTick() {
  const live = { KEY_GRANT_POLYGON_LIVE: "1", KEY_GRANT_POLYGON_MAX_COST_WEI: "1000000000000000000" } as const;
  const top = hashOf("5");
  const block = (number: number, hash: Hex) => ({ ...(healthyChain().eth_getBlockByNumber([]) as object), number: numberToHex(number), hash });
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(healthyChain({
    eth_chainId: () => numberToHex(137),
    eth_getTransactionReceipt: () => receipt("0x1", [transferLog(42n)]),
    eth_blockNumber: () => numberToHex(400),
    eth_getBlockByNumber: ([tag]) => tag === "finalized" || tag === numberToHex(400) ? block(400, top) : block(Number(BigInt(tag as string)), hashOf("9")),
  }));
  const grant = createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, env: live, polygon: { lock: lockAddress, granter: account.address } });
  const { payload, rows } = fakePayload([{ id: "00000000-0000-4000-8000-0000000000a1", operationKey: "unlock-grant:v1:order-9:1", entitlement: "adm", state: "submitted", attempts: 1, attemptID: "a9", txHash: hashOf("c"), target: { chainID: 137, lock: lockAddress, recipient } }]);
  const run = (log: (line: string) => void) => runKeyGrantTick({ payload, grant, env: live, log, now: () => new Date("2026-11-25T12:00:00Z"),
    acquire: async () => async () => {} });
  return { run, rows, methods: chain.methods };
}
