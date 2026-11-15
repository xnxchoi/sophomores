import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { inspect } from "node:util";
import { keccak256, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { loadSignerAccount } from "@/lib/commerce/keys/unlock/signer";
import { hashOf, healthyChain, lockCalls, mockChain, receipt, revertNotGranter, RpcFailure, target, uint } from "./support/mock-chain";

// Sentinel key material: if any of it shows up in output or errors, the test fails.
const body = "5e".repeat(32);
const sentinel = `0x${body}` as Hex;
const sentinelAddress = privateKeyToAccount(sentinel).address;
const directory = mkdtempSync(join(tmpdir(), "unlock-signer-"));
after(() => rmSync(directory, { recursive: true, force: true }));

const envFile = (name: string, lines: string[], mode = 0o600): string => {
  const file = join(directory, name);
  writeFileSync(file, `# test signer\n${lines.join("\n")}\n`, { mode });
  return file;
};
const leaks = (text: string): boolean => [body, body.slice(0, 24), body.toUpperCase().slice(0, 24)].some((part) => text.includes(part));

/** Runs `work` while capturing every console and stdio write it makes. */
async function captured<T>(work: () => Promise<T>): Promise<{ result?: T; error?: unknown; output: string }> {
  const chunks: string[] = [];
  const methods = ["log", "info", "warn", "error", "debug", "trace"] as const;
  const originals = methods.map((name) => console[name]);
  const writes = [process.stdout.write, process.stderr.write];
  methods.forEach((name) => { console[name] = (...args: unknown[]) => { chunks.push(inspect(args, { depth: 10 })); }; });
  process.stdout.write = ((chunk: unknown) => { chunks.push(String(chunk)); return true; }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: unknown) => { chunks.push(String(chunk)); return true; }) as typeof process.stderr.write;
  try { return { result: await work(), output: chunks.join("\n") }; }
  catch (error) { return { error, output: chunks.join("\n") }; }
  finally {
    methods.forEach((name, index) => { console[name] = originals[index]; });
    [process.stdout.write, process.stderr.write] = writes;
  }
}

test("a valid signer file loads the account it names, at mode 0600 only", async () => {
  const file = envFile("ok.env", [`UNLOCK_TEST_GRANTER_ADDRESS=${sentinelAddress}`, `UNLOCK_TEST_GRANTER_PRIVATE_KEY=${sentinel}`]);
  const { result, error, output } = await captured(() => loadSignerAccount(file, "UNLOCK_TEST_GRANTER"));
  assert.equal(error, undefined);
  assert.equal(result!.address, sentinelAddress);
  assert.equal(leaks(output), false);
  assert.equal(leaks(inspect(result, { depth: 10 })), false, "the loaded account object carries no raw key");
  assert.equal(leaks(JSON.stringify(result)), false);
});

test("refused signer files never echo key material in errors", async () => {
  const cases = {
    "group-readable file": envFile("open.env", [`UNLOCK_TEST_GRANTER_ADDRESS=${sentinelAddress}`, `UNLOCK_TEST_GRANTER_PRIVATE_KEY=${sentinel}`], 0o644),
    "malformed key": envFile("long.env", [`UNLOCK_TEST_GRANTER_ADDRESS=${sentinelAddress}`, `UNLOCK_TEST_GRANTER_PRIVATE_KEY=${sentinel}ff`]),
    "non-hex key": envFile("hex.env", [`UNLOCK_TEST_GRANTER_ADDRESS=${sentinelAddress}`, `UNLOCK_TEST_GRANTER_PRIVATE_KEY=0x${body.slice(0, 62)}zz`]),
    "address mismatch": envFile("other.env", [`UNLOCK_TEST_GRANTER_ADDRESS=0x${"1".repeat(40)}`, `UNLOCK_TEST_GRANTER_PRIVATE_KEY=${sentinel}`]),
    "missing variable": envFile("none.env", [`UNLOCK_TEST_GRANTER_KEY=${sentinel}`]),
    "missing file": join(directory, "absent.env"),
  };
  for (const [name, file] of Object.entries(cases)) {
    const { error, output } = await captured(() => loadSignerAccount(file, "UNLOCK_TEST_GRANTER"));
    assert.ok(error instanceof Error, `${name} is refused`);
    assert.equal(leaks(inspect(error, { depth: 10 })), false, `${name}: message, stack and cause chain stay clean`);
    assert.equal(leaks(String((error as Error).stack)), false);
    assert.equal(leaks(output), false, `${name}: nothing printed`);
  }
});

test("adapter outcomes and output never carry the signing key on any path", async () => {
  const file = envFile("adapter.env", [`UNLOCK_TEST_GRANTER_ADDRESS=${sentinelAddress}`, `UNLOCK_TEST_GRANTER_PRIVATE_KEY=${sentinel}`]);
  const account = await loadSignerAccount(file, "UNLOCK_TEST_GRANTER");
  const failure = () => { throw new RpcFailure(-32000, "upstream unavailable"); };
  const chains = [
    healthyChain({ eth_call: lockCalls({ expirationDuration: () => uint(1n), grantKeys: revertNotGranter }) }),
    healthyChain({ eth_estimateGas: failure }),
    healthyChain({ eth_sendRawTransaction: failure }),
    healthyChain({ eth_sendRawTransaction: (params) => keccak256(params[0] as Hex) }),
    { eth_getTransactionReceipt: () => receipt("0x1", []) },
    { eth_getTransactionReceipt: failure },
  ];
  for (const handlers of chains) {
    const adapter = createUnlockKeyGrantAdapter({ chainID: 84532, account, transport: mockChain(handlers).transport });
    const { result, error, output } = await captured(async () => [
      await adapter.submit({ intentID: "i", attemptID: "a", target }),
      await adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target }),
    ]);
    assert.equal(error, undefined, "the adapter reports outcomes; it does not throw");
    assert.equal(leaks(JSON.stringify(result)), false);
    assert.equal(leaks(output), false);
  }
});
