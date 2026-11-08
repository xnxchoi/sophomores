import { createHmac, randomBytes } from "node:crypto";
import { VerificationError } from "./contracts";

export const randomToken = () => randomBytes(32).toString("base64url");
export function digest(secret: string, purpose: string, value: string): string {
  return createHmac("sha256", secret)
    .update(`${purpose}\0${value}`)
    .digest("hex");
}
export function proofToken(
  secret: string,
  id: string,
  sessionHash: string
): string {
  return createHmac("sha256", secret)
    .update(`proof-token\0${id}\0${sessionHash}`)
    .digest("base64url");
}
export function normalizePhone(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 32 ||
    !/^[+\d ()-]+$/.test(value)
  )
    throw new VerificationError("INVALID_INPUT");
  const compact = value.replace(/[ ()-]/g, "").replace(/^\+82/, "0");
  if (!/^010\d{8}$/.test(compact)) throw new VerificationError("INVALID_INPUT");
  return compact;
}
export function requireToken(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(value))
    throw new VerificationError("INVALID_INPUT");
  return value;
}
export function requireId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  )
    throw new VerificationError("INVALID_INPUT");
  return value;
}
export function requireReference(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 256 ||
    !/^[A-Za-z0-9_.:@<>+-]+$/.test(value)
  )
    throw new VerificationError("INVALID_INPUT");
  return value;
}
