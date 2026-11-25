import assert from "node:assert/strict";
import test from "node:test";
import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import { custom, decodeFunctionData, encodeFunctionResult, type Abi } from "viem";
import { createPassHolderCheck } from "@/lib/commerce/keys/unlock/pass-holder";

// Review-A HOLD (msg_8076f4870ae9): a hosted Wallet pass is fetched only after a live Polygon read shows the key valid
// and owned by the member's recorded Safe; any doubt answers false (the endpoint then fetches nothing).
const abi = PublicLockV14.abi as Abi;
const lock = "0x" + "b".repeat(40);
const safe = "0x" + "5".repeat(40);
const key = { lock, tokenID: "7", recipient: safe };

function chain({ chainId = "0x89", valid = true, owner = safe, fail }: { chainId?: string; valid?: unknown; owner?: string; fail?: string } = {}) {
  const methods: string[] = [];
  const transport = custom({
    async request({ method, params }: { method: string; params?: unknown[] }) {
      methods.push(method);
      if (method === fail) throw new Error("rpc failure");
      if (method === "eth_chainId") return chainId;
      if (method === "eth_blockNumber") return "0x10";
      if (method === "eth_call") {
        const call = (params as [{ data: `0x${string}` }, unknown])[0];
        const { functionName, args } = decodeFunctionData({ abi, data: call.data });
        assert.deepEqual(args, [7n]);
        assert.equal((params as [unknown, unknown])[1], "0x10", "both reads at one block");
        return functionName === "isValidKey" ? encodeFunctionResult({ abi, functionName, result: valid })
          : encodeFunctionResult({ abi, functionName: "ownerOf", result: owner });
      }
      throw new Error("unexpected method " + method);
    },
  });
  return { methods, check: createPassHolderCheck({ loadUrl: async () => "https://polygon-mainnet.g.alchemy.com/v2/test-key-0123456789", transportFor: () => transport }) };
}

test("a valid key owned by the recorded Safe passes", async () => {
  const { check, methods } = chain();
  assert.equal(await check(key), true);
  assert.equal(await check({ ...key, recipient: safe.toUpperCase().replace("0X", "0x") }), true, "address case does not matter");
  assert.deepEqual([...new Set(methods)].sort(), ["eth_blockNumber", "eth_call", "eth_chainId"]);
});

test("an invalid key, another owner, the wrong chain or any RPC failure fails closed", async () => {
  assert.equal(await chain({ valid: false }).check(key), false);
  assert.equal(await chain({ owner: "0x" + "6".repeat(40) }).check(key), false);
  assert.equal(await chain({ chainId: "0x13882" }).check(key), false);
  for (const fail of ["eth_chainId", "eth_blockNumber", "eth_call"]) assert.equal(await chain({ fail }).check(key), false, fail);
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
