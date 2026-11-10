// Synthetic visual acceptance only: no real account, claim, lookup or provider.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { EnglishMessages } from "./english-messages";
import { InvitationClaim } from "@/components/commerce/invitation-claim";
import { ShippingAddressForm } from "@/components/commerce/shipping-address";
import { OrderAdmissions } from "@/components/commerce/order-admissions";
import type { ShippingAddress } from "@/lib/commerce/contracts";

const scenario = new URLSearchParams(window.location.search).get("scenario");
const counts = { claim: 0, admissions: 0 };
Object.assign(window, { commerceCopyFixtureCounts: counts });
window.fetch = async (input, options) => {
  if (input === "/api/commerce/guest-operations") {
    const body = JSON.parse(String(options?.body));
    if (options?.method !== "POST" || body.action !== "claim" || body.token !== "a".repeat(43)) {
      throw new Error("Unexpected synthetic claim");
    }
    counts.claim++;
    await new Promise((resolve) => window.setTimeout(resolve, 750));
    if (scenario === "failure") return Response.json({}, { status: 503 });
    if (scenario === "malformed") return Response.json({ admissionID: "invalid" });
    return Response.json({ admissionID: "123e4567-e89b-42d3-a456-426614174002" });
  }
  if (input === "/api/commerce/orders/123e4567-e89b-42d3-a456-426614174001/admissions") {
    counts.admissions++;
    return Response.json({}, { status: 503 });
  }
  throw new Error("Outbound work is forbidden in this fixture");
};

function Preview() {
  const [address, setAddress] = useState<ShippingAddress>({ country: "KR", recipientName: "", phone: "", postalCode: "", addressLine1: "" });
  return <EnglishMessages>
    <main className="min-h-screen bg-neutral-950 px-6 py-8 font-sans text-neutral-100">
      <aside className="mx-auto mb-8 max-w-xl rounded-xl border border-neutral-700 p-4 text-xs leading-5 text-neutral-400">
        Synthetic copy review — authentication is stubbed. All claims, admissions and lookup failures are fixtures. No provider or database calls.
      </aside>
      <div className="mx-auto max-w-xl space-y-10">
        <section aria-label="Synthetic invitation" className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <InvitationClaim initialCapabilities={{ emailOtp: false, magicLink: false, google: false, passkey: false }} />
        </section>
        <section aria-label="Synthetic delivery form" className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <ShippingAddressForm value={address} onChange={setAddress} />
        </section>
        <section aria-label="Synthetic admissions error" className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <OrderAdmissions orderID="123e4567-e89b-42d3-a456-426614174001" />
        </section>
      </div>
    </main>
  </EnglishMessages>;
}

createRoot(document.getElementById("root")!).render(<Preview />);
