"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  createMemberClient,
  MemberAuthActionError,
  type MemberClient
} from "@/lib/member-auth/client";
import type { WelcomeView } from "@/lib/member-auth/welcome/read";

type Result =
  | "added"
  | "errorCancelled"
  | "errorUnsupported"
  | "errorRateLimited"
  | "errorFailed"
  | "errorUnknown"
  | "errorNotReady";

/** How an add-passkey failure reads; an unknown outcome stays unknown. */
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

/**
 * The welcome page (ADR-0013): the NFC card's first tap opens it, and the
 * account page links to it. It needs only a signed-in member. It offers a
 * plain welcome, where the Signet stands, and adding an ordinary sign-in
 * passkey on this phone. Wording and look are placeholders until the design
 * reset reaches this page.
 */
export function Welcome({
  initialView,
  client
}: {
  initialView: WelcomeView;
  /** Injected in tests; the browser uses the shared member client. */
  client?: Pick<MemberClient, "addPasskey">;
}) {
  const t = useTranslations("Customer.components_membership_welcome");
  const [view, setView] = useState(initialView);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const member = useRef(client);

  async function addPasskey() {
    if (busy) return;
    if (!passkeysSupported()) {
      setResult("errorUnsupported");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      member.current ??= createMemberClient();
      await member.current.addPasskey();
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
      setBusy(false);
    }
  }

  let title = t("title");
  let body: ReactNode;
  let content: ReactNode = null;
  switch (view.state) {
    case "signed_out":
      body = t("signInBody");
      content = (
        <ActionLink href="/account" primary>
          {t("signIn")}
        </ActionLink>
      );
      break;
    case "unavailable":
      title = t("unavailableTitle");
      body = t("unavailableBody");
      content = (
        <ActionButton onClick={() => window.location.reload()} primary>
          {t("tryAgain")}
        </ActionButton>
      );
      break;
    case "welcome": {
      const signet = {
        pending: "signetPending",
        issued: "signetIssued",
        on_hold: "signetOnHold",
        none: "signetNone"
      } as const;
      body = (
        <>
          {t("intro")} {t(signet[view.signet])}
        </>
      );
      content = (
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
          {view.canAddPasskey ? (
            <>
              <p className="text-sm leading-6 text-neutral-300">
                {t(view.passkeys ? "passkeyBodyExisting" : "passkeyBody")}
              </p>
              <ActionButton
                onClick={() => void addPasskey()}
                busy={busy}
                primary
              >
                {busy ? t("waiting") : t("addPasskey")}
              </ActionButton>
              {/* One status slot reserving two lines, so a result appears without moving the card. */}
              <p
                role="status"
                aria-live="polite"
                className="min-h-12 text-sm leading-6 text-neutral-300"
              >
                {result ? t(result) : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-neutral-300">
                {t("notReadyBody")}
              </p>
              <ActionLink href="/account">{t("finishSetup")}</ActionLink>
            </>
          )}
        </section>
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
          <a
            href="/account"
            className="inline-flex min-h-12 items-center text-sm text-neutral-300 underline decoration-neutral-600 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100"
          >
            {t("backToAccount")}
          </a>
        )}
      </section>
    </main>
  );
}

/** The account page's way in: a plain secondary link, shown in the signed-in member view. */
export function WelcomeLink() {
  const t = useTranslations("Customer.components_membership_welcome");
  return <ActionLink href="/welcome">{t("accountLink")}</ActionLink>;
}

function ActionButton({
  onClick,
  busy = false,
  primary,
  children
}: {
  onClick: () => void;
  busy?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      className={cn(
        "min-h-12 w-full rounded-xl px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100 disabled:cursor-wait",
        primary
          ? "bg-neutral-100 text-neutral-950 hover:bg-white disabled:bg-neutral-800 disabled:text-neutral-400"
          : "border border-neutral-600 text-neutral-100 hover:bg-neutral-800 disabled:text-neutral-400"
      )}
    >
      {children}
    </button>
  );
}

function ActionLink({
  href,
  primary,
  children
}: {
  href: string;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100",
        primary
          ? "bg-neutral-100 text-neutral-950 hover:bg-white"
          : "border border-neutral-600 text-neutral-100 hover:bg-neutral-800"
      )}
    >
      {children}
    </a>
  );
}
