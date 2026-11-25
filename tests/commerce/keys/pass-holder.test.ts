import assert from "node:assert/strict";
import test from "node:test";
import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import { custom, decodeFunctionData, encodeFunctionResult, type Abi } from "viem";
import { createPassHolderCheck } from "@/lib/commerce/keys/unlock/pass-holder";
import { responseFrom, untracedFetch } from "@/lib/commerce/keys/unlock/untraced-fetch";
import { polygonRpcTransport } from "@/lib/commerce/keys/unlock/rpc-check";

// Review-A HOLD (msg_8076f4870ae9): a hosted Wallet pass is fetched only after a live Polygon read shows the key valid
// and owned by the member's recorded Safe; any doubt answers false (the endpoint then fetches nothing).
const abi = PublicLockV14.abi as Abi;
const lock = "0x" + "b".repeat(40);
const safe = "0x" + "5".repeat(40);
const key = { lock, tokenID: "7", recipient: safe };

const blockHash = "0x" + "c".repeat(64);
function chain({ chainId = "0x89", valid = true, owner = safe, fail, hash = blockHash, hang, ownerFails }:
  { chainId?: string; valid?: unknown; owner?: string; fail?: string; hash?: string | null; hang?: string; ownerFails?: boolean } = {}) {
  const methods: string[] = [];
  const transport = custom({
    async request({ method, params }: { method: string; params?: unknown[] }) {
      methods.push(method);
      if (method === fail) throw new Error("rpc failure");
      if (method === hang) return new Promise(() => {});
      if (method === "eth_chainId") return chainId;
      if (method === "eth_getBlockByNumber") {
        assert.deepEqual(params, ["latest", false]);
        return { number: "0x10", hash, parentHash: "0x" + "d".repeat(64), timestamp: "0x1", transactions: [] };
      }
      if (method === "eth_call") {
        const call = (params as [{ data: `0x${string}` }, unknown])[0];
        const { functionName, args } = decodeFunctionData({ abi, data: call.data });
        assert.deepEqual(args, [7n]);
        assert.deepEqual((params as [unknown, unknown])[1], { blockHash, requireCanonical: true }, "both reads pinned to one canonical block");
        if (functionName === "ownerOf" && ownerFails) throw new Error("header not found");
        return functionName === "isValidKey" ? encodeFunctionResult({ abi, functionName, result: valid })
          : encodeFunctionResult({ abi, functionName: "ownerOf", result: owner });
      }
      throw new Error("unexpected method " + method);
    },
  });
  return { methods, check: createPassHolderCheck({ loadUrl: async () => "https://polygon-mainnet.g.alchemy.com/v2/test-key-0123456789", transportFor: () => transport, deadlineMs: 200 }) };
}

test("a valid key owned by the recorded Safe passes", async () => {
  const { check, methods } = chain();
  assert.equal(await check(key), true);
  assert.equal(await check({ ...key, recipient: safe.toUpperCase().replace("0X", "0x") }), true, "address case does not matter");
  assert.deepEqual([...new Set(methods)].sort(), ["eth_call", "eth_chainId", "eth_getBlockByNumber"]);
});

test("an invalid key, another owner, the wrong chain or any RPC failure fails closed", async () => {
  assert.equal(await chain({ valid: false }).check(key), false);
  assert.equal(await chain({ owner: "0x" + "6".repeat(40) }).check(key), false);
  assert.equal(await chain({ chainId: "0x13882" }).check(key), false);
  for (const fail of ["eth_chainId", "eth_getBlockByNumber", "eth_call"]) assert.equal(await chain({ fail }).check(key), false, fail);
});

test("no block hash, or one read failing at the canonical block (inconsistent), fails closed", async () => {
  assert.equal(await chain({ hash: null }).check(key), false);
  assert.equal(await chain({ ownerFails: true }).check(key), false);
});

test("one deadline covers every stage: a hung RPC fails closed in time", async () => {
  for (const hang of ["eth_chainId", "eth_getBlockByNumber", "eth_call"]) {
    const started = Date.now();
    assert.equal(await chain({ hang }).check(key), false, hang);
    assert.ok(Date.now() - started < 1000, `${hang} bounded by the shared deadline`);
  }
});

test("the default transport never uses the global fetch Next instruments", async t => {
  let globalCalls = 0;
  t.mock.method(globalThis, "fetch", async () => { globalCalls++; throw new Error("instrumented fetch used"); });
  // A closed local port: the read fails (false), but it must have gone through node:https, not globalThis.fetch.
  const check = createPassHolderCheck({ loadUrl: async () => "https://127.0.0.1:1/v2/test-key-0123456789", deadlineMs: 2000 });
  assert.equal(await check(key), false);
  assert.equal(globalCalls, 0);
  await assert.rejects(untracedFetch("http://127.0.0.1:1/"), /HTTPS only/);
});

test("no RPC file, or a malformed token, reads nothing and fails closed", async () => {
  let built = 0;
  const missing = createPassHolderCheck({ loadUrl: async () => { throw new Error("rpc_file_missing"); }, transportFor: () => { built++; return custom({ request: async () => null }); } });
  assert.equal(await missing(key), false);
  assert.equal(built, 0);
  const { check, methods } = chain();
  for (const tokenID of ["0", "-1", "07", "x", "1".repeat(78)]) assert.equal(await check({ ...key, tokenID }), false, tokenID);
  assert.equal(methods.length, 0);
});

test("a 204 or 304 from the RPC never throws outside the promise; the check answers false", async () => {
  for (const status of [204, 205, 304]) {
    const response = responseFrom(status, [Buffer.from("ignored")], new Headers());
    assert.equal(response?.status, status);
    assert.equal(response?.body, null);
  }
  assert.equal(responseFrom(99, [], new Headers()), null, "an impossible status is refused, not thrown");
  for (const status of [204, 304]) {
    let requests = 0;
    const check = createPassHolderCheck({ loadUrl: async () => "https://polygon-mainnet.g.alchemy.com/v2/test-key-0123456789", deadlineMs: 500,
      transportFor: (url) => polygonRpcTransport(url, { fetchFn: (async () => { requests++; return responseFrom(status, [], new Headers())!; }) as typeof fetch }) });
    assert.equal(await check({ lock: "0x" + "1".repeat(40), tokenID: "7", recipient: "0x" + "2".repeat(40) }), false);
    assert.equal(requests, 1, "fails at the first stage: nothing more is asked");
  }
});

test("the deadline aborts the shared signal, and no stage starts after it", async () => {
  let seen: AbortSignal | undefined;
  let calls = 0;
  const check = createPassHolderCheck({ loadUrl: async () => "https://polygon-mainnet.g.alchemy.com/v2/test-key-0123456789", deadlineMs: 50,
    transportFor: (_url, signal) => { seen = signal; return custom({ request: async () => { calls++; await new Promise((resolve) => setTimeout(resolve, 150)); return "0x89"; } }); } });
  assert.equal(await check({ lock: "0x" + "1".repeat(40), tokenID: "7", recipient: "0x" + "2".repeat(40) }), false);
  assert.equal(seen?.aborted, true);
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(calls, 1, "the chain-id answer arrived after the deadline: no block read started");
});
