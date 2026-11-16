"use client";

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
  type MemberClient
} from "@/lib/member-auth/client";
import type { WelcomeView } from "@/lib/member-auth/welcome/read";
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
  | "errorRateLimited"
  | "errorFailed";

/** How an add-passkey failure reads; the client has already settled what it could. */
function resultOf(error: unknown): Result {
  if (!(error instanceof MemberAuthActionError)) return "errorFailed";
  switch (error.kind) {
    case "passkey-cancelled":
      return "errorCancelled";
    case "rate-limited":
      return "errorRateLimited";
    case "network":
    case "timeout":
      return "errorUnknown";
    default:
      return "errorFailed";
  }
}

const passkeysSupported = () =>
  typeof window !== "undefined" &&
  typeof window.PublicKeyCredential === "function";

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
  passkeyCount: () => Promise<number>;
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
  const [unsupported, setUnsupported] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const member = useRef<WelcomeClient | undefined>(client);

  // A refresh brings a new server view; it replaces what this page shows.
  if (initialView !== shown) {
    setShown(initialView);
    setView(initialView);
    setResult(null);
  }
  useEffect(() => {
    setUnsupported(!passkeysSupported());
  }, []);

  const memberClient = (): WelcomeClient => {
    member.current ??= createMemberClient();
    return member.current;
  };

  async function addPasskey() {
    if (busy || view.state !== "welcome") return;
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
      if (
        error instanceof MemberAuthActionError &&
        error.kind === "unauthenticated"
      )
        setView({ state: "signed_out" });
      else setResult(resultOf(error));
    } finally {
      setBusy(null);
    }
  }

  /** Settles an unknown result against the count this page last read from the server. */
  async function checkAgain() {
    if (busy || view.state !== "welcome") return;
    const before = view.passkeys;
    setBusy("checking");
    try {
      const now = await memberClient().passkeyCount();
      if (now > before) {
        setView((current) =>
          current.state === "welcome" ? { ...current, passkeys: now } : current
        );
        setResult("added");
      } else setResult("notAdded");
    } catch (error) {
      if (
        error instanceof MemberAuthActionError &&
        error.kind === "unauthenticated"
      )
        setView({ state: "signed_out" });
      else setResult("errorUnknown");
    } finally {
      setBusy(null);
    }
  }

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
    case "welcome": {
      const signet = {
        pending: "signetPending",
        issued: "signetIssued",
        on_hold: "signetOnHold",
        none: "signetNone"
      } as const;
      const added = result === "added";
      const message = result
        ? t(result)
        : unsupported
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
            className="space-y-3 border-t border-neutral-800 pt-5"
          >
            <h2
              id="welcome-passkey-heading"
              className="text-base font-medium text-neutral-100"
            >
              {t("passkeyHeading")}
            </h2>
            {view.emailVerified ? (
              <>
                <p className="text-sm leading-6 text-neutral-300">
                  {added
                    ? t("passkeyBodyAdded")
                    : t(view.passkeys ? "passkeyBodyExisting" : "passkeyBody")}
                </p>
                {result === "errorUnknown" ? (
                  <AccountPrimaryButton
                    type="button"
                    disabled={busy !== null}
                    aria-busy={busy === "checking"}
                    onClick={() => void checkAgain()}
                  >
                    {busy === "checking" ? t("checking") : t("checkAgain")}
                  </AccountPrimaryButton>
                ) : (
                  !added && (
                    <AccountPrimaryButton
                      type="button"
                      disabled={busy !== null || unsupported}
                      aria-busy={busy === "adding"}
                      onClick={() => void addPasskey()}
                    >
                      {busy === "adding" ? t("waiting") : t("addPasskey")}
                    </AccountPrimaryButton>
                  )
                )}
                {/* One status slot reserving two lines, so a result appears without moving the card. */}
                <p
                  role="status"
                  aria-live="polite"
                  className="min-h-12 text-sm leading-6 text-neutral-300"
                >
                  {message}
                </p>
              </>
            ) : (
              <p className="text-sm leading-6 text-neutral-300">
                {t("passkeyUnverified")}
              </p>
            )}
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
