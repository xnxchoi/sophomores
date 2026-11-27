"use client";

import { useTranslations } from "next-intl";

import { useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type Ref, type RefObject } from "react";
import {
  createMemberClient,
  MemberAuthActionError,
  type MemberClient
} from "../../../lib/member-auth/client";
import { BrandMark } from "@/components/core/BrandMark";
import { cn } from "../../../lib/utils";
import { subscribeVisibility } from "@/utils/browser/visibility";
import { normalizeLoginEmail } from "../../../lib/passwordless-login";
import type { MemberCapabilities } from "../../../lib/member-auth/contracts";
import {
  VerificationTray,
  VerificationTrayTitle
} from "../phone-verification/verification-tray";
import {
  Description,
  Heading,
  Panel,
  PrimaryButton,
  SecondaryButton
} from "../phone-verification/verification-ui";
import { MemberAccountView, useSignUpProvidersNote, type MemberAccountViewProps } from "./account-view";
import { PageFrame } from "@/components/commerce/page-frame";
import { AccountRecoveryView } from "./account-recovery-view";
import { MemberPhoneStep } from "./phone-step";
import {
  createMemberSession,
  emptyMemberSnapshot,
  type MemberSession,
  type MemberSnapshot
} from "./_shared/session";
import { Link } from "@/components/core/Link/Link";
import { ArcRoles } from "@/components/commerce/arc-roles";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { ChevronLeft } from "lucide-react";

const noSubscription = () => () => {};
/**
 * A failed provider sign-in returns to /account with ?error=…. Opening log in shows
 * why it failed beside every way to sign in, instead of a silent chooser. The server
 * snapshot is null, so hydration matches whatever the page itself rendered.
 */
function useProviderReturnFlow(): "login" | undefined {
  return useSyncExternalStore(
    noSubscription,
    () => (new URLSearchParams(window.location.search).has("error") ? "login" : undefined),
    () => undefined
  );
}

/** Standalone account/callback entry; contextual callers host MemberAccountDialog. */
export function MemberAccountStudy({
  client,
  initialFlow,
  initialCapabilities,
  completionAction,
  authenticatedAction
}: {
  client?: MemberClient;
  initialFlow?: "login" | "signup";
  initialCapabilities?: Readonly<MemberCapabilities>;
  completionAction?: ReactNode;
  authenticatedAction?: ReactNode;
} = {}) {
  const t = useTranslations("MemberAuth");
  const [open, setOpen] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const providerReturnFlow = useProviderReturnFlow();
  return (
    <main className="min-h-screen bg-transparent px-6 py-8 text-foreground">
      <BrandMark asChild>
        {/* Plain anchor: this study renders in node tests, where next/link touches `self`. */}
        <Link href="/" className="text-[23px] tracking-[-1.4px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
          sophomores
        </Link>
      </BrandMark>
      <SecondaryButton ref={trigger} type="button" className="mt-8 max-w-xs" onClick={() => setOpen(true)}>
        {t("openAccountOptions")}
      </SecondaryButton>
      <MemberAccountDialog open={open} onOpenChange={setOpen} returnFocusRef={trigger}
        client={client} initialFlow={initialFlow ?? providerReturnFlow} initialCapabilities={initialCapabilities} completionAction={completionAction} authenticatedAction={authenticatedAction} />
    </main>
  );
}

