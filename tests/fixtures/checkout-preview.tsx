import { createRoot } from "react-dom/client";
import { useState } from "react";
import { TicketSelection } from "@/components/tickets/ticket-selection";
import { PortOnePaymentResult } from "@/components/tickets/portone-payment-result";
import { SellerDisclosure } from "@/app/(site)/_commerce/seller-disclosure";
import { PolicyPage } from "@/app/(site)/_commerce/policy-page";
import type { MemberClient } from "@/lib/member-auth/client";

const paymentId = "91b6495b-479b-4306-98f1-83b729807aea";
const heldPaymentId = "91b6495b-479b-4306-98f1-83b729807aeb";
const recoveryAttemptId = "91b6495b-479b-4306-98f1-83b729807aec";
const resumeScenario = window.sessionStorage.getItem("fixture.resume-scenario");
const noAction = async () => {};
const memberClient: MemberClient = {
  status: async () => ({ authenticated: true, phoneBindingAuth: "ready", emailVerified: true, phoneBound: true, member: true,
    capabilities: { emailOtp: true, magicLink: true, google: false, passkey: false } }),
  clearPhoneIdentifier: noAction, identifyPhone: noAction, sendEmailCode: noAction,
  sendMagicLink: noAction, signInGoogle: noAction, verifyEmailCode: noAction,
  signInPasskey: noAction, addPasskey: noAction, bindPhone: noAction, signOut: noAction
};
const expiredMemberClient: MemberClient = { ...memberClient, status: async () => ({
  authenticated: false, phoneBindingAuth: "anonymous", emailVerified: false, phoneBound: false, member: false,
  capabilities: { emailOtp: true, magicLink: true, google: false, passkey: false }
}) };

// All HTTP work is synthetic and local to this fixture; unknown requests fail.
window.fetch = async (input, init) => {
  const path = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  const quantity = path === "/api/payments/portone/prepare" ? JSON.parse(String(init?.body ?? "{}" )).quantity : 1;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 3) return Response.json({ success: false }, { status: 400 });
  if (path === "/api/payments/portone/prepare") return Response.json({ success: true, data: {
    storeId: "store-fixture", channelKey: "channel-fixture", paymentId,
    orderName: "Synthetic sandbox admission", totalAmount: 12345 * quantity, currency: "KRW",
    redirectUrl: window.location.origin + "/tickets/payment", customer: { customerId: "fixture-customer" },
    recovered: JSON.parse(String(init?.body ?? "{}")).attemptId === recoveryAttemptId
  } });
  if (path === "/api/payments/portone/complete") {
    const requestedId = JSON.parse(String(init?.body ?? "{}")).paymentId;
    if (requestedId !== paymentId && requestedId !== heldPaymentId) return Response.json({ success: false }, { status: 404 });
    if (resumeScenario === "resumable") return Response.json({ success: false }, { status: 409 });
    return Response.json({ success: true, data: { orderId: requestedId, status: requestedId === heldPaymentId || resumeScenario === "held" ? "held" : resumeScenario ? "pending" : "paid" } });
  }
  if (path === "/api/payments/portone/resume") {
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (body.paymentId !== paymentId || body.attemptId !== recoveryAttemptId) return Response.json({ success: false }, { status: 400 });
    if (resumeScenario !== "resumable") return Response.json({ success: true, data: { outcome: "status-only" } });
    return Response.json({ success: true, data: { outcome: "resumable", request: {
      storeId: "store-fixture", channelKey: "channel-fixture", paymentId, orderName: "Synthetic sandbox admission",
      totalAmount: 24690, currency: "KRW", redirectUrl: window.location.origin + "/tickets/payment", customer: { customerId: "fixture-customer" },
    } } });
  }
  throw new Error("Outbound work is forbidden in this fixture");
};

if (resumeScenario && window.location.pathname === "/tickets/payment") {
  window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify({ schemaVersion: 1, attemptId: recoveryAttemptId, quantity: 2,
    order: { paymentId, quantity: 2, totalAmount: 24690, currency: "KRW" } }));
}

