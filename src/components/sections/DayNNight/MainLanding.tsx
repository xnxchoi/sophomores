"use client";

import { Link } from "@/components/core/Link/Link";
import { cn } from "@/lib/utils";
import { useLenis } from "lenis/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { FriendsTorrent } from "./Immersive/FriendsTorrent";
import { useRuntimeFriendsPhotos } from "./friendsPhotos";

export type DayNNightRsvpState = "none" | "pending" | "confirmed";

type DayNNightMainPageProps = {
  rsvpCount: number;
  rsvpState: DayNNightRsvpState;
  guestNames: string[];
};

const NAV_KEYS = ["intro", "details", "friends", "music", "rsvp"] as const;
const OFFERING_KEYS = [
  "potatoes",
  "grill",
  "pasta",
  "ferments",
  "cocktails",
  "nonAlcoholic"
] as const;

export function DayNNightFollowupSections({
  rsvpCount,
  rsvpState,
  guestNames
}: DayNNightMainPageProps) {
  const t = useTranslations("Event.DayNNight.main");

  return (
    <main className="relative isolate overflow-hidden bg-[oklch(8%_0.024_270)] text-[var(--dn-fg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        style={{
          background: [
            "radial-gradient(circle at 18% 12%, oklch(31% 0.07 255 / 0.42), transparent 34%)",
            "radial-gradient(circle at 82% 4%, oklch(38% 0.085 45 / 0.32), transparent 36%)",
            "linear-gradient(180deg, oklch(8% 0.024 270), oklch(6.5% 0.018 255) 48%, oklch(7% 0.022 38))"
          ].join(", ")
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: "url('/assets/papier.png')",
          backgroundSize: "220px 220px"
        }}
      />

      <SectionFrame id="details" eyebrow={t("details.eyebrow")}>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="grid content-start gap-6">
            <h2 className="font-serif text-[clamp(3.4rem,8vw,7.5rem)] leading-[0.88] font-bold tracking-[-0.045em] text-white">
              {t("details.title")}
            </h2>
            <p className="max-w-[34ch] text-base leading-relaxed text-white/68">
              {t("details.body")}
            </p>
            <dl className="grid gap-4 border-t border-white/18 pt-6 font-sans text-sm text-white/72">
              <Fact
                label={t("details.themeLabel")}
                value={t("details.theme")}
              />
              <Fact
                label={t("details.dressLabel")}
                value={t("details.dress")}
              />
              <Fact label={t("details.timeLabel")} value={t("details.time")} />
              <Fact
                label={t("details.locationLabel")}
                value={t("details.location")}
              />
              <Fact
                label={t("details.contactLabel")}
                value={t("details.contact")}
              />
              <Fact
                label={t("details.priceLabel")}
                value={t("details.price")}
              />
            </dl>
          </div>
          <div className="grid gap-3">
            {OFFERING_KEYS.map((key) => (
              <OfferingRow
                key={key}
                label={t(`offerings.${key}.label`)}
                body={t(`offerings.${key}.body`)}
              />
            ))}
          </div>
        </div>
      </SectionFrame>

      <SectionFrame id="friends" eyebrow={t("friends.eyebrow")} fullBleed>
        <ScrollSyncedFriends />
      </SectionFrame>

      <SectionFrame id="music" eyebrow={t("music.eyebrow")}>
        <div className="grid min-h-[72svh] gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="grid gap-7">
            <p className="font-sans text-[10px] tracking-[0.32em] text-white/55 uppercase">
              {t("music.kicker")}
            </p>
            <h2 className="font-serif text-[clamp(4rem,10vw,10rem)] leading-[0.8] font-bold tracking-[-0.055em] text-white">
              YM.FM
            </h2>
            <p className="max-w-[36ch] text-lg leading-relaxed text-white/72">
              {t("music.body")}
            </p>
          </div>
          <div className="grid aspect-[4/5] content-end overflow-hidden border border-white/18 bg-white/[0.045] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.4)]">
            <p className="font-sans text-[10px] tracking-[0.26em] text-white/45 uppercase">
              {t("music.assetNote")}
            </p>
          </div>
        </div>
      </SectionFrame>

      <section id="rsvp" className="relative z-10 min-h-svh overflow-hidden">
        <RsvpSection
          rsvpCount={rsvpCount}
          rsvpState={rsvpState}
          guestNames={guestNames}
        />
      </section>
    </main>
  );
}

