import { useState } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";
import { MemberAccountFlow } from "@/components/Authentication/member-auth/account-study";
import type { MemberClient } from "@/lib/member-auth/client";
import { CommerceOfferView } from "@/components/commerce/offer";
import { ShippingAddressForm } from "@/components/commerce/shipping-address";
import type { ShippingAddress } from "@/lib/commerce/contracts";
import { SellerDisclosure } from "@/app/(site)/_commerce/seller-disclosure";
import { PhoneVerification } from "@/components/Authentication/phone-verification/phone-verification";

const capabilities = { emailOtp: true, magicLink: true, google: true, passkey: true };
const noop = async () => {};
// No production client, SDK, provider or API is invoked by this fixture.
const client: MemberClient = {
  status: async () => ({ authenticated: false, phoneBindingAuth: "anonymous", emailVerified: false,
    phoneBound: false, member: false, capabilities }),
  lookupEmail: async () => ({ account: "new" }),
  clearPhoneIdentifier: noop, identifyPhone: noop, sendEmailCode: noop,
  sendMagicLink: noop, signInGoogle: noop, verifyEmailCode: noop,
  signInPasskey: noop, addPasskey: noop, bindPhone: noop, signOut: noop
};

function Preview() {
  const [locale, setLocale] = useState<"en" | "ko">("en");
  const [view, setView] = useState("account");
  const [address, setAddress] = useState<ShippingAddress>({ country: "KR", recipientName: "", phone: "",
    postalCode: "", addressLine1: "", addressLine2: "", deliveryInstructions: "" });
  return <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]} timeZone="Asia/Seoul">
    <div className="min-h-svh bg-neutral-950 text-neutral-100">
      <aside className="border-b border-white/20 p-4 text-xs leading-6">
        <p>Synthetic i18n review only. No account, mail, payment, postcode provider or database operation. Header navigation is disabled; routing, transitions and prefetching are not validated.</p>
        <div className="mt-2 flex flex-wrap gap-4">
          <label>Locale <select aria-label="Fixture locale" value={locale} onChange={(event) => setLocale(event.target.value === "ko" ? "ko" : "en")}>
            <option value="en">English</option><option value="ko">Korean overlay</option>
          </select></label>
          {[
            ["account", "Inline account"], ["shipping", "Shipping and seller"], ["phone", "Phone verification"]
          ].map(([id, label]) => <button type="button" key={id} className="min-h-11 px-3" aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}
        </div>
      </aside>
      {view === "account" ? <main className="mx-auto max-w-lg px-6 py-12">
        <MemberAccountFlow client={client} initialCapabilities={capabilities} headingId="fixture-account-heading" flow="signup" presentation="ticket-checkout" />
      </main> : view === "shipping" ? <>
        <CommerceOfferView offer={null} />
        <section className="mx-auto max-w-lg px-6 pb-12"><ShippingAddressForm value={address} onChange={setAddress} /></section>
        <SellerDisclosure seller={null} />
      </> : <PhoneVerification key={locale} initialLocale={locale} />}
    </div>
  </NextIntlClientProvider>;
}

createRoot(document.getElementById("root")!).render(<Preview />);