/** Caller-owned surface: closing disposes private flow, not the caller or Vaul root. */
export function MemberAccountDialog({
  open, onOpenChange, returnFocusRef, client, initialFlow, initialCapabilities, completionAction, authenticatedAction, onSnapshot
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  client?: MemberClient;
  initialFlow?: "login" | "signup";
  initialCapabilities?: Readonly<MemberCapabilities>;
  completionAction?: ReactNode;
  authenticatedAction?: ReactNode;
  /** Every session snapshot of the open flow (an in-place sheet closes once the member is confirmed). */
  onSnapshot?: (snapshot: MemberSnapshot) => void;
}) {
  const t = useTranslations("MemberAuth");
  const [entry, setEntry] = useState<{ open: boolean; choice: "chooser" | "login" | "signup" | null }>({ open, choice: null });
  if (entry.open !== open) {
    setEntry({ open, choice: null });
  }
  const flow = useRef<{ requestCancel: () => void } | null>(null);
  const step = entry.choice ?? initialFlow ?? "chooser";
  const login = useRef<HTMLButtonElement>(null);
  const signup = useRef<HTMLButtonElement>(null);
  const lastChoice = useRef<"login" | "signup" | null>(initialFlow ?? null);
  const id = useId();
  const headingId = `${id}-${step}`;
  useEffect(() => {
    if (!open) {
      lastChoice.current = initialFlow ?? null;
    }
  }, [open, initialFlow]);
  useEffect(() => {
    if (!open || step !== "chooser") return;
    const choice =
      step === "chooser" && lastChoice.current
        ? lastChoice.current === "login"
          ? login.current
          : signup.current
        : document.getElementById(headingId);
    choice?.focus({ preventScroll: true });
  }, [open, step, headingId]);
  function choose(next: "login" | "signup") {
    lastChoice.current = next;
    setEntry({ open, choice: next });
  }
  return (
      <VerificationTray
        open={open}
        chrome="compact"
        onOpenChange={onOpenChange}
        returnFocusRef={returnFocusRef}
        mode={step === "chooser" ? "chooser" : "focused"}
        onCancel={() => flow.current?.requestCancel()}
        cancelLabel={t("cancel")}
        headingId={headingId}
        descriptionId={`${id}-description`}
        locale="en"
        description={
          step === "chooser"
            ? t("chooseLogInOrSignUpToContinue")
            : t("completeYourAccountStepOrCancelToGoBack")
        }
        closeLabel={t("closeAccountOptions")}
        header={step === "chooser" ? (
          <div data-member-account-intro="" className="flex w-full flex-col items-center gap-2">
            <VerificationTrayTitle>
              <Heading id={headingId} tabIndex={-1} className="m-0! w-full px-10 text-center! text-[24px]! leading-[30px]! font-medium! tracking-[-0.025em]!">
                {t("welcome")}
              </Heading>
            </VerificationTrayTitle>
            <Description className="m-0! w-full max-w-none text-center text-[14px] leading-5">
              {t("logInOrCreateAnAccount")}
            </Description>
          </div>
        ) : undefined}
      >
        {open &&
          (step === "chooser" ? (
            <Panel data-member-account-chooser="" className="px-6! pt-6! pb-8! [font-family:system-ui]">
              <PrimaryButton
                ref={login}
                type="button"
                className="mt-0! h-12 min-h-12 justify-center px-5 py-0 text-center text-[15px] leading-5 font-medium"
                onClick={() => choose("login")}
              >
                {t("logIn")}
              </PrimaryButton>
              <SecondaryButton
                ref={signup}
                type="button"
                className="mt-3 mb-0 h-12 min-h-12 justify-center px-5 py-0 text-center text-[15px] leading-5 font-medium"
                onClick={() => choose("signup")}
              >
                {t("signUp")}
              </SecondaryButton>
            </Panel>
          ) : (
            <MemberAccountFlow
              key={step}
              ref={flow}
              client={client}
              initialCapabilities={initialCapabilities}
              headingId={headingId}
              flow={step}
              completionAction={completionAction}
              authenticatedAction={authenticatedAction}
              onSnapshot={onSnapshot}
              onChooser={() => {
                setEntry({ open, choice: "chooser" });
              }}
              onExit={() => onOpenChange(false)}
            />
          ))}
      </VerificationTray>
  );
}

/**
 * The account and sign-in pages (owner, 24 Nov: a signed-out /account redirects to /sign-in, no modal; "OBVIOUSLY it
 * should be the normal page" signed in). The sheet's chooser and flow, laid out on the page. With `next` (the sign-in
 * page) social sign-in returns to the page (pinned server-side) and a confirmed member leaves for `next`; an account
 * still in setup finishes it here first. The sheet (MemberAccountDialog) stays for buttons that open it in place.
 */
