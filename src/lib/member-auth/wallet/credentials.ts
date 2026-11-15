import { createPublicKey } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON
} from "@simplewebauthn/server";
import {
  cose,
  decodeCredentialPublicKey,
  isoBase64URL
} from "@simplewebauthn/server/helpers";
import type { PasskeyCoordinates } from "./safe";

/*
 * WebAuthn for the member wallet (ADR-0005), through @simplewebauthn/server.
 * Sign-in passkeys stay unrestricted; only a P-256 (ES256) credential can own
 * a Safe, so this module accepts ES256 alone and decodes keys with the
 * library's COSE helpers rather than custom CBOR or signature code.
 */

export const ES256 = -7;
export class WalletCredentialError extends Error {
  constructor(
    readonly code:
      "INCOMPATIBLE_CREDENTIAL" | "INVALID_ASSERTION" | "INVALID_REGISTRATION"
  ) {
    super(code);
  }
}

export type RelyingParty = Readonly<{ origin: string; rpID: string }>;
export type WalletCredential = Readonly<{
  credentialID: string;
  /** base64url COSE public key, as verified. */
  publicKey: string;
  counter: number;
  transports: AuthenticatorTransportFuture[];
  coordinates: PasskeyCoordinates;
}>;

export const relyingParty = (origin: string): RelyingParty =>
  Object.freeze({ origin, rpID: new URL(origin).hostname });

/** Coordinates of an ES256 COSE key, or INCOMPATIBLE_CREDENTIAL. The key must lie on P-256. */
export function es256Coordinates(publicKey: Uint8Array): PasskeyCoordinates {
  let key: ReturnType<typeof decodeCredentialPublicKey>;
  try {
    key = decodeCredentialPublicKey(new Uint8Array(publicKey));
  } catch {
    throw new WalletCredentialError("INCOMPATIBLE_CREDENTIAL");
  }
  if (
    !cose.isCOSEPublicKeyEC2(key) ||
    key.get(cose.COSEKEYS.kty) !== cose.COSEKTY.EC2 ||
    key.get(cose.COSEKEYS.alg) !== ES256 ||
    key.get(cose.COSEKEYS.crv) !== cose.COSECRV.P256
  )
    throw new WalletCredentialError("INCOMPATIBLE_CREDENTIAL");
  const x = key.get(cose.COSEKEYS.x);
  const y = key.get(cose.COSEKEYS.y);
  if (
    !(x instanceof Uint8Array) ||
    !(y instanceof Uint8Array) ||
    x.length !== 32 ||
    y.length !== 32
  )
    throw new WalletCredentialError("INCOMPATIBLE_CREDENTIAL");
  // Node's key import rejects points that are not on the curve.
  try {
    createPublicKey({
      key: {
        kty: "EC",
        crv: "P-256",
        x: isoBase64URL.fromBuffer(x),
        y: isoBase64URL.fromBuffer(y)
      },
      format: "jwk"
    });
  } catch {
    throw new WalletCredentialError("INCOMPATIBLE_CREDENTIAL");
  }
  return {
    x: `0x${Buffer.from(x).toString("hex")}`,
    y: `0x${Buffer.from(y).toString("hex")}`
  };
}

/**
 * Existing sign-in passkeys store a base64 COSE key (better-auth). Returns the
 * coordinates when the key is ES256 and null otherwise; it never throws for an
 * incompatible algorithm, so RS256 or Ed25519 sign-in passkeys keep working.
 */
export function storedPasskeyCoordinates(
  stored: string
): PasskeyCoordinates | null {
  try {
    return es256Coordinates(Buffer.from(stored, "base64"));
  } catch {
    return null;
  }
}

/** A separate ES256 wallet passkey; sign-in registration is untouched. */
export async function walletRegistrationOptions(input: {
  rp: RelyingParty;
  userID: string;
  userName: string;
  excludeCredentialIDs: string[];
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return generateRegistrationOptions({
    rpName: "Sophomores",
    rpID: input.rp.rpID,
    userName: input.userName,
    userID: new TextEncoder().encode(input.userID),
    attestationType: "none",
    supportedAlgorithmIDs: [ES256],
    timeout: 120_000,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required"
    },
    excludeCredentials: input.excludeCredentialIDs.map((id) => ({ id }))
  });
}

export async function verifyWalletRegistration(input: {
  rp: RelyingParty;
  challenge: string;
  response: RegistrationResponseJSON;
}): Promise<WalletCredential> {
  let verified: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verified = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: input.challenge,
      expectedOrigin: input.rp.origin,
      expectedRPID: input.rp.rpID,
      requireUserVerification: true,
      supportedAlgorithmIDs: [ES256]
    });
  } catch (error) {
    if (error instanceof Error && /alg/i.test(error.message))
      throw new WalletCredentialError("INCOMPATIBLE_CREDENTIAL");
    throw new WalletCredentialError("INVALID_REGISTRATION");
  }
  if (!verified.verified || !verified.registrationInfo)
    throw new WalletCredentialError("INVALID_REGISTRATION");
  const { credential } = verified.registrationInfo;
  return Object.freeze({
    credentialID: credential.id,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? [],
    coordinates: es256Coordinates(credential.publicKey)
  });
}

/** The fresh wallet-bind approval. A sign-in or registration approval is never reused for it. */
export async function walletBindOptions(input: {
  rp: RelyingParty;
  credential: Pick<WalletCredential, "credentialID" | "transports">;
}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return generateAuthenticationOptions({
    rpID: input.rp.rpID,
    userVerification: "required",
    timeout: 120_000,
    allowCredentials: [
      {
        id: input.credential.credentialID,
        transports: input.credential.transports
      }
    ]
  });
}

/** Verifies the bind assertion; returns the authenticator's new counter. */
export async function verifyWalletBind(input: {
  rp: RelyingParty;
  challenge: string;
  credential: WalletCredential;
  response: AuthenticationResponseJSON;
}): Promise<number> {
  if (
    input.response.id !== input.credential.credentialID ||
    input.response.rawId !== input.credential.credentialID
  )
    throw new WalletCredentialError("INVALID_ASSERTION");
  try {
    const result = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: input.challenge,
      expectedOrigin: input.rp.origin,
      expectedRPID: input.rp.rpID,
      requireUserVerification: true,
      credential: {
        id: input.credential.credentialID,
        publicKey: isoBase64URL.toBuffer(input.credential.publicKey),
        counter: input.credential.counter,
        transports: input.credential.transports
      }
    });
    if (!result.verified) throw new Error("unverified");
    return result.authenticationInfo.newCounter;
  } catch {
    throw new WalletCredentialError("INVALID_ASSERTION");
  }
}
