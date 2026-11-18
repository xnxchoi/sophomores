import "server-only";
import { createLocalReq } from "payload";
import { getPayload } from "@/payload";
import { getPayloadMemberRuntime } from "../payload-runtime";
import { readMemberWelcome, type MemberWelcomeView } from "./read";

export async function loadMemberWelcome(headers: Headers): Promise<MemberWelcomeView> {
  try {
    const runtime = getPayloadMemberRuntime();
    if (!runtime) return { state: "unavailable" };
    const principal = await runtime.toMemberPrincipal(new Request(runtime.config.origin, { headers }));
    if (!principal) return { state: "signed-out" };
    const payload = await getPayload();
    const req = await createLocalReq({ req: { headers } }, payload);
    return await readMemberWelcome(req, principal, runtime.capabilities.passkey);
  } catch {
    console.error("Member welcome could not be loaded.");
    return { state: "unavailable" };
  }
}
