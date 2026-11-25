import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { numberToHex, type Hex } from "viem";
import { checkPolygonRpc, loadPolygonRpcUrl } from "@/lib/commerce/keys/unlock/rpc-check";
import { hashOf, healthyChain, mockChain } from "./support/mock-chain";

// Owner, 25 Nov: "Sure, we use alchemy". Read-only validation of that RPC before go-live; scripted chain only here.
const hashAt = (number: number): Hex => `0x${"b".repeat(8)}${number.toString(16).padStart(56, "0")}`;
const block = (number: number, hash = hashAt(number)) => ({ ...(healthyChain().eth_getBlockByNumber([]) as object), number: numberToHex(number), hash, parentHash: hashAt(number - 1) });
function chain(overrides: Record<string, (params: unknown[]) => unknown> = {}) {
  return mockChain({
    eth_chainId: () => numberToHex(137),
    eth_getBlockByNumber: ([tag]) => tag === "latest" ? block(1002) : tag === "finalized" ? block(1000) : tag === "safe" ? block(1001) : block(Number(BigInt(tag as string))),
    eth_getBlockByHash: ([hash]) => block(Number(BigInt(`0x${(hash as string).slice(10)}`))),
    ...overrides,
  });
}

test("a consistent Polygon RPC passes: chain 137, tags in order, finalized numbered at its height, a 10-block by-hash walk", async () => {
  const { transport, methods } = chain();
  const result = await checkPolygonRpc(transport);
  assert.equal(result.outcome, "pass", JSON.stringify(result.failures));
  assert.deepEqual([result.chainId, result.latest, result.safe, result.finalized, result.finalizedLagBlocks, result.walked], [137, "1002", "1001", "1000", 2, 10]);
  assert.equal(methods().filter((method) => method === "eth_getBlockByHash").length, 10);
  assert.ok(!methods().some((method) => /send|sign|estimate|getTransactionCount/i.test(method)), "reads only");
});

test("each inconsistency fails with a fixed code, and an RPC error never surfaces its message", async () => {
  const cases: [string, Record<string, (params: unknown[]) => unknown>, string][] = [
    ["another chain", { eth_chainId: () => numberToHex(1) }, "chain_not_137"],
    ["finalized lagging", { eth_getBlockByNumber: ([tag]) => tag === "latest" ? block(2000) : tag === "finalized" ? block(1000) : block(Number(BigInt(tag as string))) }, "finalized_lagging"],
    ["finalized not the numbered block", { eth_getBlockByNumber: ([tag]) => tag === "latest" ? block(1002) : tag === "finalized" ? block(1000, hashOf("7")) : block(Number(BigInt(tag as string))) }, "finalized_not_numbered_block"],
    ["broken walk", { eth_getBlockByHash: ([hash]) => { const number = Number(BigInt(`0x${(hash as string).slice(10)}`)); return number === 995 ? block(990) : block(number); } }, "walk_broken"],
    ["rate limited", { eth_getBlockByHash: () => { throw new Error("429 https://polygon-mainnet.g.alchemy.com/v2/SECRETKEY"); } }, "rpc_error"],
  ];
  for (const [label, overrides, code] of cases) {
    const result = await checkPolygonRpc(chain(overrides).transport);
    assert.equal(result.outcome, "fail", label);
    assert.ok(result.failures.includes(code), `${label}: ${JSON.stringify(result.failures)}`);
    assert.ok(!JSON.stringify(result).includes("SECRETKEY"), label);
  }
  const noSafe = await checkPolygonRpc(chain({ eth_getBlockByNumber: ([tag]) => { if (tag === "safe") throw new Error("unsupported"); return tag === "latest" ? block(1002) : tag === "finalized" ? block(1000) : block(Number(BigInt(tag as string))); } }).transport);
  assert.deepEqual([noSafe.outcome, noSafe.safe], ["pass", "unsupported"], "safe is reported, not required (the tick does not use it)");
});

test("the RPC file must be owner-only and hold an https URL", async () => {
  const folder = mkdtempSync(join(tmpdir(), "rpc-file-"));
  try {
    const file = join(folder, "polygon-rpc.env");
    writeFileSync(file, "KEY_GRANT_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/synthetic\n");
    chmodSync(file, 0o600);
    assert.equal(await loadPolygonRpcUrl(file), "https://polygon-mainnet.g.alchemy.com/v2/synthetic");
    chmodSync(file, 0o644);
    await assert.rejects(loadPolygonRpcUrl(file), /rpc_file_unreadable_or_not_owner_only/);
    writeFileSync(file, "KEY_GRANT_POLYGON_RPC_URL=http://polygon-mainnet.g.alchemy.com/v2/synthetic\n");
    chmodSync(file, 0o600);
    await assert.rejects(loadPolygonRpcUrl(file), /rpc_url_missing_or_not_https/);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
