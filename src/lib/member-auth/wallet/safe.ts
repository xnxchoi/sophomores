import { createHash } from "node:crypto";
import Safe, { SafeProvider, getP256VerifierAddress, getSafeContract, getSafeProxyFactoryContract, predictSafeAddress } from "@safe-global/protocol-kit";
import type { WalletConfig } from "./config";

/*
 * Safe address prediction for a passkey owner (ADR-0001). Read-only: the SDK
 * path below reads chain ID, bytecode, the WebAuthn signer factory's getSigner
 * and the proxy creation code over JSON-RPC. Nothing here deploys, signs or
 * sends; tests/member-auth/wallet/no-send.test.ts keeps it that way.
 */

export type PasskeyCoordinates = { x: `0x${string}`; y: `0x${string}` };
export type SafeCandidate = Readonly<{
  chainID: number;
  safeVersion: string;
  saltNonce: string;
  verifierAddress: string;
  ownerAddress: string;
  safeAddress: string;
  proxyFactoryAddress: string;
  singletonAddress: string;
  configHash: string;
}>;
export type PredictSafe = (input: { credentialID: string; coordinates: PasskeyCoordinates; config: WalletConfig }) => Promise<SafeCandidate>;

const address = /^0x[0-9a-fA-F]{40}$/;

/** Digest over everything that fixes the address, so a stored candidate can be compared exactly. */
export function safeConfigHash(input: Omit<SafeCandidate, "configHash"> & { coordinates: PasskeyCoordinates }): string {
  const canonical = JSON.stringify([input.chainID, input.safeVersion, input.saltNonce, input.verifierAddress.toLowerCase(),
    input.proxyFactoryAddress.toLowerCase(), input.singletonAddress.toLowerCase(), input.coordinates.x.toLowerCase(),
    input.coordinates.y.toLowerCase(), input.ownerAddress.toLowerCase(), input.safeAddress.toLowerCase()]);
  return createHash("sha256").update(canonical).digest("hex");
}

/** The SDK's own bootstrap path (plan, FLOW). The two independent derivations must agree. */
export const predictMemberSafe: PredictSafe = async ({ credentialID, coordinates, config }) => {
  const verifierAddress = getP256VerifierAddress(String(config.chainID));
  // The SDK expects the credential's raw bytes as hex; the stored ID is base64url.
  const passkey = { rawId: Buffer.from(credentialID, "base64url").toString("hex"), coordinates, verifierAddress };
  const safeProvider = await SafeProvider.init({ provider: config.rpcUrl, signer: passkey, safeVersion: config.safeVersion });
  const ownerAddress = await safeProvider.getSignerAddress();
  if (!ownerAddress || !address.test(ownerAddress)) throw new Error("Passkey owner address unavailable");
  const safeAccountConfig = { owners: [ownerAddress], threshold: 1 };
  const safeDeploymentConfig = { safeVersion: config.safeVersion, saltNonce: config.saltNonce };
  const predicted = await predictSafeAddress({ safeProvider, chainId: BigInt(config.chainID), safeAccountConfig, safeDeploymentConfig });
  const safe = await Safe.init({ provider: config.rpcUrl, signer: passkey, predictedSafe: { safeAccountConfig, safeDeploymentConfig } });
  const safeAddress = await safe.getAddress();
  if (!address.test(safeAddress) || safeAddress.toLowerCase() !== predicted.toLowerCase()) throw new Error("Safe address prediction disagrees");
  const proxyFactoryAddress = (await getSafeProxyFactoryContract({ safeProvider, safeVersion: config.safeVersion })).getAddress();
  const singletonAddress = (await getSafeContract({ safeProvider, safeVersion: config.safeVersion })).getAddress();
  const candidate = { chainID: config.chainID, safeVersion: config.safeVersion, saltNonce: config.saltNonce, verifierAddress,
    ownerAddress, safeAddress, proxyFactoryAddress, singletonAddress };
  return Object.freeze({ ...candidate, configHash: safeConfigHash({ ...candidate, coordinates }) });
};
