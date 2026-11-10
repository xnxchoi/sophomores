"use client";
import { useTranslations } from "next-intl";
import Link from "next/link";


import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";
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
  if (claimed) return <section className="space-y-4"><h2 className="text-xl font-medium">{t('yourGuestPackageIsClaimed')}</h2>
    <p className="text-sm leading-6 text-neutral-300">{t('yourAccountHasFourPartIDrinksAndPart')}</p>
    <Link href="/" prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-medium text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{t('exploreSophomores')}</Link></section>;
  if (token === undefined) return <p role="status" className="min-h-12 text-sm text-neutral-400">{t('openingYourInvitation')}</p>;
  if (!token) return <p role="status" className="text-sm leading-6 text-neutral-400">{t('thisInvitationLinkIsMissingOrInvalidAskThe')}</p>;
  return <div className="space-y-6"><p className="text-sm leading-6 text-neutral-400">{t('registrationIsOptionalForAdmissionToClaimYourOwn')}</p>
    <p className="text-sm leading-6 text-neutral-400">{t('useTheEmailCodeOnThisPageToKeep')}</p>
    <CommerceAccountGate initialCapabilities={initialCapabilities} inlineEmailOnly><ClaimInvitation token={token} onClaimed={() => { setToken(null); setClaimed(true); }} /></CommerceAccountGate>
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
  return <section className="space-y-3"><button type="button" disabled={busy} onClick={() => void claim()} className="min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-40">{busy ? t('claiming') : t('claimMyGuestPackage')}</button>
    <p role="status" className="min-h-10 text-sm leading-5 text-neutral-400">{message}</p></section>;
}
