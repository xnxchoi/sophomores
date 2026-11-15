"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { subscribeVisibility } from "@/utils/browser/visibility";
import type { WalletActivationView } from "@/lib/member-auth/wallet/read";

/** Set by the activation page when it sends a member to sign in, so the account page knows to look again. */
export const WALLET_ACTIVATION_RETURN_KEY = "sphmrs:wallet-activation-return";
const RECHECK_MS = 4_000;
const RECHECK_FOR_MS = 10 * 60_000;
const actionable = (view: WalletActivationView) =>
  view.state === "activation_required" || view.state === "approval_pending";

function returning(): boolean {
  try {
    return window.sessionStorage.getItem(WALLET_ACTIVATION_RETURN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Entry to activation, shown only while the member still has activation to
 * do: in the signed-in account view (it mounts after sign-in, so it reads the
 * new session's state) and on the shop order confirmation. The state is read
 * in the browser, so the account page loads no session or database code. It
 * is also re-checked on focus, and briefly on an interval for a member sent
 * here by the activation page.
 */
export function WalletActivationLink() {
  const t = useTranslations("Customer.components_commerce_wallet_activation");
  const [view, setView] = useState<WalletActivationView | null>(null);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const started = Date.now();
    const check = async () => {
      try {
        const response = await fetch("/api/member/wallet/status", {
          credentials: "same-origin",
          cache: "no-store",
          signal: AbortSignal.timeout(15_000)
        });
        const result = (await response.json()) as {
          success?: boolean;
          data?: WalletActivationView;
        };
        if (active && response.ok && result.success && result.data) {
          setView(result.data);
          if (result.data.state !== "signed_out")
            try {
              window.sessionStorage.removeItem(WALLET_ACTIVATION_RETURN_KEY);
            } catch {
              /* storage is optional */
            }
        }
      } catch {
        /* the link simply stays as it was */
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (active && returning() && Date.now() - started < RECHECK_FOR_MS)
        timer = window.setTimeout(() => {
          void check().then(schedule);
        }, RECHECK_MS);
    };
    const visible = () => {
      if (document.visibilityState !== "hidden") void check();
    };
    void check().then(schedule);
    window.addEventListener("focus", visible);
    const unsubscribe = subscribeVisibility(visible);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.removeEventListener("focus", visible);
      unsubscribe();
    };
  }, []);

  if (!view || !actionable(view)) return null;
  return (
    <div role="group" aria-label={t("accountLink")} className="space-y-3">
      <p className="text-sm leading-6 text-neutral-300">
        {t("accountLinkBody")}
      </p>
      <a
        href="/account/activate"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-neutral-100 px-5 py-3 text-sm font-medium text-neutral-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100"
      >
        {t("accountLink")}
      </a>
    </div>
  );
}
