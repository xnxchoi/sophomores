import "server-only";
import type { PayloadRequest } from "payload";
import { getPayloadMemberRuntime } from "../payload-runtime";
import { createWalletActivation, payloadTransact } from "./activation";
import { loadWalletConfig } from "./config";
import { relyingParty } from "./credentials";
import { createWalletHandlers } from "./http";
import { readWalletActivation, type WalletActivationView } from "./read";
import { predictMemberSafe } from "./safe";

/** Production wiring: canonical member runtime, Payload Local API, read-only Safe prediction. */
export async function walletHandlers() {
  const runtime = getPayloadMemberRuntime();
  if (!runtime) return null;
  const { getPayload } = await import("../../../payload");
  const payload = await getPayload();
  let config: ReturnType<typeof loadWalletConfig> = null;
  try { config = loadWalletConfig(); } catch { console.error("Member wallet configuration is invalid."); }
  const activation = config ? createWalletActivation({ rp: relyingParty(runtime.config.origin), config, predict: predictMemberSafe, transact: payloadTransact(payload) }) : null;
  return createWalletHandlers({ origin: runtime.config.origin, activation, resolvePrincipal: runtime.toMemberPrincipal,
    readStatus: (principal) => readWalletActivation({ req: { payload, context: {} } as unknown as PayloadRequest, principal, config }) });
}

/** For server-rendered pages: the visitor's activation state from the fresh canonical session. */
export async function loadWalletActivationView(headers: Headers): Promise<WalletActivationView> {
  try {
    const runtime = getPayloadMemberRuntime();
    if (!runtime) return { state: "unavailable" };
    const principal = await runtime.toMemberPrincipal(new Request(runtime.config.origin, { headers }));
    if (!principal) return { state: "signed_out" };
    const { getPayload } = await import("../../../payload");
    const payload = await getPayload();
    let config: ReturnType<typeof loadWalletConfig> = null;
    try { config = loadWalletConfig(); } catch { config = null; }
    return await readWalletActivation({ req: { payload, context: {} } as unknown as PayloadRequest, principal, config });
  } catch {
    console.error("Member wallet state is unavailable.");
    return { state: "unavailable" };
  }
}
