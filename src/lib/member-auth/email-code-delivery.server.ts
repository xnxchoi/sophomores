import { AsyncLocalStorage } from "node:async_hooks";
import { logAuthFailure } from "../auth/failure-log";
import { memberJson } from "./http";

type Delivery = { outcome: "not-attempted" | "accepted" | "failed" };
const delivery = new AsyncLocalStorage<Delivery>();

/**
 * Better Auth 1.7.16 catches delivery exceptions and acknowledges the send anyway.
 * Keep the SDK's OTP generation, storage and rate limit, but require delivery
 * acknowledgement before returning success to the browser.
 */
export async function withEmailCodeDelivery(handle: () => Promise<Response>): Promise<Response> {
  const receipt: Delivery = { outcome: "not-attempted" };
  return delivery.run(receipt, async () => {
    const response = await handle();
    if (!response.ok || receipt.outcome === "accepted") return response;
    if (receipt.outcome === "failed") return memberJson(502, {
      code: "EMAIL_CODE_DELIVERY_FAILED", message: "We could not send the email.",
    });
    // An account can disappear between discovery and Send. Do not acknowledge an unsent code.
    return memberJson(409, { code: "EMAIL_CODE_NOT_SENT", message: "No sign-in code was sent." });
  });
}

export async function sendTrackedEmailCode(send: () => Promise<void>): Promise<void> {
  const receipt = delivery.getStore();
  if (!receipt) return send();
  try {
    await send();
    receipt.outcome = "accepted";
  } catch (error) {
    receipt.outcome = "failed";
    logAuthFailure("Sign-in code delivery failed.", error);
  }
}
