import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { SafeProvider, predictSafeAddress } from "@safe-global/protocol-kit";
import {
  encodeAbiParameters,
  keccak256,
  sha256,
  stringToBytes,
  toFunctionSelector
} from "viem";
import {
  MEMBER_SAFE_CHAINS,
  MEMBER_SAFE_SCHEME,
  SAFE_PROXY_CREATION_CODE,
  memberSafeSaltNonce,
  predictMemberSafe
} from "@/lib/member-auth/wallet/safe";

/*
 * ADR-0013: the member Safe address is computed offline at settlement, so it
 * must equal what Safe's own SDK predicts. The creation code comes from the
 * published @safe-global/safe-contracts@1.4.1 artifact (one approved fetch,
 * 2026-11-16); it is checked here against the INSTALLED safe-deployments
 * package, with no network.
 */

const OWNER = "0x1111111111111111111111111111111111111111"; // throwaway
const MEMBERS = [
  "0195a1f2-7c3e-7d4b-9a10-2b3c4d5e6f70",
  "6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f"
];
/** Pinned once from the SDK-equal computation; a change here strands granted Signets. */
const PINNED = {
  137: "0x312890e4095506C65D9dd2Caf73ECfde84930f78",
  84532: "0x312890e4095506C65D9dd2Caf73ECfde84930f78"
} as const;

const factoryArtifact = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "fixtures/safe-proxy-factory-1.4.1.json"),
    "utf8"
  )
) as { deployedBytecode: `0x${string}` };
// safe-deployments is the SDK's own dependency; resolve it from there.
const fromKit = createRequire(
  createRequire(import.meta.url).resolve("@safe-global/protocol-kit")
);
const deploymentsRoot = dirname(
  fromKit.resolve("@safe-global/safe-deployments/package.json")
);
const deployment = (name: string) =>
  JSON.parse(
    readFileSync(
      join(deploymentsRoot, `dist/assets/v1.4.1/${name}.json`),
      "utf8"
    )
  ) as {
    deployments: Record<string, { address: string; codeHash: string }>;
    networkAddresses: Record<string, string | string[]>;
  };

test("the proxy creation code is the one the installed Safe factory deploys", () => {
  const factory = deployment("safe_proxy_factory");
  assert.equal(
    keccak256(factoryArtifact.deployedBytecode),
    factory.deployments.canonical.codeHash,
    "the fetched factory runtime code matches safe-deployments' canonical codeHash"
  );
  assert.ok(
    factoryArtifact.deployedBytecode
      .toLowerCase()
      .includes(SAFE_PROXY_CREATION_CODE.slice(2).toLowerCase()),
    "proxyCreationCode() returns bytes embedded in that runtime code"
  );
  assert.equal(
    sha256(SAFE_PROXY_CREATION_CODE),
    "0xcdac0e1d7a8897472ab08d29d19e028896c4feaaff65bba661c2e5e49a39bf61"
  );
});

test("the scheme's contracts are the canonical 1.4.1 deployments on every allowed chain", () => {
  const expected = {
    proxyFactoryAddress: "safe_proxy_factory",
    singletonAddress: "safe_l2",
    fallbackHandlerAddress: "compatibility_fallback_handler"
  } as const;
  for (const [field, name] of Object.entries(expected)) {
    const record = deployment(name);
    assert.equal(
      MEMBER_SAFE_SCHEME[field as keyof typeof expected],
      record.deployments.canonical.address,
      field
    );
    for (const chain of MEMBER_SAFE_CHAINS) {
      const types = [record.networkAddresses[String(chain)]].flat();
      assert.ok(types.includes("canonical"), `${name} on ${chain}`);
    }
  }
  assert.deepEqual([...MEMBER_SAFE_CHAINS].sort(), [137, 84532]);
  assert.equal(MEMBER_SAFE_SCHEME.safeVersion, "1.4.1");
  assert.equal(MEMBER_SAFE_SCHEME.threshold, 1);
});

