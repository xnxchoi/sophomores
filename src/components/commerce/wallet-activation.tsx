"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import {
  createMemberClient,
  type MemberClient
} from "@/lib/member-auth/client";
import type { WalletActivationView } from "@/lib/member-auth/wallet/read";
import { WALLET_ACTIVATION_RETURN_KEY } from "./wallet-activation-link";

type ErrorKey =
  | "errorCancelled"
  | "errorCancelledApprove"
  | "errorPrepare"
  | "errorPendingLimit"
  | "errorIncompatible"
  | "errorUnsupported"
  | "errorConflict"
  | "errorRejected"
  | "errorUnknown"
  | "errorCheck"
  | "errorRateLimited";
type Busy = "approve" | "create" | "check" | "reauth" | null;
type Reply = { ok: true; data: unknown } | { ok: false; code: string };

/** The browser's own WebAuthn JSON bridge; @simplewebauthn/browser is not a direct dependency. */
type JSONCredentialStatics = {
  parseCreationOptionsFromJSON?: (
    options: unknown
  ) => PublicKeyCredentialCreationOptions;
  parseRequestOptionsFromJSON?: (
    options: unknown
  ) => PublicKeyCredentialRequestOptions;
};
class CeremonyError extends Error {
  // "silent": the state was re-read and speaks for itself, so no error line is shown.
  constructor(readonly key: ErrorKey | "reauth" | "silent") {
    super(key);
  }
}

async function call(path: string, body?: unknown): Promise<Reply> {
  let response: Response;
  try {
    response = await fetch(
      path,
      body === undefined && path.endsWith("/status")
        ? {
            credentials: "same-origin",
            cache: "no-store",
            signal: AbortSignal.timeout(15_000)
          }
        : {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: body === undefined ? "{}" : JSON.stringify(body),
            signal: AbortSignal.timeout(30_000)
          }
    );
  } catch {
    return { ok: false, code: "NETWORK" };
  }
  try {
    const result = (await response.json()) as {
      success?: boolean;
      data?: unknown;
      error?: { code?: string };
    };
    return response.ok && result.success
      ? { ok: true, data: result.data }
      : { ok: false, code: result.error?.code ?? String(response.status) };
  } catch {
    return { ok: false, code: "UNAVAILABLE" };
  }
}

function statics(): Required<JSONCredentialStatics> {
  const api = (typeof window !== "undefined"
    ? window.PublicKeyCredential
    : undefined) as unknown as JSONCredentialStatics | undefined;
  if (
    !api?.parseCreationOptionsFromJSON ||
    !api.parseRequestOptionsFromJSON ||
    !navigator.credentials
  )
    throw new CeremonyError("errorUnsupported");
  return api as Required<JSONCredentialStatics>;
}

/** Runs one browser passkey prompt and returns its JSON form. */
async function ceremony(
  kind: "create" | "get",
  options: unknown
): Promise<unknown> {
  const api = statics();
  let credential: Credential | null;
  try {
    credential =
      kind === "create"
        ? await navigator.credentials.create({
            publicKey: api.parseCreationOptionsFromJSON(options)
          })
        : await navigator.credentials.get({
            publicKey: api.parseRequestOptionsFromJSON(options)
          });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    // NotSupportedError: the authenticator offers no ES256 key (for example RS256-only Windows Hello).
    throw new CeremonyError(
      name === "NotSupportedError"
        ? "errorIncompatible"
        : name === "NotAllowedError" || name === "AbortError"
          ? "errorCancelled"
          : "errorRejected"
    );
  }
  const json = (
    credential as (Credential & { toJSON?: () => unknown }) | null
  )?.toJSON?.();
  if (!json) throw new CeremonyError("errorUnsupported");
  return json;
}

/** Lets the account page look for this member's activation again after an in-place sign-in. */
function markReturn(): void {
  try {
    window.sessionStorage.setItem(WALLET_ACTIVATION_RETURN_KEY, "1");
  } catch {
    /* the account page still reads its own state */
  }
}

const errorFor = (code: string): ErrorKey | "refresh" | "reauth" =>
  (
    ({
      INCOMPATIBLE_CREDENTIAL: "errorIncompatible",
      WALLET_CONFLICT: "errorConflict",
      // Already active: re-read the state instead of claiming a conflict.
      WALLET_ACTIVE: "refresh",
      RATE_LIMITED: "errorRateLimited",
      LIMIT_REACHED: "errorRateLimited",
      PENDING_LIMIT: "errorPendingLimit",
      INVALID_CHALLENGE: "errorRejected",
      INVALID_ASSERTION: "errorRejected",
      INVALID_REGISTRATION: "errorRejected",
      UNKNOWN_CREDENTIAL: "errorRejected",
      FRESH_AUTH_REQUIRED: "reauth",
      NOT_ELIGIBLE: "refresh",
      UNAUTHENTICATED: "refresh"
    }) as Record<string, ErrorKey | "refresh" | "reauth">
  )[code] ?? "errorUnknown";

