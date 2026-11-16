"use client";

import {
  AnimatePresence,
  motion,
  useIsPresent,
  type Variants
} from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode
} from "react";
import {
  createMemberClient,
  MemberAuthActionError,
  type MemberClient,
  type PendingPasskey
} from "@/lib/member-auth/client";
import type { WelcomeView } from "@/lib/member-auth/welcome/read";
import { cn } from "@/lib/utils";
import {
  AccountButton,
  AccountPrimaryButton,
  AccountTextButton
} from "@/components/Authentication/member-auth/account-controls";

type Result =
  "added" | "notAdded" | "errorUnknown" | "errorCancelled" | "errorRateLimited";

/**
 * How an add-passkey failure reads. Only a lost verify response the client
 * couldn't settle (it carries `pendingPasskey`) is unknown; every other
 * failure means the passkey wasn't added.
 */
function resultOf(error: unknown): Result {
  if (!(error instanceof MemberAuthActionError)) return "notAdded";
  if (error.pendingPasskey) return "errorUnknown";
  switch (error.kind) {
    case "passkey-cancelled":
      return "errorCancelled";
    case "rate-limited":
      return "errorRateLimited";
    default:
      return "notAdded";
  }
}

/** Automatic checks of a lost registration: the first when it can no longer commit, then one a minute. */
const AUTO_CHECKS = 5;
const RECHECK_MS = 60_000;

const passkeysSupported = () =>
  typeof window !== "undefined" &&
  typeof window.PublicKeyCredential === "function";

/*
 * Motion (round 7). No shared duration: each movement is tuned for its own
 * mass (04c). Arrivals use front-loaded ease-outs that land early and glide;
 * exits are shorter and unstaggered; colour and opacity are the quickest.
 */
const glide = [0.16, 1, 0.3, 1] as const; // expo-like ease-out: arrivals
const settle = [0.22, 1, 0.36, 1] as const; // softer ease-out: size changes
/** The card arrives in three beats: greeting, Signet, passkey. */
const arrival: Variants = {
  hidden: {},
  shown: { transition: { delayChildren: 0.08, staggerChildren: 0.13 } }
};
const beat: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: glide }
  }
};
/** A height change: about the size of two lines, so a little slower than a fade. */
const resize = { duration: 0.42, ease: settle };

/** Text that appears or leaves by easing its height, so the card never jumps. */
function Eased({
  show,
  id,
  children
}: {
  show: boolean;
  id: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key={id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{
            height: 0,
            opacity: 0,
            transition: { duration: 0.24, ease: settle }
          }}
          transition={resize}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A small uppercase label: the card's second type voice. */
function Label({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[11px] leading-4 tracking-[0.18em] text-muted-foreground uppercase",
        className
      )}
    >
      {children}
    </span>
  );
}

type SignetState = "pending" | "issued" | "on_hold" | "none" | "ghost";

/**
 * PLACEHOLDER Signet mark (round 7): a plain ring and seal, until the owner
 * decides the real mark. Its state is form, not words: pending breathes,
 * issued settles solid, on hold dims, and none / restricted / unverified are a
 * dashed ghost ring with no seal.
 */
function SignetMark({ state }: { state: SignetState }) {
  const ghost = state === "none" || state === "ghost";
  return (
    <svg
      viewBox="0 0 56 56"
      aria-hidden="true"
      data-placeholder="signet-mark"
      className="size-14 shrink-0 text-foreground"
    >
      <motion.circle
        cx="28"
        cy="28"
        r="26"
        fill="none"
        stroke="currentColor"
        strokeWidth={state === "issued" ? 1.5 : 1}
        strokeDasharray={ghost ? "2 4" : undefined}
        initial={false}
        animate={{
          opacity: state === "issued" ? 1 : state === "pending" ? 0.6 : 0.22
        }}
        transition={{ duration: 0.5, ease: glide }}
      />
      {!ghost && (
        <motion.circle
          key={state}
          cx="28"
          cy="28"
          r="17"
          fill="currentColor"
          style={{ transformOrigin: "28px 28px" }}
          initial={
            state === "issued"
              ? { opacity: 0, scale: 0.72 }
              : { opacity: state === "pending" ? 0.3 : 0.1, scale: 0.88 }
          }
          animate={
            state === "pending"
              ? { opacity: [0.3, 0.75], scale: [0.88, 1] }
              : {
                  opacity: state === "issued" ? 1 : 0.1,
                  scale: state === "issued" ? 1 : 0.88
                }
          }
          transition={
            state === "pending"
              ? // A slow breath: long enough to read as waiting, never as an alert.
                {
                  duration: 2.6,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "mirror"
                }
              : // Issued lands once, early, and glides into place.
                { duration: 0.9, ease: glide, delay: 0.25 }
          }
        />
      )}
    </svg>
  );
}

