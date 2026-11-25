import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { numberToHex, type Hex } from "viem";
import { checkPolygonRpc, loadPolygonRpcUrl, polygonRpcUrlAllowed, RpcFileError } from "@/lib/commerce/keys/unlock/rpc-check";
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

const marker = ["Synthetic", "Marker", "0123456789abcdef"].join(""); // a made-up key, never a real one
const good = `https://polygon-mainnet.g.alchemy.com/v2/${marker}`;

test("only Alchemy's Polygon mainnet https /v2/<key> shape is allowed", () => {
  assert.equal(polygonRpcUrlAllowed(good), true);
  for (const bad of [
    `http://polygon-mainnet.g.alchemy.com/v2/${marker}`, `https://user:pw@polygon-mainnet.g.alchemy.com/v2/${marker}`,
    `https://polygon-mainnet.g.alchemy.com:8443/v2/${marker}`, `https://eth-mainnet.g.alchemy.com/v2/${marker}`,
    `https://polygon-mainnet.g.alchemy.com.evil.example/v2/${marker}`, `https://polygon-mainnet.g.alchemy.com/v2/${marker}?x=1`,
    `https://polygon-mainnet.g.alchemy.com/v2/${marker}#x`, `https://polygon-mainnet.g.alchemy.com/v3/${marker}`,
    "https://polygon-mainnet.g.alchemy.com/v2/short", "https://rpc.unlock-protocol.com/137", "not a url",
  ]) assert.equal(polygonRpcUrlAllowed(bad), false, bad);
});

test("the RPC file loader returns fixed typed codes and never the file's content", async () => {
  const folder = mkdtempSync(join(tmpdir(), "rpc-file-"));
  try {
    const file = join(folder, "polygon-rpc.env");
    const write = (text: string, mode = 0o600) => { writeFileSync(file, text); chmodSync(file, mode); };
    write(`KEY_GRANT_POLYGON_RPC_URL=${good}\n`);
    assert.equal(await loadPolygonRpcUrl(file), good);
    const codeOf = async (target = file) => { try { await loadPolygonRpcUrl(target); return "loaded"; } catch (error) { assert.ok(error instanceof RpcFileError); assert.ok(!String(error.message).includes(marker)); return error.code; } };
    write(`KEY_GRANT_POLYGON_RPC_URL=${good}\n`, 0o644);
    assert.equal(await codeOf(), "rpc_file_not_owner_only");
    write(`KEY_GRANT_POLYGON_RPC_URL=https://user:${marker}@polygon-mainnet.g.alchemy.com/v2/${marker}\n`);
    assert.equal(await codeOf(), "rpc_url_not_allowed");
    write("NOTHING=1\n");
    assert.equal(await codeOf(), "rpc_url_not_allowed");
    assert.equal(await codeOf(join(folder, "absent.env")), "rpc_file_missing");
    const link = join(folder, "link.env");
    symlinkSync(file, link);
    assert.equal(await codeOf(link), "rpc_file_symlink");
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("the CLI prints only a fixed code for every refused file, never the key", () => {
  const folder = mkdtempSync(join(tmpdir(), "rpc-cli-"));
  try {
    const file = join(folder, "polygon-rpc.env");
    const cases: [string, number, string][] = [
      [`KEY_GRANT_POLYGON_RPC_URL=${good}\n`, 0o644, "rpc_file_not_owner_only"],
      [`KEY_GRANT_POLYGON_RPC_URL=https://evil.example/v2/${marker}\n`, 0o600, "rpc_url_not_allowed"],
      [`KEY_GRANT_POLYGON_RPC_URL=https://user:${marker}@polygon-mainnet.g.alchemy.com/v2/${marker}\n`, 0o600, "rpc_url_not_allowed"],
    ];
    for (const [text, mode, code] of cases) {
      writeFileSync(file, text);
      chmodSync(file, mode);
      const run = spawnSync("node", ["--import", "tsx", "scripts/key-grant-rpc-check.ts", "--file", file], { encoding: "utf8", timeout: 60_000 });
      assert.equal(run.status, 1, code);
      assert.deepEqual(JSON.parse(run.stdout.trim()), { outcome: "fail", failures: [code] });
      assert.ok(!run.stdout.includes(marker) && !run.stderr.includes(marker), code);
    }
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
