"use client";
import { useTranslations } from "next-intl";


import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motionTokens } from "@/lib/motion-tokens";
import { CopyButton } from "@/components/core/ArcFocus/ArcFocus";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

const walletPassPath = z.string().regex(/^\/api\/commerce\/orders\/[a-f0-9-]{36}\/admissions\/[a-f0-9-]{36}\/wallet-pass\/(ios|android)$/i);
const admissionSchema = z.object({ admissionID: z.uuid(), unit: z.int().min(1).max(3), name: z.string().max(100).nullable(),
  status: z.enum(["available", "claimed", "checked-in", "revoked"]), claimed: z.boolean(), reviewRequired: z.boolean(),
  ticketTier: z.enum(["member", "guest"]).optional(), walletPass: z.enum(["ready", "pending", "unavailable"]).optional(),
  applePassURL: walletPassPath.nullish(), androidPassURL: walletPassPath.nullish() });
const passFailedMarker = "#wallet-pass-unavailable";
const admissionsSchema = z.array(admissionSchema).max(3);
const issuedClaimSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), expiresAt: z.iso.datetime({ offset: true }) });

export function OrderAdmissions({ orderID }: { orderID: string }) {
  const t = useTranslations('Customer.components_commerce_order_admissions');
  const [state, setState] = useState<{ status: "loading" | "error" | "ready"; admissions: z.infer<typeof admissionsSchema> }>({ status: "loading", admissions: [] });
  const [retry, setRetry] = useState(0);
  const [passFailed, setPassFailed] = useState(false);
  useEffect(() => {
    // The pass endpoint sends a failed Wallet pass back here with one fixed marker; show one line and drop the marker.
    if (window.location.hash !== passFailedMarker) return;
    setPassFailed(true);
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setState({ status: "loading", admissions: [] });
    void fetch("/api/commerce/orders/" + encodeURIComponent(orderID) + "/admissions", { credentials: "include", cache: "no-store", signal: abort.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Admissions unavailable"); return admissionsSchema.parse(await response.json()); })
      .then((admissions) => { if (!abort.signal.aborted) setState({ status: "ready", admissions }); })
      .catch(() => { if (!abort.signal.aborted) setState({ status: "error", admissions: [] }); });
    return () => abort.abort();
  }, [orderID, retry]);
  return <section aria-labelledby="order-admissions-heading" className="min-w-0 space-y-6 text-foreground">
    <div className="max-w-prose"><h2 id="order-admissions-heading" className="text-xl font-medium tracking-tight">{t('guestAdmissions')}</h2>
      {state.status === "ready" && state.admissions.some((admission) => !admission.ticketTier) && <>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('purchaseIncludesOneAdmissionAddTheGuest')}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('aGuestWhoCompletesTheirOwnVerifiedRegistrationAnd')}</p>
      </>}
    </div>
    {passFailed && <p role="status" className="flex min-h-12 items-center text-sm text-foreground">{t('walletPassFailed')}</p>}
    {state.status === "loading" && <p role="status" className="flex min-h-12 items-center text-sm text-muted-foreground">{t('loadingYourAdmissions')}</p>}
    {state.status === "error" && <div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6"><p role="status" className="text-sm leading-6 text-muted-foreground">{t('theseAdmissionsCouldNotBeLoadedCheckThatYou')}</p>
      <Button variant="outline" type="button" onClick={() => setRetry((value) => value + 1)} className="h-auto min-h-12 w-full rounded-xl px-5 py-3 text-sm whitespace-normal focus-visible:border-foreground focus-visible:ring-foreground/30 sm:w-auto">{t('retryAdmissions')}</Button></div>}
    {state.status === "ready" && state.admissions.length === 0 && <p role="status" className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground sm:p-6">{t('noAdmissionsAreAvailableForThisOrder')}</p>}
    {state.status === "ready" && <div className="grid min-w-0 gap-4">{state.admissions.map((admission) => <AdmissionCard key={admission.admissionID} admission={admission} />)}</div>}
  </section>;
}

function AdmissionCard({ admission }: { admission: z.infer<typeof admissionSchema> }) {
  const t = useTranslations('Customer.components_commerce_order_admissions');
  const nameID = useId();
  const [name, setName] = useState(admission.name ?? "");
  const [savedName, setSavedName] = useState(admission.name ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [claim, setClaim] = useState<{ url: string; expiresAt: string; revision: number } | null>(null);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const nameLocked = admission.claimed || admission.status === "claimed" || admission.status === "checked-in" || admission.status === "revoked" || admission.reviewRequired;
  const canInvite = !admission.ticketTier && Boolean(savedName.trim()) && !admission.claimed && admission.status !== "claimed" && admission.status !== "revoked" && !admission.reviewRequired;
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
        setClaim((previous) => ({ url: link.href, expiresAt: issued.expiresAt, revision: (previous?.revision ?? 0) + 1 }));
        setMessage(t('shareThisPrivateLinkOnlyWithTheGuestTaking'));
      }
    } catch { if (active.current) setMessage(t('thisAdmissionCouldNotBeUpdatedItMayHave')); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  }
  return <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: (admission.unit - 1) * 0.04 }} className="min-w-0 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-medium tracking-tight">{t('admissionNumber', { unit: admission.unit })}</h3><span className="rounded-full border border-border bg-muted px-3 py-1 text-xs leading-5 text-muted-foreground">{admission.reviewRequired ? t('reviewRequired') : admission.status === "checked-in" ? t('checkedIn') : admission.claimed || admission.status === "claimed" ? t('claimed') : admission.status === "revoked" ? t('revoked') : t('available')}</span></div>
    {admission.ticketTier && <div className="mb-4 space-y-2 text-sm">
      {admission.ticketTier === "guest" && <p>{t('guestTicketShare')}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {admission.applePassURL && <a className="group/focus inline-flex min-h-12 items-center underline" href={admission.applePassURL} referrerPolicy="no-referrer"><FocusShape className="group-focus-visible/focus:outline-current">{t('appleWalletPass')}</FocusShape></a>}
        {admission.androidPassURL && <a className="group/focus inline-flex min-h-12 items-center underline" href={admission.androidPassURL} referrerPolicy="no-referrer"><FocusShape className="group-focus-visible/focus:outline-current">{t('googleWalletPass')}</FocusShape></a>}
        {admission.ticketTier === "guest" && admission.androidPassURL && <ShareGooglePass key={admission.androidPassURL} path={admission.androidPassURL} />}
      </div>
      {!admission.applePassURL && !admission.androidPassURL && <p>{t(admission.walletPass === "pending" ? 'walletPassPending' : 'walletPassUnavailable')}</p>}
      {admission.ticketTier === "guest" && (admission.applePassURL || admission.androidPassURL) && <p>{t('forwardGuestQR')}</p>}
    </div>}
    {!admission.ticketTier && <>
    <label htmlFor={nameID} className="mb-2 block text-sm font-medium">{t('guestNameForAdmission', { unit: admission.unit })}</label>
    <Input id={nameID} value={name} onChange={(event) => setName(event.target.value)} disabled={busy || nameLocked} maxLength={100} autoComplete="off"
      className="min-h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground shadow-none selection:bg-foreground selection:text-background focus-visible:border-foreground md:text-base dark:bg-background" />
    {nameLocked && <p className="mt-3 text-xs leading-5 text-muted-foreground">{t('guestNamesCannotBeChangedHereAfterClaimOr')}</p>}
    {(!nameLocked || canInvite) && <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {!nameLocked && <Button type="button" disabled={busy || !name.trim()} onClick={() => void update("assign-name")} className="h-auto min-h-12 rounded-xl bg-foreground px-5 py-3 text-sm whitespace-normal text-background hover:bg-foreground/90 focus-visible:border-foreground focus-visible:ring-foreground/30">{t('saveGuestName')}</Button>}
      {canInvite && <Button variant="outline" type="button" disabled={busy} onClick={() => void update("issue-claim")} className="h-auto min-h-12 rounded-xl px-5 py-3 text-sm whitespace-normal focus-visible:border-foreground focus-visible:ring-foreground/30 sm:col-start-2">{t('createPrivateClaimLink')}</Button>}
    </div>}
    <p role="status" aria-atomic="true" className="mt-3 min-h-10 text-sm leading-5 text-muted-foreground">{busy ? t('saving') : message}</p>
    {claim && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }} className="overflow-hidden">
      <div className="mt-3 min-w-0 space-y-3 border-t border-border p-1 pt-5"><label htmlFor={nameID + "-claim"} className="block text-sm font-medium">{t('privateGuestClaimLink')}</label>
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <Input id={nameID + "-claim"} value={claim.url} readOnly aria-describedby={nameID + "-claim-copy"} onFocus={(event) => event.target.select()} autoComplete="off"
        className="min-h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground shadow-none selection:bg-foreground selection:text-background focus-visible:border-foreground md:text-base dark:bg-background" />
      <CopyButton key={claim.revision} value={claim.url} label={t('copyPrivateLink')} disabled={busy} className="min-h-12!" />
      </div>
      <p id={nameID + "-claim-copy"} className="text-xs leading-5 text-muted-foreground">{t('selectAndCopyThePrivateLinkAbove')}</p>
      <p className="text-xs leading-5 text-muted-foreground">{t('privateLinkExpiry', { date: new Date(claim.expiresAt).toLocaleString("en-GB", { timeZone: "Asia/Seoul" }) })}</p>
    </div></motion.div>}
    </>}
  </motion.article>;
}