/** The card's primary control on theme tokens, so it follows light and dark mode. */
function PrimaryControl({
  className,
  ...props
}: ComponentProps<typeof AccountPrimaryButton>) {
  return (
    <AccountPrimaryButton
      className={cn(
        "border-foreground bg-foreground text-background hover:bg-foreground/85 focus-visible:outline-foreground",
        className
      )}
      {...props}
    />
  );
}
function SecondaryControl({
  className,
  ...props
}: ComponentProps<typeof AccountButton>) {
  return (
    <AccountButton
      className={cn(
        "border-border text-foreground hover:bg-muted focus-visible:outline-foreground",
        className
      )}
      {...props}
    />
  );
}

/** While the browser's prompt is open or a check runs: a light sweep across the control. */
function Sweep() {
  // A control on its way out stops its progress at once, instead of sweeping while it fades.
  const present = useIsPresent();
  if (!present) return null;
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-current to-transparent opacity-15"
      initial={{ x: "-100%" }}
      animate={{ x: "300%" }}
      transition={{
        duration: 1.35,
        ease: [0.65, 0, 0.35, 1],
        repeat: Infinity
      }}
    />
  );
}

/**
 * One state of the passkey control, in the control's own cell. The leaving
 * control fades quickly and can't be pressed; the new one fades a touch slower.
 */
function Cell({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.32, ease: glide } }}
      exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeOut" } }}
      data-leaving={present ? undefined : ""}
      inert={!present}
      className="col-start-1 row-start-1"
    >
      {children}
    </motion.div>
  );
}

/*
 * Signing in from this page returns here (round 5). Provider sign-ins come
 * back through /account/continue and a magic link may open in a new tab, so
 * the intent rides in local storage instead of the URL, and expires.
 */
const RETURN_KEY = "sophomores.welcome.return";
const RETURN_FOR_MS = 30 * 60 * 1000;
function rememberReturn() {
  try {
    window.localStorage.setItem(RETURN_KEY, String(Date.now()));
  } catch {
    // Without storage the member simply stays on the account page.
  }
}
function takeReturn(): boolean {
  try {
    const since = Number(window.localStorage.getItem(RETURN_KEY));
    window.localStorage.removeItem(RETURN_KEY);
    return since > 0 && Date.now() - since < RETURN_FOR_MS;
  } catch {
    return false;
  }
}

type WelcomeClient = Pick<MemberClient, "addPasskey"> & {
  confirmPasskey: (
    pending: PendingPasskey
  ) => Promise<"added" | "not_added" | "unknown">;
};

/**
 * The welcome page (ADR-0013): the NFC card's first tap opens it, and the
 * account page links to it. It needs only a signed-in account. Round 7: the
 * states are designed, not written. One quiet greeting, the Signet as a mark
 * whose form carries its state, and one passkey control that changes itself.
 * Words appear only where form can't say it.
 */