export function DayNNightMainPage({
  rsvpCount,
  rsvpState,
  guestNames
}: DayNNightMainPageProps) {
  const t = useTranslations("Event.DayNNight.main");

  return (
    <main className="relative min-h-svh overflow-hidden bg-[oklch(8%_0.024_270)] text-[var(--dn-fg)]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        style={{
          background: [
            "radial-gradient(circle at 18% 12%, oklch(31% 0.07 255 / 0.42), transparent 34%)",
            "radial-gradient(circle at 82% 4%, oklch(38% 0.085 45 / 0.32), transparent 36%)",
            "linear-gradient(180deg, oklch(8% 0.024 270), oklch(6.5% 0.018 255) 48%, oklch(7% 0.022 38))"
          ].join(", ")
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: "url('/assets/papier.png')",
          backgroundSize: "220px 220px"
        }}
      />

      <LandingChrome />
      <section
        id="intro"
        className="relative z-10 min-h-svh px-6 py-24 xl:px-10"
      >
        <div className="mx-auto grid min-h-[calc(100svh-12rem)] max-w-7xl grid-rows-[auto_1fr_auto]">
          <div className="flex items-start justify-between gap-4 font-sans text-[10px] tracking-[0.24em] text-white/55 uppercase">
            <span>{t("intro.date")}</span>
            <span>{t("intro.place")}</span>
          </div>
          <div className="grid content-center gap-7">
            <p className="font-sans text-[10px] tracking-[0.32em] text-white/60 uppercase">
              {t("intro.eyebrow")}
            </p>
            <h1 className="max-w-[9ch] font-serif text-[clamp(5.2rem,16vw,16rem)] leading-[0.76] font-bold tracking-[-0.055em] text-white">
              Day
              <br />n Night
            </h1>
            <p className="max-w-[34ch] font-serif text-[clamp(1.3rem,2vw,2rem)] leading-[1.3] text-white/72 italic">
              {t("intro.lede")}
            </p>
          </div>
          <div className="grid gap-4 border-t border-white/18 pt-5 font-sans text-[10px] tracking-[0.22em] text-white/58 uppercase sm:grid-cols-3">
            <span>{t("intro.theme")}</span>
            <span>{t("intro.price")}</span>
            <span>{t("intro.hosts")}</span>
          </div>
        </div>
      </section>

      <SectionFrame id="details" eyebrow={t("details.eyebrow")}>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="grid content-start gap-6">
            <h2 className="font-serif text-[clamp(3.4rem,8vw,7.5rem)] leading-[0.88] font-bold tracking-[-0.045em] text-white">
              {t("details.title")}
            </h2>
            <p className="max-w-[34ch] text-base leading-relaxed text-white/68">
              {t("details.body")}
            </p>
            <dl className="grid gap-4 border-t border-white/18 pt-6 font-sans text-sm text-white/72">
              <Fact
                label={t("details.themeLabel")}
                value={t("details.theme")}
              />
              <Fact
                label={t("details.dressLabel")}
                value={t("details.dress")}
              />
              <Fact label={t("details.timeLabel")} value={t("details.time")} />
              <Fact
                label={t("details.locationLabel")}
                value={t("details.location")}
              />
              <Fact
                label={t("details.contactLabel")}
                value={t("details.contact")}
              />
              <Fact
                label={t("details.priceLabel")}
                value={t("details.price")}
              />
            </dl>
          </div>
          <div className="grid gap-3">
            {OFFERING_KEYS.map((key) => (
              <OfferingRow
                key={key}
                label={t(`offerings.${key}.label`)}
                body={t(`offerings.${key}.body`)}
              />
            ))}
          </div>
        </div>
      </SectionFrame>

      <SectionFrame id="friends" eyebrow={t("friends.eyebrow")} fullBleed>
        <ScrollSyncedFriends />
      </SectionFrame>

      <SectionFrame id="music" eyebrow={t("music.eyebrow")}>
        <div className="grid min-h-[72svh] gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="grid gap-7">
            <p className="font-sans text-[10px] tracking-[0.32em] text-white/55 uppercase">
              {t("music.kicker")}
            </p>
            <h2 className="font-serif text-[clamp(4rem,10vw,10rem)] leading-[0.8] font-bold tracking-[-0.055em] text-white">
              YM.FM
            </h2>
            <p className="max-w-[36ch] text-lg leading-relaxed text-white/72">
              {t("music.body")}
            </p>
          </div>
          <div className="grid aspect-[4/5] content-end overflow-hidden border border-white/18 bg-white/[0.045] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.4)]">
            <p className="font-sans text-[10px] tracking-[0.26em] text-white/45 uppercase">
              {t("music.assetNote")}
            </p>
          </div>
        </div>
      </SectionFrame>

      <section id="rsvp" className="relative z-10 min-h-svh overflow-hidden">
        <RsvpSection
          rsvpCount={rsvpCount}
          rsvpState={rsvpState}
          guestNames={guestNames}
        />
      </section>
    </main>
  );
}