export function MemberAccountPage({
  next,
  client,
  initialFlow,
  initialCapabilities,
  completionAction,
  authenticatedAction,
  signedIn: serverSignedIn = false,
  navigate = (url) => window.location.replace(url)
}: {
  /** The server read a session for this request: until a status read says otherwise, this is the account. */
  signedIn?: boolean;
  /** The sign-in page's validated return; absent on the account page itself. */
  next?: string;
  client?: MemberClient;
  /** "login" for a signed-in account (and one still in setup); the chooser otherwise. */
  initialFlow?: "login" | "signup";
  initialCapabilities?: Readonly<MemberCapabilities>;
  completionAction?: ReactNode;
  authenticatedAction?: ReactNode;
  /** A full navigation, so the next page renders on the server for the signed-in member. */
  navigate?: (url: string) => void;
}) {
  const t = useTranslations("MemberAuth");
  const providerReturnFlow = useProviderReturnFlow();
  const [choice, setChoice] = useState<"chooser" | "login" | "signup" | null>(null);
  const step = choice ?? initialFlow ?? providerReturnFlow ?? "chooser";
  const resolvedClient = useMemo(() => client ?? (next === undefined ? createMemberClient() : createMemberClient(undefined, undefined, "sign-in", next)), [client, next]);
  const id = useId();
  const headingId = `${id}-${step}`;
  const login = useRef<HTMLButtonElement>(null);
  const signup = useRef<HTMLButtonElement>(null);
  const lastChoice = useRef<"login" | "signup" | null>(null);
  const left = useRef(false);
  const flow = useRef<{ requestCancel: () => void } | null>(null);
  const [signedIn, setSignedIn] = useState(serverSignedIn);
  useEffect(() => {
    // Back from a flow, focus returns to the choice that opened it.
    if (step === "chooser" && lastChoice.current) (lastChoice.current === "login" ? login : signup).current?.focus({ preventScroll: true });
  }, [step]);
  function choose(flow: "login" | "signup") {
    lastChoice.current = flow;
    setChoice(flow);
  }
  function leaveWhenMember(snapshot: MemberSnapshot) {
    // A failed or pending status read keeps what the server knew; only a status read can end the session here.
    const known = snapshot.status ? snapshot.status.authenticated : serverSignedIn;
    if (known !== signedIn) setSignedIn(known);
    if (next === undefined || left.current || !snapshot.status?.member) return;
    left.current = true;
    navigate(next);
  }
  return (
    <main data-member-account-page="" className="mx-auto w-full max-w-md px-6 pt-10 pb-16 text-foreground">
      <ArcRoles>
        {step === "chooser" ? (
          <section data-member-account-chooser="" aria-labelledby={headingId} className="[font-family:system-ui]">
            <Heading id={headingId} tabIndex={-1} className="mt-0 mb-2 text-[24px] leading-[30px] font-medium tracking-[-0.025em]">
              {t("welcome")}
            </Heading>
            <Description className="mb-6 text-[14px] leading-5">{t("logInOrCreateAnAccount")}</Description>
            <PrimaryButton ref={login} type="button" className="mt-0! h-12 min-h-12 justify-center px-5 py-0 text-center text-[15px] leading-5 font-medium" onClick={() => choose("login")}>
              {t("logIn")}
            </PrimaryButton>
            <SecondaryButton ref={signup} type="button" className="mt-3 mb-0 h-12 min-h-12 justify-center px-5 py-0 text-center text-[15px] leading-5 font-medium" onClick={() => choose("signup")}>
              {t("signUp")}
            </SecondaryButton>
          </section>
        ) : (
          <>
            {/* Back to the chooser, on the left (the sheet's Cancel); signed in, there is nothing to go back to. */}
            {!signedIn && (
              <button type="button" onClick={() => flow.current?.requestCancel()} className="group/focus -ml-1 mb-4 inline-flex min-h-11 items-center gap-1 px-1 text-[14px] leading-5 text-muted-foreground transition-colors duration-150 hover:text-foreground">
                <FocusShape className="inline-flex items-center gap-1 group-focus-visible/focus:outline-current">
                  <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
                  {t("cancel")}
                </FocusShape>
              </button>
            )}
          <MemberAccountFlow
            key={step}
            ref={flow}
            client={resolvedClient}
            initialCapabilities={initialCapabilities}
            headingId={headingId}
            flow={step}
            completionAction={completionAction}
            authenticatedAction={authenticatedAction}
            signedIn={serverSignedIn}
            onSnapshot={leaveWhenMember}
            onChooser={() => setChoice("chooser")}
            onExit={() => setChoice("chooser")}
          />
          </>
        )}
      </ArcRoles>
    </main>
  );
}

