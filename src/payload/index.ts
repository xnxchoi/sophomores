import configPromise, { buildNfcPayloadConfig } from "@payload-config";
import { getPayload as getLocalPayload } from "payload";
import { getPayloadAuth } from "payload-auth/better-auth";
import type { ConstructedBetterAuthPluginOptions } from "@/lib/auth/options";

export const getPayload = async () =>
  getPayloadAuth<ConstructedBetterAuthPluginOptions>(configPromise);

let inspectionConfig: ReturnType<typeof buildNfcPayloadConfig> | undefined;
let writerConfig: ReturnType<typeof buildNfcPayloadConfig> | undefined;
export async function getNfcPayload(readOnly: boolean) {
  const payload = await getLocalPayload({
    key: readOnly ? "nfc-inspection" : "nfc-handoff",
    config: readOnly ? (inspectionConfig ??= buildNfcPayloadConfig(true)) : (writerConfig ??= buildNfcPayloadConfig(false)),
  });
  const auth = (payload as Awaited<ReturnType<typeof getPayload>>).betterAuth;
  if (!auth) throw new Error("NFC session reader is unavailable");
  return { payload, auth };
}
