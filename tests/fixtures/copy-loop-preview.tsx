// Real copy owners; routing, auth, media and mutations are synthetic boundaries.
import { useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { LazyMotion, domAnimation } from "motion/react";
import { EnglishMessages } from "./english-messages";
import { NotificationPanel } from "@/components/shell/header-panels";
import { NotificationProvider } from "@/components/notifications/notification-inbox";
import { NotificationList } from "@/components/notifications/notification-list";
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
window.fetch = async () => { throw new Error("Outbound requests are forbidden"); };
Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Synthetic clipboard failure"); } } });

function Preview({ login }: { login: ReactNode }) {
  const [view, setView] = useState("notifications");
  return <EnglishMessages><LazyMotion features={domAnimation}><SettingsNavProvider>
    <main className="min-h-screen bg-background p-6 text-foreground">
      <aside className="relative z-50 mx-auto mb-8 max-w-3xl space-y-3 rounded-xl border border-neutral-700 bg-neutral-950 p-4 text-xs">
        <p>Synthetic copy loop. Real components; routing, identity, server actions, address provider and artwork/media are stubbed. No production or full-flow acceptance.</p>
        <nav className="flex flex-wrap gap-2">{["notifications", "settings", "preview-login", "phone-help", "radio-copy", "missing"].map((id) => <button key={id} type="button" className="min-h-12 rounded border px-3" aria-pressed={view === id} onClick={() => setView(id)}>{id}</button>)}</nav>
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
      </div>
    </main>
  </SettingsNavProvider></LazyMotion></EnglishMessages>;
}

async function mount() {
  const login = await PreviewLogin({ searchParams: Promise.resolve({}) });
  createRoot(document.getElementById("root")!).render(<Preview login={login} />);
}
void mount();
