import "server-only";
import type { PayloadRequest } from "payload";
import { getPayloadMemberRuntime } from "../payload-runtime";
import { readWelcome, type WelcomeView } from "./read";

/** For the server-rendered welcome page: the visitor's state from the fresh canonical session. */
export async function loadWelcomeView(headers: Headers): Promise<WelcomeView> {
  try {
    const runtime = getPayloadMemberRuntime();
    if (!runtime) return { state: "unavailable" };
    const principal = await runtime.toMemberPrincipal(
      new Request(runtime.config.origin, { headers })
    );
    if (!principal) return { state: "signed_out" };
    const { getPayload } = await import("../../../payload");
    const payload = await getPayload();
    return await readWelcome({
      req: { payload, context: {} } as unknown as PayloadRequest,
      principal
    });
  } catch {
    console.error("The welcome page state is unavailable.");
    return { state: "unavailable" };
  }
}
