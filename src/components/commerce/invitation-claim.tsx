"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";


import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";
import { motionTokens } from "@/lib/motion-tokens";
import { CommerceAccountGate } from "./checkout";

/** Fragment-only bearer: strip it before any account interaction; retain only mounted memory. */
export function InvitationClaim({ initialCapabilities }: { initialCapabilities: Readonly<MemberCapabilities> }) {
  const t = useTranslations('Customer.components_commerce_invitation_claim');
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [claimed, setClaimed] = useState(false);
  const read = useRef(false);
  useEffect(() => {
    if (read.current) return;
    read.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const value = fragment.get("token");
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    setToken(fragment.size === 1 && value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null);
  }, []);
  if (claimed) return <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }} className="space-y-5 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"><h2 className="text-xl font-medium tracking-tight">{t('yourGuestPackageIsClaimed')}</h2>
    <p className="max-w-prose text-sm leading-6 text-muted-foreground" role="status">{t('yourAccountHasFourPartIDrinksAndPart')}</p>
    <Link href="/" prefetch={false} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-foreground px-5 py-3 text-center text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground sm:w-auto">{t('exploreSophomores')}</Link></motion.section>;
  if (token === undefined) return <p role="status" className="flex min-h-12 items-center gap-3 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin" />{t('openingYourInvitation')}</p>;
  if (!token) return <p role="status" className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground sm:p-6">{t('thisInvitationLinkIsMissingOrInvalidAskThe')}</p>;
  return <div className="min-w-0 space-y-6 text-foreground"><p className="max-w-prose text-sm leading-6 text-muted-foreground">{t('registrationIsOptionalForAdmissionToClaimYourOwn')}</p>
    <CommerceAccountGate initialCapabilities={initialCapabilities} inlineEmailOnly noAccountMessage={t('noAccountSignUpReturn')} accountIntroduction={
      <div className="mb-6 space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
        <p className="max-w-prose text-sm leading-6 text-muted-foreground">{t('existingAccountSignIn')}</p>
        <p className="max-w-prose text-sm leading-6 text-muted-foreground">{t('socialSignUpReturn')}</p>
        <Link href="/account" prefetch={false} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-center text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground sm:w-auto">{t('openAccountOptions')}</Link>
      </div>
    }><ClaimInvitation token={token} onClaimed={() => { setToken(null); setClaimed(true); }} /></CommerceAccountGate>
  </div>;
}

export function ClaimInvitation({ token, onClaimed }: { token: string; onClaimed: () => void }) {
  const t = useTranslations('Customer.components_commerce_invitation_claim');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function claim() {
    if (pending.current || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
    pending.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/commerce/guest-operations", { method: "POST", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "claim", token }) });
      if (!response.ok) throw new Error("Claim unavailable");
      z.object({ admissionID: z.uuid() }).parse(await response.json());
      if (active.current) onClaimed();
    } catch { if (active.current) setMessage(t('theInvitationCouldNotBeClaimedItMayBe')); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  }
  return <section className="min-w-0 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"><Button type="button" disabled={busy} aria-busy={busy} onClick={() => void claim()} className="relative h-auto min-h-12 w-full rounded-xl bg-foreground px-10 py-3 text-sm whitespace-normal text-background hover:bg-foreground/90 focus-visible:border-foreground focus-visible:ring-foreground/30">{busy && <LoaderCircle aria-hidden="true" className="absolute left-4 size-4 animate-spin" />}<span>{busy ? t('claiming') : t('claimMyGuestPackage')}</span></Button>
    <p role="status" aria-atomic="true" className="mt-3 min-h-10 text-sm leading-5 text-muted-foreground">{message}</p></section>;
}
