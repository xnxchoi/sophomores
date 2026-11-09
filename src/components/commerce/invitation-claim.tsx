"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";
import { CommerceAccountGate } from "./checkout";

/** Fragment-only bearer: strip it before any account interaction; retain only mounted memory. */
export function InvitationClaim({ initialCapabilities }: { initialCapabilities: Readonly<MemberCapabilities> }) {
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
  if (claimed) return <section className="space-y-4"><h2 className="text-xl font-medium">Your guest package is claimed.</h2>
    <p className="text-sm leading-6 text-neutral-300">Your account has four Part I drinks and Part I → Part II transport for this event. Admission and guest-package redemption are separate.</p></section>;
  if (token === undefined) return <p role="status" className="min-h-12 text-sm text-neutral-400">Opening your invitation…</p>;
  if (!token) return <p role="status" className="text-sm leading-6 text-neutral-400">This invitation link is missing or invalid. Ask the buyer for a private claim link.</p>;
  return <div className="space-y-6"><p className="text-sm leading-6 text-neutral-400">Registration is optional for admission. To claim your own guest package, complete your verified account here, then confirm below.</p>
    <p className="text-sm leading-6 text-neutral-400">Use the email code on this page to keep your invitation open. Redirect sign-in and refresh cannot retain this private link; reopen the buyer’s link if you leave.</p>
    <CommerceAccountGate initialCapabilities={initialCapabilities} inlineEmailOnly><ClaimInvitation token={token} onClaimed={() => { setToken(null); setClaimed(true); }} /></CommerceAccountGate>
  </div>;
}

export function ClaimInvitation({ token, onClaimed }: { token: string; onClaimed: () => void }) {
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
    } catch { if (active.current) setMessage("The invitation could not be claimed. It may be expired, already claimed, or your account may already have a package for this event. Contact the buyer if needed."); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  }
  return <section className="space-y-3"><button type="button" disabled={busy} onClick={() => void claim()} className="min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-40">{busy ? "Claiming…" : "Claim my guest package"}</button>
    <p role="status" className="min-h-10 text-sm leading-5 text-neutral-400">{message}</p></section>;
}
