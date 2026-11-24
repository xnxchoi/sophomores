"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import { domAnimation, LazyMotion, stagger } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { Button } from "@/components/core/ArcFocus/ArcFocus";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { useAccountSheetSubmit } from "@/components/auth/use-account-sheet";

/**
 * The page a member sees after tapping their card (owner, 22 Nov: "we should probably confirm ... just one step ...
 * very premium ... feels like an experience already"; concept C, "I like the light up part").
 *
 * The NFC lane owns the route and the private projection (GET and POST /nfc/[ref]); this view only renders its five
 * states. It shows no name, product or card reference. Unavailable also covers a card on another account, so the page
 * never reveals an owner. Confirm is one POST to /nfc/[formRef] carrying the opaque `confirmation`; the route answers with a
 * 303 to /welcome or the account page, so the light holds its confirming state for as long as that takes.
 *
 * The NFC root holds dark from the first byte. The card is designed separately.
 */
// Mirrors the NFC lane's projection (TapPageState in src/lib/nfc/tap-entry.ts on their branch): the route passes it
// straight through. The ref travels only as `formRef`, into the form action; `confirmation` only as the POST body field.
export type NfcTapState = "signed-out" | "ready" | "already-linked" | "stale" | "unavailable";
export type TapSignetState = "issued" | "pending" | "inactive" | "not-recorded" | "unavailable";
export type NfcTapView =
  | Readonly<{ state: "signed-out" | "stale" | "unavailable" }>
  | Readonly<{ state: "ready" | "already-linked"; signet: TapSignetState; formRef: string; confirmation: string }>;

const ease = [0.16, 1, 0.3, 1] as const;
const copyKey = {
  "signed-out": "signedOut",
  "signed-in": "signedIn",
  ready: "ready",
  "already-linked": "alreadyLinked",
  stale: "stale",
  unavailable: "unavailable"
} as const satisfies Record<NfcTapState | "signed-in", string>;

export function TapConfirm({ view }: { view: NfcTapView }) {
  const t = useTranslations("Customer.app_site_nfc_tap");
  // Sign in opens the in-place sheet over the tap. The tap's proof never travels through sign-in (NFC lane contract),
  // so this page can't continue afterwards: once signed in it says so and asks for a new tap (Review-A, 24 Nov).
  // Without JavaScript the form goes to the sign-in page (no next: the tap is not on the closed return list, so
  // sign-in ends at shop home).
  const [signedIn, setSignedIn] = useState(false);
  const openSignIn = useAccountSheetSubmit(useCallback(() => setSignedIn(true), []));
  const [confirming, setConfirming] = useState(false);
  // Set in the same event as the submit, so a second press before React re-renders can't send twice.
  const sent = useRef(false);
  // Back from the next page: the confirmation has likely been spent and the tap query is gone from the address, so
  // show the tap-again state rather than a Confirm that can no longer work.
  const [expired, setExpired] = useState(false);
  const liveView = view.state === "ready" || view.state === "already-linked" ? view : null;
  // Only a live page can have spent its confirmation; other states keep their own copy and next step.
  const state: NfcTapState = expired && liveView ? "stale" : view.state;
  const live = expired ? null : liveView;
  const key = copyKey[state === "signed-out" && signedIn ? "signed-in" : state];

  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setExpired(true);
      setConfirming(false);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (sent.current) {
      event.preventDefault();
      return;
    }
    sent.current = true;
    setConfirming(true);
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="overflow-x-clip bg-background text-foreground">
        <PageInset
          as="main"
          className="flex min-h-svh flex-col items-center justify-center pt-28 pb-16 text-center xl:pt-32"
        >
          <m.div
            initial="hidden"
            animate="shown"
            transition={{ delayChildren: stagger(0.09, { startDelay: 0.1 }) }}
            className="flex w-full flex-col items-center"
          >
            <Beat>
              <p className="text-[10px] tracking-[0.2em] text-foreground/45 uppercase xl:text-xs">
                {t("label")}
              </p>
            </Beat>
            <Beat>
              <h1 className="mt-3 text-[32px] leading-[1.08] font-light tracking-[-0.02em] text-balance xl:text-[44px]">
                {t(`${key}.title`)}
              </h1>
            </Beat>

            <Light lit={live !== null} confirming={confirming && live !== null} />

            <Beat>
              <p className="mx-auto max-w-[30ch] text-[15px] leading-[1.5] text-foreground/60 xl:text-base">
                {t(`${key}.line`)}
              </p>
            </Beat>

            {live && live.signet !== "unavailable" ? (
              <Beat className="mt-8 w-full max-w-sm">
                <dl className="flex justify-between border-y border-foreground/12 py-3 text-left text-[13px]">
                  <dt className="text-foreground/55">{t("membership")}</dt>
                  <dd>{t(`signet.${live.signet}`)}</dd>
                </dl>
              </Beat>
            ) : null}

            <Beat className="mt-12 w-full max-w-sm">
              {live ? (
                <form method="post" action={`/nfc/${live.formRef}`} onSubmit={submit}>
                  <input type="hidden" name="confirmation" value={live.confirmation} />
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    aria-disabled={confirming || undefined}
                    aria-busy={confirming || undefined}
                    className="w-full"
                  >
                    {confirming ? t("confirming") : t("confirm")}
                  </Button>
                </form>
              ) : state === "signed-out" && !signedIn ? (
                // Sign-in starts fresh: the tap link is never carried through it (NFC lane contract); the member taps again.
                <form method="get" action="/sign-in" onSubmit={openSignIn}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    {t("signIn")}
                  </Button>
                </form>
              ) : (
                <div className="flex justify-center gap-6">
                  {state === "unavailable" ? (
                    <QuietLink href="/me/settings/account">{t("account")}</QuietLink>
                  ) : null}
                  <QuietLink href="/help#help-contact">{t("help")}</QuietLink>
                </div>
              )}
            </Beat>
          </m.div>
        </PageInset>
      </div>
    </LazyMotion>
  );
}

