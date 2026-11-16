"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode
} from "react";
import {
  createMemberClient,
  MemberAuthActionError,
  type MemberClient,
  type PendingPasskey
} from "@/lib/member-auth/client";
import type { WelcomeView } from "@/lib/member-auth/welcome/read";
import { motionTokens } from "@/lib/motion-tokens";
import {
  AccountButton,
  AccountPrimaryButton,
  AccountTextButton
} from "@/components/Authentication/member-auth/account-controls";

type Result =
  | "added"
  | "notAdded"
  | "errorUnknown"
  | "errorCancelled"
  | "errorRateLimited";

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

/** One beat for a size change: the shared smooth easing, the normal duration. */
const ease = {
  duration: motionTokens.duration.normal,
  ease: motionTokens.easing.smooth
};
/** Text that appears or leaves by easing its height, so the card never jumps. */
function Eased({ show, id, children }: { show: boolean; id: string; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key={id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={ease}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
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
  confirmPasskey: (pending: PendingPasskey) => Promise<"added" | "not_added" | "unknown">;
};

/**
 * The welcome page (ADR-0013): the NFC card's first tap opens it, and the
 * account page links to it. It needs only a signed-in account. It offers a
 * plain welcome, where the Signet stands, and adding an ordinary sign-in
 * passkey on this device. Wording and look are placeholders until the design
 * reset reaches this page.
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
    const delay = autoChecks === 0 ? Math.max(0, pending.settlesAt - Date.now()) + 1000 : RECHECK_MS;
    const timer = window.setTimeout(() => {
      setAutoChecks((count) => count + 1);
      void check.current();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [pending, autoChecks]);

  let title = t("title");
  let body: ReactNode;
  let content: ReactNode = null;
  switch (view.state) {
    case "signed_out":
      body = t("signInBody");
      content = (
        <AccountPrimaryButton asChild>
          <a href="/account" onClick={rememberReturn}>
            {t("signIn")}
          </a>
        </AccountPrimaryButton>
      );
      break;
    case "unavailable":
      title = t("unavailableTitle");
      body = t("unavailableBody");
      content = (
        <AccountPrimaryButton
          type="button"
          disabled={refreshing}
          aria-busy={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          {refreshing ? t("checking") : t("tryAgain")}
        </AccountPrimaryButton>
      );
      break;
    case "restricted":
      title = t("restrictedTitle");
      body = t.rich("restrictedBody", {
        email: (chunks) => (
          <a
            href={`mailto:${String(chunks)}`}
            className="underline decoration-neutral-600 underline-offset-4 hover:text-white"
          >
            {chunks}
          </a>
        )
      });
      break;
    case "welcome": {
      if (!view.emailVerified || view.signet === null) {
        // Unverified email: nothing about the Signet, no shop, no passkey offer the server would refuse.
        body = t("unverifiedBody");
        break;
      }
      const signet = {
        pending: "signetPending",
        issued: "signetIssued",
        on_hold: "signetOnHold",
        none: "signetNone"
      } as const;
      const added = result === "added";
      const message =
        result === "errorUnknown" && !autoChecking
          ? t("errorUnknownManual")
          : result && !added
            ? t(result)
            : unsupported && !result
              ? t("errorUnsupported")
              : "";
      body = (
        <>
          {t("intro")} {t(signet[view.signet])}
        </>
      );
      content = (
        <>
          {view.signet === "none" && (
            <AccountButton asChild>
              <a href="/shop">{t("goToShop")}</a>
            </AccountButton>
          )}
          <section
            aria-labelledby="welcome-passkey-heading"
            className="border-t border-neutral-800 pt-5"
          >
            <h2
              id="welcome-passkey-heading"
              className="text-base font-medium text-neutral-100"
            >
              {t("passkeyHeading")}
            </h2>
            {/* "Passkey added." leads, above the body; this region is mounted before it fills, so it is announced. */}
            <div role="status" aria-live="polite" data-welcome-result="lead">
              <Eased show={added} id="added">
                <p className="pt-3 text-sm leading-6 font-medium text-neutral-100">
                  {t("added")}
                </p>
              </Eased>
            </div>
            <AnimatePresence initial={false}>
              {added ? (
                <motion.p
                  key="added"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={ease}
                  className="pt-1 text-sm leading-6 text-neutral-300"
                >
                  {t("passkeyBodyAdded")}
                </motion.p>
              ) : (
                <motion.div
                  key="offer"
                  exit={{ height: 0, opacity: 0 }}
                  transition={ease}
                  className="space-y-3 overflow-hidden pt-3"
                >
                  <p className="text-sm leading-6 text-neutral-300">
                    {t(view.passkeys ? "passkeyBodyExisting" : "passkeyBody")}
                  </p>
                  {pending ? (
                    <AccountPrimaryButton
                      type="button"
                      disabled={busy !== null}
                      aria-busy={busy === "checking"}
                      onClick={() => void checkAgain()}
                    >
                      {busy === "checking" ? t("checking") : t("checkAgain")}
                    </AccountPrimaryButton>
                  ) : (
                    <AccountPrimaryButton
                      type="button"
                      disabled={busy !== null || unsupported}
                      aria-busy={busy === "adding"}
                      onClick={() => void addPasskey()}
                    >
                      {busy === "adding" ? t("waiting") : t("addPasskey")}
                    </AccountPrimaryButton>
                  )}
                  {/* A compact one-line slot; a two-line result eases the rest in. */}
                  <div role="status" aria-live="polite" data-welcome-result="after" className="min-h-6">
                    {/* A stable key: one message replacing another swaps in place; only appearing or clearing eases. */}
                    <Eased show={message !== ""} id="result">
                      <p className="text-sm leading-6 text-neutral-300">{message}</p>
                    </Eased>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </>
      );
      break;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[960px] items-start justify-center px-4 pt-28 pb-20 min-[800px]:px-8">
      <section
        aria-labelledby="welcome-heading"
        data-state={view.state}
        className="w-full max-w-lg space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 min-[800px]:p-8"
      >
        <h1
          id="welcome-heading"
          className="text-2xl font-medium tracking-tight text-neutral-100"
        >
          {title}
        </h1>
        <p className="text-sm leading-6 text-neutral-300">{body}</p>
        {content}
        {view.state !== "signed_out" && (
          <AccountTextButton
            asChild
            className="min-h-12 text-sm text-neutral-300"
          >
            <a href="/account">{t("backToAccount")}</a>
          </AccountTextButton>
        )}
      </section>
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
