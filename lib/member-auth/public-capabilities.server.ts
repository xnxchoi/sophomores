import "server-only";
import { configuredMemberCapabilities, loadPayloadMemberConfig } from "./payload-config";

/** Request-time configuration only; never constructs the member runtime. */
export function loadPublicMemberCapabilities() {
  try {
    return configuredMemberCapabilities(loadPayloadMemberConfig());
  } catch {
    console.error("Member sign-in options are unavailable.");
    return configuredMemberCapabilities(null);
  }
}