function LandingChrome() {
  const t = useTranslations("Event.DayNNight.main");
  const lenis = useLenis();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 px-4 py-4 text-white sm:px-6 xl:px-10">
      <Link
        href="/public"
        className="rounded-full border border-white/15 bg-black/25 px-3.5 py-2 font-sans text-[10px] tracking-[0.22em] text-white/65 uppercase backdrop-blur-xl transition-colors hover:text-white"
      >
        ← Hideaway
      </Link>
      <div className="hidden items-center gap-2 rounded-full border border-white/12 bg-black/20 px-2 py-1.5 backdrop-blur-xl md:flex">
        {NAV_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => lenis?.scrollTo(`#${key}`)}
            className="rounded-full px-3 py-1.5 font-sans text-[9px] tracking-[0.2em] text-white/55 uppercase transition-colors hover:bg-white/10 hover:text-white"
          >
            {t(`nav.${key}`)}
          </button>
        ))}
      </div>
      <Link
        href="/tickets/day-n-night"
        className="rounded-full border border-white/35 bg-white px-4 py-2 font-sans text-[10px] tracking-[0.22em] text-black uppercase transition-transform hover:-translate-y-px"
      >
        {t("nav.rsvp")}
      </Link>
    </nav>
  );
}

function SectionFrame({
  id,
  eyebrow,
  children,
  fullBleed = false
}: {
  id: string;
  eyebrow: string;
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <section
      id={id}
      className="relative z-10 min-h-svh scroll-mt-12 border-t border-white/10 px-6 py-24 xl:px-10 xl:py-32"
    >
      <div
        className={cn(fullBleed ? "mx-auto max-w-none" : "mx-auto max-w-7xl")}
      >
        <p className="mb-10 font-sans text-[10px] tracking-[0.28em] text-white/48 uppercase">
          {eyebrow}
        </p>
        {children}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-4 border-b border-white/10 pb-3">
      <dt className="font-sans text-[10px] tracking-[0.18em] text-white/42 uppercase">
        {label}
      </dt>
      <dd className="m-0 text-white/76">{value}</dd>
    </div>
  );
}

function OfferingRow({ label, body }: { label: string; body: string }) {
  return (
    <article className="grid gap-3 border-t border-white/14 py-5 lg:grid-cols-[10rem_1fr]">
      <h3 className="m-0 font-serif text-2xl leading-none font-bold tracking-[-0.025em] text-white">
        {label}
      </h3>
      <p className="m-0 max-w-[58ch] text-sm leading-relaxed text-white/68 xl:text-base">
        {body}
      </p>
    </article>
  );
}