function ShareGooglePass({ path }: { path: string }) {
  const t = useTranslations("Customer.components_commerce_order_admissions");
  const [state, setState] = useState<{ status: "idle" | "loading" | "error" } | { status: "ready"; url: string }>({ status: "idle" });
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function load() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: "loading" });
    try {
      const response = await fetch(path, { credentials: "same-origin", cache: "no-store", redirect: "error",
        headers: { Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) throw new Error("Wallet pass unavailable");
      const { passObjectUrl } = z.object({ passObjectUrl: z.url({ protocol: /^https$/, hostname: /^pay\.google\.com$/ }) }).parse(await response.json());
      if (!controller.signal.aborted) setState({ status: "ready", url: passObjectUrl });
    } catch {
      if (!controller.signal.aborted) setState({ status: "error" });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }
  return state.status === "ready"
    ? <CopyButton value={state.url} label={t("copyGoogleWalletPass")} className="min-h-12!" />
    : <>
      <Button type="button" variant="outline" onClick={() => void load()} disabled={state.status === "loading"} className="min-h-12">
        {t(state.status === "loading" ? "gettingGoogleWalletPass" : "getGoogleWalletPass")}
      </Button>
      {state.status === "error" && <p role="status">{t("googleWalletPassFailed")}</p>}
    </>;
}