/**
 * Member wallet activation (ADR-0005): one deliberate passkey approval on the
 * device the member keeps. States come from the server; this view never
 * decides eligibility or wallet ownership itself.
 */
export function WalletActivation({
  initialView,
  client
}: {
  initialView: WalletActivationView;
  client?: Pick<MemberClient, "signOut">;
}) {
  const t = useTranslations("Customer.components_commerce_wallet_activation");
  const [view, setView] = useState(initialView);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [reauth, setReauth] = useState(false);
  // What the live region says when there is no error: a step notice or the new state's title.
  const [notice, setNotice] = useState("");
  const [changed, setChanged] = useState(false);
  const pending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const shownState = useRef(initialView.state);

  // A state change replaces the controls the member was using: move focus to the new heading.
  useEffect(() => {
    if (shownState.current === view.state) return;
    shownState.current = view.state;
    heading.current?.focus();
  }, [view.state]);

  // `clear`: a changed state retires the previous error (not after a failure, whose message still applies).
  async function refresh(clear = true): Promise<boolean> {
    const reply = await call("/api/member/wallet/status");
    if (reply.ok) {
      const next = reply.data as WalletActivationView;
      if (next.state !== view.state) {
        if (clear) setError(null);
        setChanged(true);
      }
      setView(next);
    }
    return reply.ok;
  }
  async function run(kind: Exclude<Busy, null>, work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(kind);
    setError(null);
    setNotice("");
    try {
      await work();
    } catch (caught) {
      setNotice("");
      const key = caught instanceof CeremonyError ? caught.key : "errorUnknown";
      // An expired sign-in is a state, not an error: ask the member to sign in again.
      if (key === "reauth") {
        setReauth(true);
        return;
      }
      if (key === "silent") return;
      setError(key);
      // A cancelled prompt after registration leaves an approval pending: show it.
      if (key !== "errorUnsupported") await refresh(false);
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  async function step(
    path: string,
    body?: unknown,
    unknown: ErrorKey = "errorUnknown"
  ): Promise<unknown> {
    const reply = await call(path, body);
    if (reply.ok) return reply.data;
    const mapped = errorFor(reply.code);
    if (mapped === "refresh") {
      if (await refresh()) throw new CeremonyError("silent");
      throw new CeremonyError("errorUnknown");
    }
    // A failure before any passkey prompt means nothing happened yet.
    throw new CeremonyError(mapped === "errorUnknown" ? unknown : mapped);
  }
  /** The new state's title, announced once the state is re-read. */
  async function settle(): Promise<void> {
    setNotice("");
    if (!(await refresh())) throw new CeremonyError("errorUnknown");
  }
  const approve = (credentialID: string) =>
    run("approve", async () => {
      statics();
      const options = await step(
        "/api/member/wallet/bind/options",
        { credentialId: credentialID },
        "errorPrepare"
      );
      let response: unknown;
      try {
        response = await ceremony("get", options);
      } catch (caught) {
        // Only one saved passkey is offered; it may live on another device.
        if (caught instanceof CeremonyError && caught.key === "errorCancelled")
          throw new CeremonyError("errorCancelledApprove");
        throw caught;
      }
      await step("/api/member/wallet/bind/verify", { response });
      await settle();
    });
  const create = () => {
    if (
      view.state !== "activation_required" &&
      view.state !== "approval_pending"
    )
      return;
    if (!view.freshSession) {
      setReauth(true);
      return;
    }
    void run("create", async () => {
      statics();
      const options = await step(
        "/api/member/wallet/register/options",
        undefined,
        "errorPrepare"
      );
      const bind = await step("/api/member/wallet/register/verify", {
        response: await ceremony("create", options)
      });
      // Creating asks twice; say so before the second prompt opens.
      // Committed synchronously, so the notice is on the page before the prompt opens.
      flushSync(() => setNotice(t("createdApproveNext")));
      await step("/api/member/wallet/bind/verify", {
        response: await ceremony("get", bind)
      });
      await settle();
    });
  };
  const signInAgain = () =>
    run("reauth", async () => {
      await (client ?? createMemberClient()).signOut();
      markReturn();
      window.location.assign("/account");
    });
  const check = () =>
    run("check", async () => {
      if (!(await refresh())) throw new CeremonyError("errorCheck");
    });
  // "Check again" whenever the result is unknown, not only in the unavailable state.
  const checkAgain =
    error === "errorUnknown" && view.state !== "unavailable" ? (
      <ActionButton onClick={check} busy={busy === "check"}>
        {busy === "check" ? t("checking") : t("checkAgain")}
      </ActionButton>
    ) : null;

  let title = t("title");
  let body: ReactNode = null;
  let actions: ReactNode = null;
  const working = busy === "approve" || busy === "create";
  switch (view.state) {
    case "signed_out":
      body = t("signInBody");
      actions = (
        <ActionLink href="/account" onClick={markReturn} primary>
          {t("signIn")}
        </ActionLink>
      );
      break;
    case "unavailable":
      title = t("unavailableTitle");
      body = t("unavailableBody");
      actions = (
        <ActionButton onClick={check} busy={busy === "check"} primary>
          {busy === "check" ? t("checking") : t("checkAgain")}
        </ActionButton>
      );
      break;
    case "not_eligible":
      title = t("noneTitle");
      body = t("noneBody");
      actions = (
        <ActionLink href="/tickets" primary>
          {t("viewTickets")}
        </ActionLink>
      );
      break;
    case "on_hold":
      title = t("holdTitle");
      body = t("holdBody");
      break;
    case "key_pending":
    case "key_issued":
      title = t("activatedTitle");
      body =
        view.state === "key_issued" ? t("keyIssuedBody") : t("keyPendingBody");
      break;
    case "approval_pending":
    case "activation_required": {
      const credential = view.credentials[0];
      const needsNew =
        view.state === "activation_required" && view.passkeys !== "compatible";
      // Every activation step needs a recent sign-in, so an older session goes straight to signing in again.
      if (reauth || !view.freshSession) {
        body = t("reauthBody");
        actions = (
          <ActionButton onClick={signInAgain} busy={busy === "reauth"} primary>
            {t("reauthAction")}
          </ActionButton>
        );
        break;
      }
      body =
        view.state === "approval_pending"
          ? t("pendingBody")
          : needsNew
            ? t(
                view.passkeys === "incompatible"
                  ? "incompatibleBody"
                  : "createBody"
              )
            : t("approveBody");
      actions = (
        <>
          {credential && !needsNew ? (
            <ActionButton
              onClick={() => void approve(credential.id)}
              busy={busy === "approve"}
              disabled={working}
              primary
            >
              {busy === "approve" ? t("waiting") : t("approve")}
            </ActionButton>
          ) : (
            <ActionButton
              onClick={create}
              busy={busy === "create"}
              disabled={working}
              primary
            >
              {busy === "create" ? t("waiting") : t("create")}
            </ActionButton>
          )}
          {credential && !needsNew && (
            <ActionButton
              onClick={create}
              busy={busy === "create"}
              disabled={working}
            >
              {busy === "create" ? t("waiting") : t("createInstead")}
            </ActionButton>
          )}
        </>
      );
      break;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[960px] items-start justify-center px-4 pt-28 pb-20 min-[800px]:px-8">
      <section
        aria-labelledby="wallet-activation-heading"
        data-state={view.state}
        className="w-full max-w-lg space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 min-[800px]:p-8"
      >
        <p className="text-xs tracking-[0.16em] text-neutral-400 uppercase">
          {t("eyebrow")}
        </p>
        <h1
          id="wallet-activation-heading"
          ref={heading}
          tabIndex={-1}
          className="text-2xl font-medium tracking-tight text-neutral-100 outline-none"
        >
          {title}
        </h1>
        <p className="text-sm leading-6 text-neutral-300">{body}</p>
        {/* One status slot, always mounted so it can announce. With actions it sits in their group and
            reserves two lines (the longest message at 390 px), so a result appears without moving the
            card. Without actions it is visible only for an error; a new state's title is announced. */}
        <div className={cn((actions || checkAgain) && "flex flex-col gap-3")}>
          {actions}
          {checkAgain}
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "text-sm leading-6 text-neutral-300",
              actions ? "min-h-12" : !error && "sr-only"
            )}
          >
            {error ? t(error) : notice || (changed ? title : "")}
          </p>
        </div>
        <a
          href="/account"
          className="inline-flex min-h-12 items-center text-sm text-neutral-300 underline decoration-neutral-600 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100"
        >
          {t("backToAccount")}
        </a>
      </section>
    </main>
  );
}

function ActionButton({
  onClick,
  busy,
  disabled,
  primary,
  children
}: {
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
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
  onClick,
  primary,
  children
}: {
  href: string;
  onClick?: () => void;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
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