/**
 * The sign-in page (owner, 26 Nov: "just make it not shitty"; the Vault login is his reference for the form). Every
 * way in is on the page at once: the email code for members, Apple and Google (Kakao when on) for everyone. Sign-up is
 * social only, so there is no chooser step. It sits in the site's page frame, the one /me and the shop's pages use
 * (owner, 26 Nov: "the layout is just fucking ugly"): the display title over its rule with the new-visitor note in the
 * left column, the form in the right; stacked on a phone. The frame is at least the viewport's height, so the footer
 * never jumps while the form changes size. The form uses the site's sans throughout. The mechanism is
 * MemberAccountFlow's login flow, unchanged; only its layout differs ("page" presentation). An account still in setup
 * finishes it here, and a confirmed member leaves for `next`.
 */
export function MemberSignInPage({
  next,
  client,
  initialCapabilities,
  navigate = (url) => window.location.replace(url)
}: {
  next: string;
  client?: MemberClient;
  initialCapabilities?: Readonly<MemberCapabilities>;
  navigate?: (url: string) => void;
}) {
  const t = useTranslations("MemberAuth");
  const headingId = useId();
  const resolvedClient = useMemo(() => client ?? createMemberClient(undefined, undefined, "sign-in", next), [client, next]);
  // Back to a fresh form is the page's "start again" (the sheet's chooser and Cancel have no place here).
  const [generation, setGeneration] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  // The providers the flow itself offers: the server's list first, then the live status's (Apple can fail to start).
  const [capabilities, setCapabilities] = useState(initialCapabilities);
  const note = useSignUpProvidersNote(capabilities);
  // The page's one heading follows the step: Sign in, Account recovery, or the setup step's own title.
  const [title, setTitle] = useState<string>(() => t("logIn"));
  const left = useRef(false);
  function onSnapshot(snapshot: MemberSnapshot) {
    if (Boolean(snapshot.status?.authenticated) !== signedIn) setSignedIn(Boolean(snapshot.status?.authenticated));
    // By the providers' flags, not the object: every status read is a new object, and re-setting it would loop.
    const live = snapshot.status?.capabilities;
    if (live && (["apple", "google", "kakao"] as const).some((provider) => Boolean(live[provider]) !== Boolean(capabilities?.[provider]))) setCapabilities(live);
    if (left.current || !snapshot.status?.member) return;
    left.current = true;
    navigate(next);
  }
  return (
    // The note is for the entry step only: recovery and an account finishing setup are past choosing how to get in.
    <PageFrame title={title} introduction={signedIn || title !== t("logIn") ? undefined : note} displayTitle className="min-h-svh">
      {/* One typeface for the whole form: the shared panel's Manrope (loaded at 400 only) and the phase views'
          system-ui give way to the site's sans on this page; the sheet keeps its own. An intro that holds only the
          hidden focus target (the entry step) drops its margin, so the field lines up with the title; the code step's
          intro keeps it under its help text. */}
      <div data-member-sign-in-page="" className="w-full max-w-[400px] **:font-sans! [&_[data-phase-intro]:has(>:only-child_[data-phase-focus])]:mb-0">
        <ArcRoles>
          <MemberAccountFlow
            key={generation}
            client={resolvedClient}
            initialCapabilities={initialCapabilities}
            headingId={headingId}
            flow="login"
            presentation="page"
            onSnapshot={onSnapshot}
            onTitle={setTitle}
            onChooser={() => setGeneration((value) => value + 1)}
            onExit={() => setGeneration((value) => value + 1)}
          />
        </ArcRoles>
      </div>
    </PageFrame>
  );
}