/** A provider that answers only what prediction needs and fails on anything else. */
function strictProvider(chainID: number) {
  const calls: string[] = [];
  const selector = toFunctionSelector("proxyCreationCode()");
  return {
    calls,
    request: async ({
      method,
      params
    }: {
      method: string;
      params?: unknown[];
    }) => {
      calls.push(method);
      if (method === "eth_chainId") return `0x${chainID.toString(16)}`;
      if (method === "eth_accounts") return []; // no signer: prediction only
      const isFactory = (address: unknown) =>
        typeof address === "string" &&
        address.toLowerCase() ===
          MEMBER_SAFE_SCHEME.proxyFactoryAddress.toLowerCase();
      // The SDK only checks that its contracts exist. The factory gets its
      // real runtime code (verified above); the singleton and handler, whose
      // addresses the scheme test pins to safe-deployments, get a non-empty
      // marker. Any other address fails the test.
      if (method === "eth_getCode") {
        if (isFactory(params?.[0])) return factoryArtifact.deployedBytecode;
        const known = [
          MEMBER_SAFE_SCHEME.singletonAddress,
          MEMBER_SAFE_SCHEME.fallbackHandlerAddress
        ].map((entry) => entry.toLowerCase());
        if (known.includes(String(params?.[0]).toLowerCase())) return "0xfe";
        throw new Error(`Unexpected code lookup: ${String(params?.[0])}`);
      }
      const call = (params?.[0] ?? {}) as { to?: string; data?: string };
      if (
        method === "eth_call" &&
        call.to?.toLowerCase() ===
          MEMBER_SAFE_SCHEME.proxyFactoryAddress.toLowerCase() &&
        call.data === selector
      )
        return encodeAbiParameters(
          [{ type: "bytes" }],
          [SAFE_PROXY_CREATION_CODE]
        );
      throw new Error(`Unexpected provider call: ${method}`);
    }
  };
}

test("the offline address equals the Safe SDK's own prediction for fixed inputs", async () => {
  for (const chainID of MEMBER_SAFE_CHAINS) {
    for (const memberID of MEMBERS) {
      const provider = strictProvider(chainID);
      const safeProvider = await SafeProvider.init({ provider: provider as never });
      const sdk = await predictSafeAddress({
        safeProvider,
        chainId: BigInt(chainID),
        safeAccountConfig: { owners: [OWNER], threshold: 1 },
        safeDeploymentConfig: {
          safeVersion: "1.4.1",
          saltNonce: memberSafeSaltNonce(memberID)
        }
      });
      const ours = predictMemberSafe({ chainID, owner: OWNER, memberID });
      assert.equal(ours.safeAddress, sdk, `${chainID} ${memberID}`);
      assert.ok(
        provider.calls.every((call) =>
          ["eth_chainId", "eth_accounts", "eth_call", "eth_getCode"].includes(
            call
          )
        ),
        [...new Set(provider.calls)].join(",")
      );
    }
  }
});

test("the address is pinned for fixed inputs: changing the scheme strands granted keys", () => {
  for (const chainID of MEMBER_SAFE_CHAINS) {
    const safe = predictMemberSafe({
      chainID,
      owner: OWNER,
      memberID: MEMBERS[0]
    });
    assert.equal(safe.safeAddress, PINNED[chainID], String(chainID));
    assert.equal(safe.saltNonce, memberSafeSaltNonce(MEMBERS[0]));
    assert.equal(safe.ownerAddress, OWNER);
    assert.equal(safe.threshold, 1);
    assert.equal(safe.chainID, chainID);
    assert.match(safe.configHash, /^[0-9a-f]{64}$/);
  }
});

test("each member gets their own Safe; the salt is the versioned label over the member id", () => {
  const [a, b] = MEMBERS.map((memberID) =>
    predictMemberSafe({ chainID: 84532, owner: OWNER, memberID })
  );
  assert.notEqual(a.safeAddress, b.safeAddress);
  assert.equal(
    memberSafeSaltNonce(MEMBERS[0]),
    BigInt(
      keccak256(stringToBytes(`sophomores:member-safe:v1:${MEMBERS[0]}`))
    ).toString()
  );
  assert.throws(() =>
    predictMemberSafe({ chainID: 1, owner: OWNER, memberID: MEMBERS[0] })
  );
  assert.throws(() =>
    predictMemberSafe({ chainID: 137, owner: "0x123", memberID: MEMBERS[0] })
  );
  assert.throws(() =>
    predictMemberSafe({ chainID: 137, owner: OWNER, memberID: "" })
  );
});

test("the wallet module makes no network call and never signs or deploys", () => {
  const source = readFileSync(
    join(process.cwd(), "src/lib/member-auth/wallet/safe.ts"),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /protocol-kit|createPublicClient|createWalletClient|\bhttp\(|fetch\(|sendTransaction|signTransaction|deployContract/i
  );
});
