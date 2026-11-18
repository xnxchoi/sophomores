import "server-only";
import { getPayloadMemberRuntime } from "./payload-runtime";

export type HeaderMemberState =
  | { state: "signed-out" | "unavailable" }
  | { state: "signed-in"; member: boolean };

/** Request-scoped projection for the header; do not cache or serialize the principal. */
export async function readHeaderMemberState(headers: Headers): Promise<HeaderMemberState> {
  try {
    const runtime = getPayloadMemberRuntime();
    if (!runtime) return { state: "unavailable" };
    const principal = await runtime.toMemberPrincipal(new Request(runtime.config.origin, { headers }));
    if (!principal) return { state: "signed-out" };
    const { member } = await runtime.service.status(principal);
    return { state: "signed-in", member };
  } catch {
    console.error("Header membership state could not be loaded.");
    return { state: "unavailable" };
  }
}