function ScrollSyncedFriends() {
  const t = useTranslations("Event.DayNNight.main");
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const friendsPhotos = useRuntimeFriendsPhotos();

  const updateProgress = () => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const travel = window.innerHeight + rect.height;
    const next = Math.max(
      0,
      Math.min(1, (window.innerHeight - rect.top) / travel)
    );
    setProgress(next);
  };

  useLenis(() => updateProgress());

  useEffect(() => {
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div ref={ref} className="relative min-h-[82svh] overflow-hidden">
      <div className="absolute inset-x-0 top-8 z-10 px-6 xl:px-10">
        <h2 className="max-w-[11ch] font-serif text-[clamp(3.2rem,8vw,8rem)] leading-[0.84] font-bold tracking-[-0.05em] text-white">
          {t("friends.title")}
        </h2>
        <p className="mt-5 font-sans text-[11px] tracking-[0.12em] text-white/62">
          {t("friends.caption")}
        </p>
      </div>
      <div
        className="absolute top-[34%] left-0 flex gap-4 will-change-transform md:gap-6"
        style={{
          transform: `translate3d(${24 - progress * 34}vw, 0, 0)`
        }}
      >
        {[...friendsPhotos, ...friendsPhotos.slice(0, 6)].map((photo, i) => (
          <Image
            key={`${photo.src}-${i}`}
            src={photo.src}
            alt={photo.alt ?? ""}
            width={720}
            height={480}
            sizes="(min-width: 1280px) 26vw, (min-width: 768px) 34vw, 52vw"
            className="h-[34svh] w-[52vw] shrink-0 object-cover shadow-[0_22px_80px_rgba(0,0,0,0.45)] md:h-[44svh] md:w-[34vw] xl:w-[26vw]"
            style={{
              transform: `translateY(${(i % 3) * 22}px) rotate(${(i % 2 ? 1 : -1) * 1.5}deg)`
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RsvpSection({
  rsvpCount,
  rsvpState,
  guestNames
}: DayNNightMainPageProps) {
  const isCredits = rsvpCount >= 10;
  return isCredits ? (
    <CreditsRsvp rsvpState={rsvpState} guestNames={guestNames} />
  ) : (
    <TorrentRsvp rsvpState={rsvpState} />
  );
}

function TorrentRsvp({ rsvpState }: { rsvpState: DayNNightRsvpState }) {
  const t = useTranslations("Event.DayNNight.main");
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const friendsPhotos = useRuntimeFriendsPhotos();

  const updateProgress = () => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const next = Math.max(
      0,
      Math.min(1, (window.innerHeight - rect.top) / rect.height)
    );
    setProgress(next);
  };
  useLenis(() => updateProgress());

  if (rsvpState === "confirmed") return <ConfirmedRsvp />;

  const cta = rsvpState === "pending" ? t("rsvp.checkStatus") : t("rsvp.cta");
  const href =
    rsvpState === "pending" ? "/day-n-night/my" : "/tickets/day-n-night";

  return (
    <div ref={ref} className="relative min-h-svh overflow-hidden">
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `scale(${1.08 - progress * 0.14})`,
          filter: "blur(1px) brightness(0.55)"
        }}
      >
        <FriendsTorrent
          photos={friendsPhotos}
          active
          darkenOpacity={0.68}
          className="absolute inset-0"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage: "url('/assets/papier.png')",
          backgroundSize: "190px 190px"
        }}
      />
      <div className="relative z-10 grid min-h-svh content-end justify-items-center px-6 pb-20 text-center">
        <m.h2
          initial={{ opacity: 0, y: 52 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-[clamp(4.5rem,14vw,13rem)] leading-[0.78] font-bold tracking-[-0.055em] text-white"
        >
          RSVP
        </m.h2>
        <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-white/68">
          {rsvpState === "pending" ? t("rsvp.pendingBody") : t("rsvp.body")}
        </p>
        <ReactiveRsvpButton href={href}>{cta}</ReactiveRsvpButton>
      </div>
    </div>
  );
}

function CreditsRsvp({
  rsvpState,
  guestNames
}: {
  rsvpState: DayNNightRsvpState;
  guestNames: string[];
}) {
  const t = useTranslations("Event.DayNNight.main");
  const [overlay, setOverlay] = useState(false);
  const needsOverlay = rsvpState !== "confirmed";

  useEffect(() => {
    if (!needsOverlay) return;
    const id = window.setTimeout(() => setOverlay(true), 3000);
    return () => window.clearTimeout(id);
  }, [needsOverlay]);

  if (rsvpState === "confirmed") return <ConfirmedRsvp />;

  const names = guestNames.length
    ? guestNames
    : ["Sean Choi", "In Gyu Choe", "YM.FM", "The Hideaway"];
  const cta = rsvpState === "pending" ? t("rsvp.checkStatus") : t("rsvp.cta");
  const href =
    rsvpState === "pending" ? "/day-n-night/my" : "/tickets/day-n-night";

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden px-6 py-24">
      <div
        className="blur-0 absolute inset-0 flex flex-col items-center justify-center gap-6 opacity-80 transition-[filter,opacity] duration-700 data-[blur=true]:opacity-55 data-[blur=true]:blur-[1px]"
        data-blur={overlay ? "true" : "false"}
      >
        <div className="animate-[dnCreditsRoll_28s_linear_infinite] text-center font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.95] font-bold tracking-[-0.045em] text-white">
          {[...names, ...names, ...names].map((name, i) => (
            <div key={`${name}-${i}`} className="py-2">
              {name}
            </div>
          ))}
        </div>
      </div>
      {overlay ? (
        <div className="relative z-10 grid justify-items-center text-center">
          <h2 className="font-serif text-[clamp(4rem,12vw,11rem)] leading-[0.78] font-bold tracking-[-0.055em] text-white">
            RSVP
          </h2>
          <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-white/68">
            {rsvpState === "pending" ? t("rsvp.pendingBody") : t("rsvp.body")}
          </p>
          <ReactiveRsvpButton href={href}>{cta}</ReactiveRsvpButton>
        </div>
      ) : null}
    </div>
  );
}

function ReactiveRsvpButton({
  href,
  children
}: {
  href: string;
  children: ReactNode;
}) {
  const [pos, setPos] = useState({ x: 50, y: 50 });

  return (
    <Link
      href={href}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPos({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100
        });
      }}
      className="mt-8 inline-flex h-14 min-w-44 items-center justify-center rounded-full border border-white/50 bg-white px-7 font-sans text-[11px] tracking-[0.24em] text-black uppercase shadow-[0_0_45px_oklch(60%_0.12_50/0.45)] transition-transform hover:-translate-y-1"
      style={{
        background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, oklch(76% 0.13 48), white 34%, oklch(70% 0.11 255) 120%)`
      }}
    >
      {children}
    </Link>
  );
}

function ConfirmedRsvp() {
  const bits = useMemo(
    () =>
      Array.from({ length: 42 }).map((_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 11) * 0.13}s`,
        duration: `${2.8 + (i % 5) * 0.18}s`
      })),
    []
  );

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden px-6 text-center">
      {bits.map((bit, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute top-[-12px] h-2.5 w-1.5 animate-[dnConfetti_3.2s_linear_infinite] bg-white/80"
          style={{
            left: bit.left,
            animationDelay: bit.delay,
            animationDuration: bit.duration
          }}
        />
      ))}
      <h2 className="font-serif text-[clamp(4.2rem,13vw,13rem)] leading-[0.78] font-bold tracking-[-0.06em] text-white [text-shadow:0_0_22px_oklch(70%_0.11_255/0.36),0_18px_60px_rgba(0,0,0,0.45)]">
        SEE YOU
        <br />
        SOON
      </h2>
    </div>
  );
}
