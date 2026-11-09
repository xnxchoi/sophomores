"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { RPage } from "@/hideaway/components/UX/Transition";
import { submitEventGate, type GateActionState } from "./action";

/**
 * Day n Night gate.
 *
 * Renders when the layout server-component can't verify a valid
 * `event-gate.day-n-night` cookie. On submit the server action
 * constant-time compares against `events.gate_password` and, on match,
 * issues an HMAC-signed cookie for 30 days. The landing layout and
 * ticket route both verify it so unlocking the story does not dump the
 * visitor straight into checkout.
 *
 * Visual direction: editorial-mono, off-black canvas, no chrome. The
 * gate is intentionally low-noise — the user is here because someone
 * shared the code with them, so the page acts as a quiet doorway.
 */

const initialState: GateActionState = { ok: false };

export function DayNNightGate() {
  const t = useTranslations("Event.Gate");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    submitEventGate,
    initialState
  );

  // Belt-and-braces: the action's revalidatePath should be enough, but
  // a router.refresh() guarantees the new cookie is read by the layout
  // immediately. Cheap on success, no-op otherwise.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const errorKey = state.error;
  const errorMessage = errorKey
    ? errorKey === "missing"
      ? t("errors.missing")
      : errorKey === "no-event"
        ? t("errors.noEvent")
        : errorKey === "invalid"
          ? t("errors.invalid")
          : t("errors.generic")
    : null;

  return (
    <RPage type="pages" slug={["day-n-night", "gate"]}>
      <main className="relative flex min-h-screen w-full items-center justify-center bg-off-black px-6 text-off-white">
        <div className="w-full max-w-md">
          <p className="mb-3 font-sans text-[10px] tracking-[0.32em] text-off-white/65 uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="font-wide text-4xl leading-[1.05] font-light tracking-tight text-off-white xl:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed font-light text-off-white/75">
            {t("subtitle")}
          </p>

          <form action={formAction} className="mt-10">
            <label className="block">
              <span className="sr-only">{t("placeholder")}</span>
              <input
                type="password"
                name="password"
                required
                autoFocus
                autoComplete="off"
                spellCheck={false}
                maxLength={200}
                placeholder={t("placeholder")}
                className="w-full border-b border-off-white/30 bg-transparent pb-2 text-base font-light tracking-tight text-off-white placeholder:text-off-white/30 focus:border-off-white/70 focus:outline-none"
              />
            </label>

            {errorMessage ? (
              <p
                role="alert"
                aria-live="polite"
                className="mt-4 font-sans text-[11px] tracking-widest text-off-white/80 uppercase"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-7 border border-off-white/40 px-5 py-2.5 font-sans text-[11px] tracking-widest text-off-white/85 uppercase transition-colors hover:border-off-white hover:text-off-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? t("submitting") : t("submit")}
            </button>
          </form>

          <p className="mt-10 max-w-sm font-sans text-[10px] leading-relaxed tracking-widest text-off-white/45 uppercase">
            {t("hint")}
          </p>
          <p className="mt-3 max-w-sm font-sans text-[10px] leading-relaxed tracking-widest text-off-white/35 uppercase">
            {t("footer")}
          </p>
        </div>
      </main>
    </RPage>
  );
}
