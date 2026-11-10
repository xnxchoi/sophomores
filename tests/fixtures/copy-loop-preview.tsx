// Real copy owners; routing, auth, media and mutations are synthetic boundaries.
import { useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { LazyMotion, domAnimation } from "motion/react";
import { EnglishMessages } from "./english-messages";
import { SearchPanel, NotificationPanel } from "@/components/shell/header-panels";
import { NotificationProvider } from "@/components/notifications/notification-inbox";
import { NotificationList } from "@/components/notifications/notification-list";
import { CommerceOfferView } from "@/components/commerce/offer";
import { PolicyPage } from "@/app/(site)/_commerce/policy-page";
import type { CommerceOffer } from "@/lib/commerce/catalogue";
import AccountSettings from "@/app/(site)/me/settings/account/page.client";
import GeneralSettings from "@/app/(site)/me/settings/general/page.client";
import SecuritySettings from "@/app/(site)/me/settings/security/page.client";
import { SettingsNavProvider } from "@/components/settings/SettingsNav";
import PreviewLogin from "@/app/(auth)/login/page";
import { PhoneVerification } from "@/components/Authentication/phone-verification/phone-verification";
import { TrackPlayer } from "@/components/radio/track-player";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { NotFoundPage } from "@/components/layouts/Missing/not-found-screen";
import type { User } from "@/payload-types";
import type { Notification } from "@/lib/content/slots";

const user: User = { id: "synthetic-user", membershipStatus: "approved", localePreference: "en", name: "Synthetic reader", email: "reader@example.invalid", emailVerified: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", collection: "users" };
const notifications: Notification[] = [{ id: "synthetic-note", title: "Synthetic notification", body: "Local fixture only", href: "/", imageUrl: "", read: false, createdAt: "2026-01-01T00:00:00Z" }];
const syntheticPolicy = { effectiveDate: "2026-01-01", sections: [{ heading: "Synthetic policy", paragraphs: ["Fixture only. Not approved purchase terms."] }] };
const syntheticOffer: CommerceOffer = {
  productID: "synthetic-product", title: "Synthetic collectible", description: "Fixture data only. Not a product or an approved offer.", images: [],
  priceKRW: 1000, shippingFeeKRW: 3000, maximumQuantity: 3, availableQuantity: 3,
  saleStartsAt: "2026-01-01T00:00:00Z", saleEndsAt: "2027-01-01T00:00:00Z", dispatchSchedule: "Synthetic schedule", productVersion: "fixture", eventVersion: "fixture",
  event: { id: "synthetic-event", title: "Synthetic event", eventStartsAt: "2026-12-01T00:00:00Z" },
  publication: { _status: "published", publicationApproved: true, physicalProductApproved: true, fulfillmentReady: true, addressRetentionApproved: true, shippingCountries: ["KR"],
    disclosure: { seller: { name: "Synthetic seller", representative: "Synthetic owner", registrationNumber: "Fixture only", address: "Synthetic address", phone: "Fixture only" }, policies: { terms: syntheticPolicy, privacy: syntheticPolicy, refund: syntheticPolicy } } }
};
window.fetch = async () => { throw new Error("Outbound requests are forbidden"); };
Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Synthetic clipboard failure"); } } });

function Preview({ login }: { login: ReactNode }) {
  const [view, setView] = useState("notifications");
  return <EnglishMessages><LazyMotion features={domAnimation}><SettingsNavProvider>
    <main className="min-h-screen bg-background p-6 text-foreground">
      <aside className="relative z-40 mx-auto mb-8 max-w-3xl space-y-3 rounded-xl border border-neutral-700 bg-neutral-950 p-4 text-xs">
        <p>Synthetic copy loop. Real components; routing, identity, server actions, address provider and artwork/media are stubbed. No production or full-flow acceptance.</p>
        <nav className="flex flex-wrap gap-2">{["notifications", "settings", "preview-login", "phone-help", "radio-copy", "missing", "front-account", "front-security", "front-offer", "front-search", "front-policy"].map((id) => <button key={id} type="button" className="min-h-12 rounded border px-3" aria-pressed={view === id} onClick={() => setView(id)}>{id}</button>)}</nav>
      </aside>
      <div className="mx-auto max-w-3xl space-y-8">
        {view === "notifications" && <NotificationProvider userId="synthetic-user" notifications={notifications}>
          <section className="relative min-h-[380px]" aria-label="Synthetic notification panel"><div className="relative"><NotificationPanel onClose={() => {}} /></div></section>
          <section aria-label="Synthetic full notification list"><NotificationList notifications={notifications} /></section>
        </NotificationProvider>}
        {view === "settings" && <><GeneralSettings user={user} /><SecuritySettings user={user} initialSessions={[]} initialAccounts={[]} /></>}
        {view === "preview-login" && <section className="mx-auto max-w-md" aria-label="Synthetic preview login">{login}</section>}
        {view === "phone-help" && <PhoneVerification initialLocale="en" />}
        {view === "radio-copy" && <><TrackPlayer track={{ id: "synthetic-track", title: "Synthetic track", artist: "Synthetic artist", slug: "synthetic-track", coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E", audioUrl: "/synthetic-audio-disabled.wav", duration: 120 }} /><CopyButton value="synthetic value" /></>}
        {view === "missing" && <NotFoundPage />}
        {view === "front-account" && <AccountSettings user={user} />}
        {view === "front-security" && <SecuritySettings user={user} initialAccounts={[]} initialSessions={[
          { id: "synthetic-unknown-session", userAgent: null, ipAddress: "192.0.2.1", createdAt: "2026-01-01T00:00:00Z" },
          { id: "synthetic-known-session", userAgent: "Synthetic browser", createdAt: "2026-01-01T00:00:00Z" }
        ]} />}
        {view === "front-offer" && <CommerceOfferView offer={syntheticOffer}><p>No payment controls in this fixture.</p></CommerceOfferView>}
        {view === "front-search" && <SearchPanel posts={[{ slug: "synthetic-article", title: "Synthetic article", dek: "A local fixture about conversation" }]} onClose={() => setView("notifications")} />}
        {view === "front-policy" && <PolicyPage policy="terms" />}

      </div>
    </main>
  </SettingsNavProvider></LazyMotion></EnglishMessages>;
}

async function mount() {
  const login = await PreviewLogin({ searchParams: Promise.resolve({}) });
  createRoot(document.getElementById("root")!).render(<Preview login={login} />);
}
void mount();
