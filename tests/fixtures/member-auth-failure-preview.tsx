import { createRoot } from "react-dom/client";
import { MemberAccountStudy } from "../../components/Authentication/member-auth/account-study";
import {
  createMemberClient,
  type MemberAuthBrowserApi
} from "../../lib/member-auth/client";

const syntheticEmail = "qa-member@example.test";
let authenticated = false;
let failNextDelivery = false;
const fakeSdk: MemberAuthBrowserApi = {
  emailOtp: {
    async sendVerificationOtp({ email }) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (failNextDelivery) {
        failNextDelivery = false;
        throw new TypeError("SIMULATED_NETWORK_FAILURE");
      }
      return { error: email === syntheticEmail ? null : { code: "QA_EMAIL_ONLY" } };
    }
  },
  signIn: {
    async emailOtp({ email, otp }) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (otp === "E1X2P3") {
        failNextDelivery = true;
        return { error: { code: "OTP_EXPIRED" } };
      }
      if (email !== syntheticEmail || otp !== "A1B2C3") {
        return { error: { code: "INVALID_OTP", message: "PRIVATE_QA_SDK_DETAIL" } };
      }
      authenticated = true;
      return { error: null };
    },
    async magicLink() {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { error: { status: 500, message: "PRIVATE_QA_DELIVERY_DETAIL" } };
    },
    async social() {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { error: { code: "ACCESS_DENIED" } };
    },
    async passkey() {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { error: { code: "AUTH_CANCELLED" } };
    }
  },
  passkey: {
    async addPasskey() {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { error: { code: "QA_UNAVAILABLE" } };
    }
  },
  async signOut() {
    await new Promise((resolve) => setTimeout(resolve, 300));
    authenticated = false;
    return { error: null };
  }
};
const fakeFetch: typeof fetch = async (input, init) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (input === "/api/member/identify" && init?.method === "DELETE") {
    return Response.json({ success: true, data: { identified: false } });
  }
  if (input !== "/api/member/status" || (init?.method ?? "GET") !== "GET") {
    return Response.json({ success: false, error: { code: "QA_UNAVAILABLE" } }, { status: 404 });
  }
  return Response.json({
    success: true,
    data: {
      authenticated,
      emailVerified: authenticated,
      phoneBound: false,
      member: false,
      capabilities: { emailOtp: true, magicLink: true, google: true, passkey: true }
    }
  });
};
// Also contain any optional phone-step fetch if QA explores beyond the email gate.
globalThis.fetch = fakeFetch;
const client = createMemberClient(fakeSdk, fakeFetch);

createRoot(document.getElementById("account-qa-root")!).render(
  <>
    <aside className="fixed inset-x-0 top-0 z-[100] bg-neutral-900 px-3 py-2 text-center text-xs leading-5 text-neutral-300">
      Simulated client QA — no requests are sent. Email: {syntheticEmail}. Valid code: A1B2C3.
    </aside>
    <MemberAccountStudy client={client} />
  </>
);