function CheckoutPreview() {
  const [recoveryScenario, setRecoveryScenario] = useState<"fresh" | "closed" | "expired" | "no-offer">("fresh");
  const path = window.location.pathname;
  const policy = path === "/terms" ? "terms" : path === "/privacy" ? "privacy" : path === "/refund" ? "refund" : null;
  return <div className="min-h-svh bg-neutral-950 text-neutral-100">
    <aside className="border-b border-neutral-700 bg-neutral-900 px-6 py-3 text-xs leading-5 text-neutral-300">
      Synthetic UI preview — no account, charge, ticket, provider or database operation.
      <nav className="mt-1 flex flex-wrap gap-x-5"><a href="/tickets" className="inline-flex min-h-11 items-center underline">Ticket UI</a><a href="/terms" className="inline-flex min-h-11 items-center underline">Policy UI</a></nav>
      {!policy && path === "/tickets/payment" && <div className="flex flex-wrap gap-3">{["resumable", "status-only", "held"].map((scenario) => <button key={scenario} type="button" className="min-h-11 rounded-lg border border-neutral-600 px-4" onClick={() => {
        window.sessionStorage.setItem("fixture.resume-scenario", scenario);
        window.location.reload();
      }}>Load {scenario}</button>)}</div>}
      {!policy && path !== "/tickets/payment" && <div className="mt-2 flex flex-wrap gap-3"><button type="button" disabled={recoveryScenario !== "fresh"} className="min-h-11 rounded-lg border border-neutral-600 px-4 disabled:opacity-50"
        onClick={() => {
          window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify({ schemaVersion: 1, attemptId: recoveryAttemptId, quantity: 2 }));
          setRecoveryScenario("closed");
        }}>Load closed-sale recovery</button><button type="button" disabled={recoveryScenario !== "fresh"} className="min-h-11 rounded-lg border border-neutral-600 px-4 disabled:opacity-50"
        onClick={() => {
          window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify({ schemaVersion: 1, attemptId: recoveryAttemptId, quantity: 2,
            order: { paymentId, quantity: 2, totalAmount: 24690, currency: "KRW" } }));
          setRecoveryScenario("expired");
        }}>Load expired-session recovery</button><button type="button" disabled={recoveryScenario !== "fresh"} className="min-h-11 rounded-lg border border-neutral-600 px-4 disabled:opacity-50"
        onClick={() => {
          window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify({ schemaVersion: 1, attemptId: recoveryAttemptId, quantity: 2,
            order: { paymentId, quantity: 2, totalAmount: 24690, currency: "KRW" } }));
          setRecoveryScenario("no-offer");
        }}>Load missing-catalogue recovery</button></div>}
      {recoveryScenario === "closed" && <p>Fixture: lost prepare response; sale closed, catalogue unchanged. Recover the original 2-ticket KRW order without reopening payment.</p>}
      {recoveryScenario === "expired" && <p>Fixture: expired session, retained 2-ticket payment, new limit 1. Continue with account opens the synthetic account surface; no login is sent.</p>}
      {recoveryScenario === "no-offer" && <p>Fixture: retained 2-ticket payment, current catalogue unavailable. Check the original payment status without preparing a new checkout.</p>}
    </aside>
    {policy ? <PolicyPage policy={policy} /> : path === "/tickets/payment" ? <>
      <PortOnePaymentResult paymentId={new URLSearchParams(window.location.search).get("paymentId")}
        requestPayment={async () => { await new Promise((resolve) => window.setTimeout(resolve, 500)); return undefined; }} />
      <SellerDisclosure className="bg-neutral-950 text-neutral-100" />
    </> : <>
      <TicketSelection key={recoveryScenario} memberClient={recoveryScenario === "expired" ? expiredMemberClient : memberClient}
        checkoutCatalogue={recoveryScenario === "no-offer" ? null : { orderName: "Synthetic sandbox admission", unitAmount: 12345, currency: "KRW", maximumQuantity: recoveryScenario === "expired" ? 1 : 3,
          saleStartsAt: "2020-01-01T00:00:00Z", saleEndsAt: recoveryScenario !== "fresh" ? "2020-01-02T00:00:00Z" : "2099-01-01T00:00:00Z" }}
        checkoutReady={recoveryScenario === "fresh"} checkoutRequestPayment={async () => { await new Promise((resolve) => window.setTimeout(resolve, 500)); return undefined; }} />
      <SellerDisclosure className="bg-neutral-950 text-neutral-100" />
    </>}
  </div>;
}

createRoot(document.getElementById("root")!).render(<CheckoutPreview />);
