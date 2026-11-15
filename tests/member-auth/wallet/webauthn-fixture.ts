import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from "node:crypto";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { isoBase64URL, isoCBOR } from "@simplewebauthn/server/helpers";

/**
 * Test-only software authenticator. Produces real WebAuthn registration and
 * assertion responses (attestation "none") so the server verifies genuine
 * ES256 / RS256 signatures through @simplewebauthn/server.
 */
export type Algorithm = "ES256" | "RS256";
const sha256 = (data: Uint8Array | string) => createHash("sha256").update(data).digest();
const u32 = (value: number) => { const buffer = Buffer.alloc(4); buffer.writeUInt32BE(value); return buffer; };

export function softwareAuthenticator(algorithm: Algorithm = "ES256") {
  const keys = algorithm === "ES256" ? generateKeyPairSync("ec", { namedCurve: "P-256" }) : generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKey: KeyObject = keys.privateKey;
  const jwk = keys.publicKey.export({ format: "jwk" });
  const cose = new Map<number, number | Uint8Array>(algorithm === "ES256"
    ? [[1, 2], [3, -7], [-1, 1], [-2, isoBase64URL.toBuffer(jwk.x!)], [-3, isoBase64URL.toBuffer(jwk.y!)]]
    : [[1, 3], [3, -257], [-1, isoBase64URL.toBuffer(jwk.n!)], [-2, isoBase64URL.toBuffer(jwk.e!)]]);
  const publicKey = isoCBOR.encode(cose as never);
  const credentialID = randomBytes(16);
  const id = isoBase64URL.fromBuffer(credentialID);
  let counter = 0;
  const clientData = (type: string, challenge: string, origin: string) => Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));

  return {
    id,
    algorithm,
    /** How better-auth stores a sign-in passkey's key: base64 COSE. */
    storedPublicKey: Buffer.from(publicKey).toString("base64"),
    register({ challenge, origin, rpID }: { challenge: string; origin: string; rpID: string }): RegistrationResponseJSON {
      // Flags: user present, user verified, attested credential data.
      const authData = Buffer.concat([sha256(rpID), Buffer.from([0x45]), u32(counter), Buffer.alloc(16), Buffer.from([0, credentialID.length]), credentialID, publicKey]);
      const attestationObject = isoCBOR.encode(new Map<string, unknown>([["fmt", "none"], ["attStmt", new Map()], ["authData", authData]]) as never);
      return { id, rawId: id, type: "public-key", clientExtensionResults: {},
        response: { clientDataJSON: isoBase64URL.fromBuffer(clientData("webauthn.create", challenge, origin)), attestationObject: isoBase64URL.fromBuffer(attestationObject), transports: ["internal"] } };
    },
    assert({ challenge, origin, rpID }: { challenge: string; origin: string; rpID: string }): AuthenticationResponseJSON {
      counter += 1;
      const authData = Buffer.concat([sha256(rpID), Buffer.from([0x05]), u32(counter)]);
      const client = clientData("webauthn.get", challenge, origin);
      const signature = sign("sha256", Buffer.concat([authData, sha256(client)]), privateKey);
      return { id, rawId: id, type: "public-key", clientExtensionResults: {},
        response: { clientDataJSON: isoBase64URL.fromBuffer(client), authenticatorData: isoBase64URL.fromBuffer(authData), signature: isoBase64URL.fromBuffer(signature) } };
    },
  };
}
