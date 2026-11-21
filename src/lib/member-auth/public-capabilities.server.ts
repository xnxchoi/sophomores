import "server-only";
import { configuredMemberCapabilities, loadPayloadMemberConfig, resolveMemberCapabilities } from "./payload-config";

/** Request-time configuration only; never constructs the member runtime. */
export async function loadPublicMemberCapabilities() {
  try {
    return await resolveMemberCapabilities(loadPayloadMemberConfig());
  } catch {
    console.error("Member sign-in options are unavailable.");
    return configuredMemberCapabilities(null);
  }
}