export function MemberAccountFlow({
  ref,
  client,
  initialCapabilities,
  headingId,
  flow,
  completionAction,
  authenticatedAction,
  presentation,
  noAccountMessage,
  signedIn,
  onSnapshot,
  onVerifiedFocus,
  onTitle,
  onChooser = () => {},
  onExit = () => {}
}: {
  /** The server read a session for this request: a failed or pending status read shows the account, not sign-in. */
  signedIn?: boolean;
  ref?: Ref<{ requestCancel: () => void }>;
  client?: MemberClient;
  initialCapabilities?: Readonly<MemberCapabilities>;
  headingId: string;
  flow: "login" | "signup";
  completionAction?: ReactNode;
  authenticatedAction?: ReactNode;
  presentation?: "ticket-checkout" | "page";
  noAccountMessage?: string;
  onSnapshot?: (snapshot: MemberSnapshot) => void;
  onVerifiedFocus?: () => void;
  /** The current step's title, for a page that shows it as its own heading ("page" presentation). */
  onTitle?: (title: string) => void;
  onChooser?: () => void;
  onExit?: () => void;
}) {
  const t = useTranslations("MemberAuth");
  const [snapshot, setSnapshot] = useState(emptyMemberSnapshot);
  const [registrationRequested, setRegistrationRequested] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [phoneRecovery, setPhoneRecovery] = useState(false);
  const [reauthenticating, setReauthenticating] = useState(false);
  const [proofResetKey, setProofResetKey] = useState(0);
  const [phoneProofResetFocus, setPhoneProofResetFocus] = useState(true);
  const phoneContext = useRef(false);
  const reauthPending = useRef(false);
  const restorePhoneFocus = useRef(false);
  const [statusRefresh, setStatusRefresh] = useState<{ client: MemberClient | undefined; pending: boolean }>({ client, pending: false });
  if (statusRefresh.client !== client) setStatusRefresh({ client, pending: false });
  const refreshingStatus = statusRefresh.client === client && statusRefresh.pending;
  const [identifierMode, setIdentifierMode] = useState<"email" | "phone">(
    "email"
  );
  const [email, setEmail] = useState("");
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const session = useRef<MemberSession | null>(null);
  // The account page passes no client: the session and the email lookup share one same-origin client.
  const resolvedClient = useMemo(() => client ?? createMemberClient(), [client]);
  const normalizedEmail = normalizeLoginEmail(email)?.toLowerCase() ?? null;
  const [emailEntry, setEmailEntry] = useState<MemberAccountViewProps["emailEntry"]>();
  const lookupRequest = useRef<AbortController | null>(null);
  const [lookupBlockedUntil, setLookupBlockedUntil] = useState(0);
  const [timerNow, setTimerNow] = useState(Date.now);
  const [visible, setVisible] = useState(true);
  const resendDeadline = session.current?.resendAvailableAtFor(email) ?? snapshot.resendAvailableAt;
  const resendRemaining = resendDeadline
    ? Math.max(0, Math.ceil((resendDeadline - timerNow) / 1000))
    : 0;
  const verificationRemaining = snapshot.verificationAvailableAt
    ? Math.max(
        0,
        Math.ceil((snapshot.verificationAvailableAt - timerNow) / 1000)
      )
    : 0;
  if (snapshot.status?.authenticated && snapshot.status.emailVerified && !snapshot.status.member && (flow === "signup" || registrationRequested)) phoneContext.current = true;
  useImperativeHandle(ref, () => ({
    requestCancel() {
      if (session.current?.snapshot().status?.authenticated) onExit();
      else onChooser();
    }
  }), [onChooser, onExit]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Math.max(
      snapshot.resendAvailableAt ?? 0,
      snapshot.verificationAvailableAt ?? 0
    );
    const update = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      const isVisible = document.visibilityState !== "hidden";
      setVisible(isVisible);
      const now = Date.now();
      const remaining = deadline
        ? Math.max(0, Math.ceil((deadline - now) / 1000))
        : 0;
      setTimerNow(now);
      if (remaining > 0 && isVisible) timer = setTimeout(update, 1000);
    };
    update();
    const unsubscribe = subscribeVisibility(update);
    return () => {
      unsubscribe();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [snapshot.resendAvailableAt, snapshot.verificationAvailableAt]);
  useEffect(() => {
    const current = createMemberSession(
      resolvedClient,
      (next) => {
        setTimerNow(Date.now());
        setSnapshot(next);
        if (!next.status?.authenticated && !phoneContext.current) setRegistrationRequested(false);
        if (phoneContext.current && (next.failure === "fresh-auth-required" || next.failure === "unauthenticated" || (next.status && next.status.phoneBindingAuth !== "ready"))) setPhoneRecovery(true);
        if (next.status?.authenticated) setOtp("");
      }
    );
    session.current = current;
    const callbackError = new URLSearchParams(window.location.search).get(
      "error"
    );
    void current.initialize(
      callbackError && callbackError.length > 128 ? "unknown" : callbackError
    );
    return () => {
      current.dispose();
      session.current = null;
    };
  }, [resolvedClient]);
  useEffect(() => { onSnapshot?.(snapshot); }, [onSnapshot, snapshot]);
  useEffect(() => {
    if (presentation !== "ticket-checkout") return;
    const refresh = () => { if (document.visibilityState !== "hidden") void session.current?.refresh(); };
    window.addEventListener("focus", refresh);
    const unsubscribe = subscribeVisibility(refresh);
    return () => { window.removeEventListener("focus", refresh); unsubscribe(); };
  }, [presentation]);
  useEffect(() => () => {
    lookupRequest.current?.abort();
    lookupRequest.current = null;
  }, [client, presentation, normalizedEmail, snapshot.status?.authenticated, snapshot.codeRequested]);
  useEffect(() => {
    if (lookupBlockedUntil <= Date.now()) return;
    const timer = window.setTimeout(() => setLookupBlockedUntil(0), lookupBlockedUntil - Date.now());
    return () => window.clearTimeout(timer);
  }, [lookupBlockedUntil]);
  async function checkEmailEntry() {
    // The purchase step and standalone log in both look an email up before any code is offered.
    if ((presentation !== "ticket-checkout" && (flow !== "login" || reauthenticating)) || !snapshot.status || snapshot.status.authenticated || snapshot.codeRequested || snapshot.busy || lookupRequest.current) return;
    if (!normalizedEmail) { setInvalidEmail(true); return; }
    setInvalidEmail(false);
    if (lookupBlockedUntil > Date.now()) {
      setEmailEntry({ email: normalizedEmail, state: "error", retryAt: lookupBlockedUntil });
      return;
    }
    const controller = new AbortController();
    lookupRequest.current = controller;
    setEmailEntry({ email: normalizedEmail, state: "pending" });
    try {
      if (!resolvedClient.lookupEmail) throw new Error("Email lookup unavailable");
      const result = await resolvedClient.lookupEmail(normalizedEmail, { signal: controller.signal });
      if (result.account !== "existing" && result.account !== "new") throw new Error("Invalid email lookup");
      if (!controller.signal.aborted && lookupRequest.current === controller) setEmailEntry({ email: normalizedEmail, state: result.account });
    } catch (error) {
      if (controller.signal.aborted || lookupRequest.current !== controller) return;
      if (error instanceof MemberAuthActionError && error.kind === "rate-limited") {
        const retry = error.retryAfterSeconds;
        const deadline = Date.now() + (typeof retry === "number" && Number.isFinite(retry) && retry > 0 ? Math.min(Math.ceil(retry), 86400) : 60) * 1000;
        setLookupBlockedUntil(deadline);
        setEmailEntry({ email: normalizedEmail, state: "error", retryAt: deadline });
      } else setEmailEntry({ email: normalizedEmail, state: "error" });
    } finally {
      if (lookupRequest.current === controller) lookupRequest.current = null;
    }
  }
  useLayoutEffect(() => {
    if (reauthenticating || !restorePhoneFocus.current) return;
    restorePhoneFocus.current = false;
    document.getElementById(headingId)?.closest("[data-member-account-flow]")?.querySelector<HTMLElement>("#member-phone-heading")?.focus({ preventScroll: true });
  }, [reauthenticating, proofResetKey, headingId]);
  async function reauthenticate(action: (current: MemberSession) => Promise<void>) {
    const current = session.current;
    if (!current || current.snapshot().busy || reauthPending.current) return;
    const previousStatus = current.snapshot().status;
    reauthPending.current = true;
    try {
      await action(current);
      const result = current.snapshot();
      if (session.current !== current || result.failure || result.error || result.status === previousStatus || !result.status?.authenticated || !result.status.emailVerified || result.status.phoneBindingAuth !== "ready") return;
      restorePhoneFocus.current = Boolean(document.getElementById(headingId)?.closest("[data-member-registration-reauth]")?.contains(document.activeElement));
      setPhoneProofResetFocus(restorePhoneFocus.current);
      setProofResetKey(value => value + 1);
      setPhoneRecovery(false);
      setReauthenticating(false);
    } finally { reauthPending.current = false; }
  }
  function verifyCode(value: string) {
    const current = session.current;
    if (
      !current ||
      current.snapshot().busy ||
      !current.snapshot().codeRequested ||
      value.length !== 6 ||
      !/^[A-Z0-9]{6}$/.test(value)
    )
      return;
    return reauthenticating ? reauthenticate(active => active.verifyCode(email, value)) : current.verifyCode(email, value);
  }
  async function clearIdentifier() {
    const current = session.current;
    await current?.clearIdentifier();
    if (
      current &&
      session.current === current &&
      !current.snapshot().error &&
      !current.snapshot().phoneIdentified
    ) {
      setIdentifierMode("email");
      setOtp("");
    }
  }
  async function signOut() {
    const current = session.current;
    await current?.signOut();
    if (
      current &&
      session.current === current &&
      !current.snapshot().error &&
      current.snapshot().status?.authenticated === false
    ) {
      setEmail("");
      setPhone("");
      setOtp("");
      setInvalidEmail(false);
      setIdentifierMode("email");
      setRegistrationRequested(false);
      phoneContext.current = false;
      setPhoneRecovery(false);
      setReauthenticating(false);
    }
  }
  if (recovering && !snapshot.status?.authenticated) {
    return (
      <AccountRecoveryView
        headingId={headingId}
        presentation={presentation === "page" ? "page" : undefined}
        onTitle={onTitle}
        onBack={() => setRecovering(false)}
      />
    );
  }
  return (
    <MemberAccountView
      presentation={presentation}
      onTitle={onTitle}
      noAccountMessage={noAccountMessage}
      signedIn={signedIn}
      emailEntry={emailEntry?.email === normalizedEmail ? emailEntry : undefined}
      onLookupRetry={() => { void checkEmailEntry(); }}
      onVerifiedFocus={onVerifiedFocus}
      initialCapabilities={initialCapabilities}
      authenticatedAction={authenticatedAction}
      headingId={headingId}
      flow={flow}
      registrationRequested={registrationRequested}
      registrationContext={phoneContext.current}
      reauthenticating={reauthenticating}
      onContinueRegistration={() => {
        if (
          snapshot.status?.authenticated &&
          snapshot.status.emailVerified &&
          !snapshot.status.member
        )
          setRegistrationRequested(true);
      }}
      snapshot={snapshot}
      refreshingStatus={refreshingStatus}
      completionAction={completionAction}
      identifierMode={identifierMode}
      email={email}
      invalidEmail={invalidEmail}
      phone={phone}
      otp={otp}
      resendRemaining={resendRemaining}
      verificationRemaining={verificationRemaining}
      visible={visible}
      onRecover={() => {
        if (!snapshot.busy && !snapshot.status?.authenticated) setRecovering(true);
      }}
      onMode={(mode) => {
        setInvalidEmail(false);
        setIdentifierMode(mode);
      }}
      onEmail={(value) => {
        lookupRequest.current?.abort();
        lookupRequest.current = null;
        setEmailEntry(undefined);
        setInvalidEmail(false);
        setEmail(value);
        setOtp("");
      }}
      onPhone={setPhone}
      onOtp={setOtp}
      onPasskey={() => {
        setInvalidEmail(false);
        if (reauthenticating) void reauthenticate(current => current.signInPasskey());
        else void session.current?.signInPasskey();
      }}
      onSocial={(provider) => {
        setInvalidEmail(false);
        // OAuth initiation is not authentication completion; the callback owns it.
        void session.current?.signInSocial(provider);
      }}
      onCode={() => {
        // An email code signs in a registered member only; it is never offered for an unknown email.
        if (!reauthenticating && (presentation === "ticket-checkout" || flow === "login") && (!normalizedEmail || emailEntry?.email !== normalizedEmail || emailEntry.state !== "existing")) return;
        const normalized = presentation === "ticket-checkout" ? normalizedEmail : normalizeLoginEmail(email);
        if (!normalized) {
          setInvalidEmail(true);
          return;
        }
        setInvalidEmail(false);
        setEmail(normalized);
        const current = session.current;
        if (!current) return;
        const previousDelivery = current.snapshot().resendAvailableAt;
        void current.sendCode(normalized).then(() => {
          const result = current.snapshot();
          if (
            session.current === current &&
            !result.error &&
            result.codeRequested &&
            result.resendAvailableAt !== previousDelivery
          )
            setOtp("");
        });
      }}
      onLink={() => {
        const normalized = normalizeLoginEmail(email);
        if (!normalized) {
          setInvalidEmail(true);
          return;
        }
        setInvalidEmail(false);
        setEmail(normalized);
        void session.current?.sendLink(normalized);
      }}
      onVerify={(value) => {
        void verifyCode(value ?? otp);
      }}
      onIdentifier={() => {
        void session.current?.identifyPhone(phone);
      }}
      onEditEmail={() => {
        session.current?.editEmail();
        setOtp("");
      }}
      onClearIdentifier={() => {
        void clearIdentifier();
      }}
      onAddPasskey={() => {
        void session.current?.addPasskey();
      }}
      onCheckPasskey={() => { void session.current?.checkPasskey(); }}
      onSignOut={() => {
        void signOut();
      }}
      onRefresh={() => {
        const current = session.current;
        if (!current || current.snapshot().busy) return;
        setStatusRefresh({ client, pending: true });
        void current.refresh().finally(() => {
          if (session.current === current) setStatusRefresh({ client, pending: false });
        });
      }}
      phoneStep={
        <MemberPhoneStep
          busy={snapshot.busy}
          onPrepare={() => session.current?.preparePhoneVerification() ?? Promise.resolve(false)}
          bindingError={snapshot.error && snapshot.failure ? t(`failures.${snapshot.failure}`) : snapshot.error}
          recoveryRequired={phoneRecovery}
          onRecover={() => setReauthenticating(true)}
          proofResetKey={proofResetKey}
          focusOnProofReset={phoneProofResetFocus}
          onBind={(id, value) => {
            void session.current?.bindPhone(id, value);
          }}
        />
      }
    />
  );
}