// Small underlined text links for the states with nothing to confirm.
function QuietLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href}
      className="group/focus inline-flex min-h-12 items-center text-[13px] text-foreground/55 underline underline-offset-4 transition-colors hover:text-foreground">
      <FocusShape className="group-focus-visible/focus:outline-current">{children}</FocusShape>
    </a>
  );
}

// Text is readable before Motion hydrates (as the welcome card does); the light carries the reveal.
function Beat({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <m.div
      className={className}
      variants={{
        hidden: { opacity: 0.78, y: 9 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease } }
      }}
    >
      {children}
    </m.div>
  );
}

/**
 * The card's light, as one band. It draws out from the centre on arrival and then breathes while it waits.
 * Confirming dims the band's body a little so a brighter shimmer can travel along it, and lifts the halo: a calm hold
 * for as long as the POST takes, with no flash and no flood. A dim, short band stands for every state with nothing to
 * confirm.
 */
function Light({ lit, confirming }: { lit: boolean; confirming: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="relative my-14 flex h-10 w-full items-center justify-center xl:my-20"
    >
      <m.div
        className="absolute h-24 w-[min(70vw,60rem)] rounded-full bg-white opacity-0 blur-3xl"
        initial={{ opacity: 0, scaleY: 1 }}
        animate={
          confirming
            ? { opacity: [0.09, 0.17, 0.09], scaleY: 1.2 }
            : lit
              ? { opacity: [0.06, 0.1, 0.06], scaleY: 1 }
              : { opacity: 0.02, scaleY: 1 }
        }
        transition={
          confirming
            ? {
                opacity: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                scaleY: { duration: 1.2, ease }
              }
            : lit
              ? {
                  opacity: {
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  scaleY: { duration: 0.8, ease }
                }
              : { duration: 0.8, ease }
        }
      />
      {/* Arrival: drawn out from the centre and faded in together. The resting values are classes as well as Motion's
          initial, so the light is dim and still before hydration even under a CSP that blocks style attributes. */}
      <m.div
        className={
          lit
            ? "relative w-[min(62vw,56rem)] opacity-[0.22] [transform:scaleX(0.39)]"
            : "relative w-[min(24vw,12rem)] opacity-[0.22]"
        }
        initial={lit ? { scaleX: 0.39, opacity: 0.22 } : { scaleX: 1, opacity: 0.22 }}
        animate={{ scaleX: 1, opacity: lit ? 1 : 0.22 }}
        transition={{ duration: 0.9, ease }}
      >
        {/* Breathing, once drawn. */}
        <m.div
          className={
            confirming
              ? "relative h-[3px] overflow-hidden rounded-full transition-[background-color,box-shadow] duration-700 bg-white/70 shadow-[0_0_24px_6px_rgb(255_255_255/0.45),0_0_90px_30px_rgb(255_255_255/0.14)]"
              : lit
                ? "relative h-[3px] overflow-hidden rounded-full transition-[background-color,box-shadow] duration-700 bg-white shadow-[0_0_24px_6px_rgb(255_255_255/0.55),0_0_90px_30px_rgb(255_255_255/0.12)]"
                : "relative h-[3px] overflow-hidden rounded-full bg-white transition-[background-color,box-shadow] duration-700"
          }
          animate={
            lit && !confirming ? { opacity: [1, 0.8, 1] } : { opacity: 1 }
          }
          transition={
            lit && !confirming
              ? {
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.9
                }
              : { duration: 0.4, ease }
          }
        >
          {confirming ? (
            <m.div
              className="absolute inset-y-0 w-1/4 bg-[linear-gradient(90deg,transparent,white,transparent)]"
              initial={{ x: "-100%" }}
              animate={{ x: "400%" }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ) : null}
        </m.div>
      </m.div>
    </div>
  );
}
