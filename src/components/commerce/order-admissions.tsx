"use client";
import { useTranslations } from "next-intl";


import { useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";

const admissionSchema = z.object({ admissionID: z.uuid(), unit: z.int().min(1).max(3), name: z.string().max(100).nullable(),
  status: z.enum(["available", "claimed", "checked-in", "revoked"]), claimed: z.boolean(), reviewRequired: z.boolean() });
const admissionsSchema = z.array(admissionSchema).max(3);
const issuedClaimSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), expiresAt: z.iso.datetime({ offset: true }) });

export function OrderAdmissions({ orderID }: { orderID: string }) {
  const t = useTranslations('Customer.components_commerce_order_admissions');
  const [state, setState] = useState<{ status: "loading" | "error" | "ready"; admissions: z.infer<typeof admissionsSchema> }>({ status: "loading", admissions: [] });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setState({ status: "loading", admissions: [] });
    void fetch("/api/commerce/orders/" + encodeURIComponent(orderID) + "/admissions", { credentials: "include", cache: "no-store", signal: abort.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Admissions unavailable"); return admissionsSchema.parse(await response.json()); })
      .then((admissions) => { if (!abort.signal.aborted) setState({ status: "ready", admissions }); })
      .catch(() => { if (!abort.signal.aborted) setState({ status: "error", admissions: [] }); });
    return () => abort.abort();
  }, [orderID, retry]);
  return <section aria-labelledby="order-admissions-heading" className="space-y-6">
    <div><h2 id="order-admissions-heading" className="text-xl font-medium">{t('guestAdmissions')}</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-400">{t('eachCoinIncludesOneAdmissionAddTheGuestS')}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{t('aGuestWhoCompletesTheirOwnVerifiedRegistrationAnd')}</p>
    </div>
    {state.status === "loading" && <p role="status" className="min-h-12 text-sm text-neutral-400">{t('loadingYourAdmissions')}</p>}
    {state.status === "error" && <div className="space-y-3"><p role="status" className="text-sm text-neutral-400">{t('theseAdmissionsCouldNotBeLoadedCheckThatYou')}</p>
      <button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-12 rounded-xl border border-white/25 px-5 py-3 text-sm">{t('retryAdmissions')}</button></div>}
    {state.status === "ready" && state.admissions.length === 0 && <p role="status" className="text-sm text-neutral-400">{t('noAdmissionsAreAvailableForThisOrder')}</p>}
    {state.status === "ready" && state.admissions.map((admission) => <AdmissionCard key={admission.admissionID} admission={admission} />)}
  </section>;
}

function AdmissionCard({ admission }: { admission: z.infer<typeof admissionSchema> }) {
  const t = useTranslations('Customer.components_commerce_order_admissions');
  const nameID = useId();
  const [name, setName] = useState(admission.name ?? "");
  const [savedName, setSavedName] = useState(admission.name ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [claim, setClaim] = useState<{ url: string; expiresAt: string } | null>(null);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const nameLocked = admission.claimed || admission.status === "claimed" || admission.status === "checked-in" || admission.status === "revoked" || admission.reviewRequired;
  const canInvite = Boolean(savedName.trim()) && !admission.claimed && admission.status !== "claimed" && admission.status !== "revoked" && !admission.reviewRequired;
  async function update(action: "assign-name" | "issue-claim") {
    if (pending.current || busy || action === "assign-name" && nameLocked || action === "issue-claim" && !canInvite) return;
    pending.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/commerce/guest-operations", { method: "POST", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, admissionID: admission.admissionID, ...(action === "assign-name" ? { guestName: name.trim() } : {}) }) });
      if (!response.ok) throw new Error("Operation unavailable");
      const result: unknown = await response.json();
      if (!active.current) return;
      if (action === "assign-name") { z.object({ success: z.literal(true) }).parse(result); setSavedName(name.trim()); setMessage(t('guestNameSaved')); }
      else {
        const issued = issuedClaimSchema.parse(result);
        const link = new URL("/shop/invitations/claim", window.location.origin);
        link.hash = "token=" + issued.token;
        setClaim({ url: link.href, expiresAt: issued.expiresAt });
        setMessage(t('shareThisPrivateLinkOnlyWithTheGuestTaking'));
      }
    } catch { if (active.current) setMessage(t('thisAdmissionCouldNotBeUpdatedItMayHave')); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  }
  return <article className="rounded-2xl border border-white/15 p-5 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-4"><h3 className="font-medium">{t('admissionNumber', { unit: admission.unit })}</h3><span className="text-xs text-neutral-400">{admission.reviewRequired ? t('reviewRequired') : admission.status === "checked-in" ? t('checkedIn') : admission.claimed ? t('claimed') : admission.status === "revoked" ? t('revoked') : t('available')}</span></div>
    <label htmlFor={nameID} className="mb-2 block text-sm text-neutral-300">{t('guestNameForAdmission', { unit: admission.unit })}</label>
    <Input id={nameID} value={name} onChange={(event) => setName(event.target.value)} disabled={busy || nameLocked} maxLength={100} autoComplete="off"
      className="min-h-12 rounded-xl border border-white/20 bg-white/5 px-4 text-base focus-visible:border-white focus-visible:ring-white/20" />
    {!nameLocked && <button type="button" disabled={busy || !name.trim()} onClick={() => void update("assign-name")} className="mt-3 min-h-12 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-40">{t('saveGuestName')}</button>}
    {nameLocked && <p className="mt-3 text-xs leading-5 text-neutral-400">{t('guestNamesCannotBeChangedHereAfterClaimOr')}</p>}
    {canInvite && <button type="button" disabled={busy} onClick={() => void update("issue-claim")} className="mt-4 block min-h-12 rounded-xl border border-white/25 px-5 py-3 text-sm disabled:opacity-40">{t('createPrivateClaimLink')}</button>}
    {claim && <div className="mt-4 space-y-2"><label htmlFor={nameID + "-claim"} className="block text-xs text-neutral-400">{t('privateGuestClaimLink')}</label>
      <Input id={nameID + "-claim"} value={claim.url} readOnly onFocus={(event) => event.target.select()} autoComplete="off"
        className="min-h-12 rounded-xl border border-white/20 px-4 text-sm focus-visible:border-white focus-visible:ring-white/20" />
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(claim.url); if (active.current) setMessage(t('privateLinkCopied')); } catch { if (active.current) setMessage(t('selectAndCopyThePrivateLinkAbove')); } }} className="min-h-12 rounded-xl border border-white/25 px-5 py-3 text-sm">{t('copyPrivateLink')}</button>
      <p className="text-xs text-neutral-500">{t('privateLinkExpiry', { date: new Date(claim.expiresAt).toLocaleString("en-GB", { timeZone: "Asia/Seoul" }) })}</p>
    </div>}
    <p role="status" className="mt-3 min-h-10 text-sm leading-5 text-neutral-400">{busy ? t('saving') : message}</p>
  </article>;
}
