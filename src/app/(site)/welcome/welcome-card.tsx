"use client";

import { useEffect, useRef, useTransition } from "react";
import { motion, stagger, type Variants } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/components/core/Link/Link";
import { Button } from "@/components/ui/button";
import type { MemberWelcomeView } from "@/lib/member-auth/welcome/read";

const arrival: Variants = {
  initial: {},
  arrived: { transition: { delayChildren: stagger(0.13, { startDelay: 0.08 }) } }
};
const beat: Variants = {
  // Keep the server-rendered content readable before Motion hydrates.
  initial: { opacity: 0.78, y: 9 },
  arrived: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1] } }
};
const settle = { type: "spring", visualDuration: 0.38, bounce: 0 } as const;

export function WelcomeCard({ view }: { view: MemberWelcomeView }) {
  const t = useTranslations("Customer.components_membership_welcome");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const retryRequested = useRef(false);
  const status = useRef<HTMLDivElement>(null);
  const canRetry = view.state === "unavailable" || (view.state === "verified" && view.wallet === "unavailable");
  const display = view.state === "verified"
    ? t(view.wallet === "recorded" ? "walletRecorded" : view.wallet === "not-recorded" ? "walletNotRecorded" : "walletUnavailable")
    : view.state === "signed-out" ? t("returnAfterSignIn")
    : view.state === "unavailable" ? t("unavailable")
    : view.state === "restricted" ? t("restricted")
    : t("unverified");

  useEffect(() => {
    if (pending || !retryRequested.current) return;
    retryRequested.current = false;
    if (!canRetry && document.activeElement === document.body) status.current?.focus();
  }, [canRetry, pending]);

  return <motion.main variants={arrival} initial="initial" animate="arrived"
    className="mx-auto min-h-[70svh] max-w-3xl px-6 pt-32 pb-24 text-foreground sm:px-10 sm:pt-40">
    <motion.header variants={beat} className="mb-12 border-b border-border pb-10">
      <h1 className="font-heading text-3xl tracking-tight sm:text-5xl">{t("title")}</h1>
    </motion.header>
    <motion.section variants={arrival} layout="size" transition={{ layout: settle }} aria-label={t("membership")}
      className="space-y-5 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-8">
      <motion.div variants={beat} layout="position" transition={{ layout: settle }}>
        <div ref={status} role="status" aria-atomic="true" tabIndex={-1} className="rounded-sm outline-offset-4">
          {view.state === "verified" ? <dl className="border-y border-border text-sm">
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
              <dt>{t("walletRecord")}</dt>
              <dd className="text-muted-foreground">{pending ? t("checking") : display}</dd>
            </div>
          </dl> : <p className="max-w-prose text-sm leading-6 text-muted-foreground">{pending ? t("checking") : display}</p>}
        </div>
      </motion.div>

      <motion.div variants={beat} layout="position" transition={{ layout: settle }} className="space-y-3">
        {canRetry && <Button type="button" variant="outline" aria-disabled={pending} aria-busy={pending}
          className="min-h-12 aria-disabled:opacity-60" onClick={() => {
            if (pending || retryRequested.current) return;
            retryRequested.current = true;
            startTransition(() => router.refresh());
          }}>{pending ? t("checking") : t("tryAgain")}</Button>}
        {view.state === "signed-out" && <Link href="/account" prefetch={false}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-80">
          {t("signIn")}
        </Link>}
        {view.state === "restricted" && <Link href="/help#help-contact"
          className="inline-flex min-h-12 items-center text-sm underline underline-offset-4">{t("help")}</Link>}
        {view.state === "unverified" && <Link href="/me/settings/account" prefetch={false}
          className="inline-flex min-h-12 items-center text-sm underline underline-offset-4">{t("account")}</Link>}
        {view.state === "verified" && <>
          {view.passkeyAvailable && <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">{t("passkeyOptional")}</p>
            <Link href="/me/settings/security" prefetch={false}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-80">{t("passkeySettings")}</Link>
          </div>}
          <Link href="/me" prefetch={false} className="inline-flex min-h-12 items-center text-sm underline underline-offset-4">{t("account")}</Link>
        </>}
      </motion.div>
    </motion.section>
  </motion.main>;
}