export function Welcome({
  initialView,
  client
}: {
  initialView: WelcomeView;
  /** Injected in tests; the browser uses the shared member client. */
  client?: WelcomeClient;
}) {
  const t = useTranslations("Customer.components_membership_welcome");
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [shown, setShown] = useState(initialView);
  const [busy, setBusy] = useState<"adding" | "checking" | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState<PendingPasskey | null>(null);
  /** Automatic checks run so far for `pending`; bounded by AUTO_CHECKS. */
  const [autoChecks, setAutoChecks] = useState(0);
  const [unsupported, setUnsupported] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const member = useRef<WelcomeClient | undefined>(client);
  const confirmation = useRef<HTMLParagraphElement>(null);

  // A refresh brings a new server view; it replaces what this page shows.
  if (initialView !== shown) {
    setShown(initialView);
    setView(initialView);
    setResult(null);
    setPending(null);
    setAutoChecks(0);
  }
  useEffect(() => {
    setUnsupported(!passkeysSupported());
  }, []);

  const memberClient = (): WelcomeClient => {
    member.current ??= createMemberClient();
    return member.current;
  };
  const signedOut = (error: unknown) =>
    error instanceof MemberAuthActionError && error.kind === "unauthenticated";

  async function addPasskey() {
    if (busy || pending || view.state !== "welcome") return;
    if (!passkeysSupported()) {
      setUnsupported(true);
      return;
    }
    setBusy("adding");
    setResult(null);
    try {
      await memberClient().addPasskey();
      setView((current) =>
        current.state === "welcome"
          ? { ...current, passkeys: current.passkeys + 1 }
          : current
      );
      setResult("added");
    } catch (error) {
      if (signedOut(error)) setView({ state: "signed_out" });
      else {
        if (error instanceof MemberAuthActionError && error.pendingPasskey) {
          setPending(error.pendingPasskey);
          setAutoChecks(0);
        }
        setResult(resultOf(error));
      }
    } finally {
      setBusy(null);
    }
  }

  /** Settles a lost registration through the client; unchanged stays unknown until it can no longer commit. */
  async function checkAgain() {
    if (busy || !pending) return;
    setBusy("checking");
    try {
      const outcome = await memberClient().confirmPasskey(pending);
      if (outcome === "unknown") return;
      setPending(null);
      if (outcome === "added") {
        setView((current) =>
          current.state === "welcome"
            ? { ...current, passkeys: current.passkeys + 1 }
            : current
        );
        setResult("added");
      } else setResult("notAdded");
    } catch (error) {
      if (signedOut(error)) setView({ state: "signed_out" });
    } finally {
      setBusy(null);
    }
  }

  // The page checks again by itself once the lost registration can no longer
  // commit, then (while a count read still fails) every minute, a few times.
  const check = useRef(checkAgain);
  check.current = checkAgain;
  const autoChecking = pending !== null && autoChecks < AUTO_CHECKS;
  useEffect(() => {
    if (!pending || autoChecks >= AUTO_CHECKS) return;
    const delay =
      autoChecks === 0
        ? Math.max(0, pending.settlesAt - Date.now()) + 1000
        : RECHECK_MS;
    const timer = window.setTimeout(() => {
      setAutoChecks((count) => count + 1);
      void check.current();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [pending, autoChecks]);

  const added = result === "added";
  // The pressed control leaves on "added"; focus moves to what replaced it.
  useEffect(() => {
    if (added) confirmation.current?.focus({ preventScroll: true });
  }, [added]);

  const signedIn = view.state !== "signed_out";
  const title =
    view.state === "unavailable" ? t("unavailableTitle") : t("title");
  const verified =
    view.state === "welcome" && view.emailVerified && view.signet !== null;
  /** The Signet row: a verified member's state, or a ghost where it can't be told. */
  const signet: { name: string; state: SignetState; label: string } | null =
    view.state === "restricted"
      ? { name: "restricted", state: "ghost", label: t("signetRestricted") }
      : view.state !== "welcome"
        ? null
        : !verified || view.signet === null
          ? { name: "unverified", state: "ghost", label: t("signetUnverified") }
          : {
              name: view.signet,
              state: view.signet,
              label: t(
                view.signet === "pending"
                  ? "signetPending"
                  : view.signet === "issued"
                    ? "signetIssued"
                    : view.signet === "on_hold"
                      ? "signetOnHold"
                      : "signetNone"
              )
            };

  /** The one line beside the passkey control, only when the member must act. */
  const message =
    result === "errorUnknown"
      ? t(autoChecking ? "errorUnknown" : "errorUnknownManual")
      : result && !added
        ? t(result)
        : "";
  // Which control the passkey slot shows; each state changes the control itself.
  const control = added
    ? "added"
    : pending
      ? "check"
      : unsupported && !result
        ? "unsupported"
        : "add";

  return (
    <main className="mx-auto flex w-full max-w-[960px] items-start justify-center px-4 pt-28 pb-20 min-[800px]:px-8">
      <motion.section
        aria-labelledby="welcome-heading"
        data-state={view.state}
        variants={arrival}
        initial="hidden"
        animate="shown"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-foreground min-[800px]:p-8"
      >
        {/* Beat 1: the way back, then one large, quiet line. */}
        <motion.div variants={beat}>
          {signedIn && (
            <AccountTextButton
              asChild
              className="-ml-1 min-h-12 gap-2 px-1 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase no-underline hover:text-foreground focus-visible:outline-foreground"
            >
              <a href="/account">
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                >
                  <path d="M10 3 5 8l5 5" />
                </svg>
                {t("backToAccount")}
              </a>
            </AccountTextButton>
          )}
          <h1
            id="welcome-heading"
            className="mt-6 font-[family-name:NarcissianNectare,serif] text-5xl leading-[1.05] font-normal tracking-tight text-balance min-[800px]:text-6xl"
          >
            {title}
          </h1>
        </motion.div>

        {view.state === "signed_out" && (
          <motion.div variants={beat} className="mt-10">
            <PrimaryControl asChild>
              <a href="/account" onClick={rememberReturn}>
                {t("signIn")}
              </a>
            </PrimaryControl>
          </motion.div>
        )}

        {view.state === "unavailable" && (
          <motion.div variants={beat} className="mt-10">
            <PrimaryControl
              type="button"
              disabled={refreshing}
              aria-busy={refreshing}
              onClick={() => startRefresh(() => router.refresh())}
              className="relative overflow-hidden aria-busy:disabled:opacity-100"
            >
              {refreshing && <Sweep />}
              {refreshing ? t("checking") : t("tryAgain")}
            </PrimaryControl>
          </motion.div>
        )}

        {/* Beat 2: the Signet, its state carried by the mark. */}
        {signet && (
          <motion.div
            variants={beat}
            data-signet-state={signet.name}
            className="mt-10 flex items-center gap-4 border-t border-border pt-6"
          >
            <SignetMark state={signet.state} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label>{t("signetLabel")}</Label>
              <span className="font-mono text-xs tracking-[0.14em] text-foreground uppercase">
                {signet.label}
              </span>
            </div>
            {view.state === "welcome" && verified && view.signet === "none" && (
              <AccountTextButton
                asChild
                className="min-h-12 px-1 text-sm text-foreground decoration-border hover:text-foreground focus-visible:outline-foreground"
              >
                <a href="/shop">{t("goToShop")}</a>
              </AccountTextButton>
            )}
          </motion.div>
        )}
        {view.state === "restricted" && (
          <motion.p
            variants={beat}
            className="mt-4 text-sm leading-6 text-muted-foreground"
          >
            {t.rich("restrictedBody", {
              email: (chunks) => (
                <a
                  href={`mailto:${String(chunks)}`}
                  className="py-[15px] text-foreground underline decoration-border underline-offset-4"
                >
                  {chunks}
                </a>
              )
            })}
          </motion.p>
        )}
        {view.state === "welcome" && !verified && (
          // Unverified email: no Signet state, no shop, no passkey the server would refuse; only what to do.
          <motion.p
            variants={beat}
            className="mt-4 text-sm leading-6 text-muted-foreground"
          >
            {t("unverifiedBody")}
          </motion.p>
        )}

        {/* Beat 3: the passkey, one control whose own states change it. */}
        {view.state === "welcome" && verified && (
          <motion.div
            variants={beat}
            className="mt-6 border-t border-border pt-6"
          >
            <div className="flex items-baseline justify-between">
              <Label>{t("passkeyLabel")}</Label>
              <Label className="tabular-nums">
                {view.passkeys
                  ? t("passkeyCount", { count: view.passkeys })
                  : ""}
              </Label>
            </div>
            {/* The control's own 48 px cell: every state takes it, so nothing outside it moves. */}
            <div data-welcome-slot className="mt-3 grid min-h-12">
              <AnimatePresence initial={false}>
                {control === "add" && (
                  <Cell key="add">
                    <PrimaryControl
                      type="button"
                      data-welcome-control={
                        busy === "adding" ? "waiting" : "add"
                      }
                      disabled={busy !== null}
                      aria-busy={busy === "adding"}
                      onClick={() => void addPasskey()}
                      className="relative overflow-hidden aria-busy:disabled:opacity-100"
                    >
                      {busy === "adding" && <Sweep />}
                      {busy === "adding" ? t("waiting") : t("addPasskey")}
                    </PrimaryControl>
                  </Cell>
                )}
                {control === "check" && (
                  <Cell key="check">
                    <SecondaryControl
                      type="button"
                      data-welcome-control={
                        busy === "checking" ? "checking" : "check"
                      }
                      disabled={busy !== null}
                      aria-busy={busy === "checking"}
                      onClick={() => void checkAgain()}
                      className="relative overflow-hidden aria-busy:disabled:opacity-100"
                    >
                      {busy === "checking" && <Sweep />}
                      {busy === "checking" ? t("checking") : t("checkAgain")}
                    </SecondaryControl>
                  </Cell>
                )}
                {control === "unsupported" && (
                  <Cell key="unsupported">
                    <p
                      data-welcome-control="unsupported"
                      className="flex min-h-12 items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground"
                    >
                      {t("errorUnsupported")}
                    </p>
                  </Cell>
                )}
              </AnimatePresence>
              {/* Mounted before it fills, so "Passkey added" is announced; it fills the same cell the button leaves. */}
              <div
                role="status"
                aria-live="polite"
                data-welcome-result="added"
                className="pointer-events-none col-start-1 row-start-1"
              >
                <AnimatePresence initial={false}>
                  {added && (
                    <motion.p
                      key="added"
                      ref={confirmation}
                      tabIndex={-1}
                      data-welcome-control="added"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.45, ease: glide, delay: 0.14 }}
                      className="pointer-events-auto flex min-h-12 items-center justify-center gap-2.5 rounded-xl border border-border text-sm font-medium outline-none"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {/* The check draws in after the control has settled. */}
                        <motion.path
                          d="M3.5 8.5 6.5 11.5 12.5 4.5"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{
                            duration: 0.5,
                            ease: glide,
                            delay: 0.3
                          }}
                        />
                      </svg>
                      {t("added")}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {/* At most one short line, only when the member must act; it eases in and out. */}
            <div role="status" aria-live="polite" data-welcome-result="after">
              {/* A stable key: one message replacing another swaps in place; only appearing or clearing eases. */}
              <Eased show={message !== ""} id="result">
                <p className="pt-3 text-sm leading-6 text-muted-foreground">
                  {message}
                </p>
              </Eased>
            </div>
          </motion.div>
        )}
      </motion.section>
    </main>
  );
}

/**
 * The account page's way in: a secondary link, shown once a signed-in account
 * has a verified email. When the member came to sign in from the welcome page,
 * it sends them straight back there.
 */
export function WelcomeLink() {
  const t = useTranslations("Customer.components_membership_welcome");
  const router = useRouter();
  useEffect(() => {
    if (takeReturn()) router.replace("/welcome");
  }, [router]);
  return (
    <AccountButton asChild>
      <a href="/welcome">{t("accountLink")}</a>
    </AccountButton>
  );
}
