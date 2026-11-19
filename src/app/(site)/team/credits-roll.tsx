"use client";

import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";
import { AnimatePresence, animate, useAnimationFrame, useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type FocusEvent, type Ref, type WheelEvent } from "react";
import type { TeamPerson } from "./team-credits";

export type CreditGroup = { role: string; people: TeamPerson[] };
type Select = (id: string) => void;

// Character values for the Hideaway Credits roll, tuned by feel: an unhurried drift,
// a wheel push that fades back out, and a gentle settle rather than a dead stop.
const DRIFT = 80;
const WHEEL_GAIN = 4;
const WHEEL_LIMIT = 1600;
const WHEEL_FADE = 0.04;
const SETTLE = { duration: 0.8, ease: [0.45, 0, 0.55, 1] } as const;
/** Where a keyboard-focused name comes to rest, as a share of the stage height. */
const FOCUS_LINE = 0.4;

// Mirrors the `pointer-fine:md:` variants that show the roll.
const ROLL_QUERY = "(pointer: fine) and (min-width: 48rem)";
const subscribeRollable = (onChange: () => void) => {
  const query = window.matchMedia(ROLL_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useRollable = () => useSyncExternalStore(subscribeRollable, () => window.matchMedia(ROLL_QUERY).matches, () => false);

export function CreditsRoll({ groups, viewing, onSelect, className }: {
  groups: CreditGroup[];
  viewing: boolean;
  onSelect: Select;
  className?: string;
}) {
  const t = useTranslations("Customer.app_site_team_page");
  const rollable = useRollable();
  const stage = useRef<HTMLDivElement>(null);
  const cap = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const throttle = useMotionValue(1);
  const phase = useRef(0);
  const period = useRef(0);
  const wheel = useRef(0);
  const focusPhase = useRef<number | null>(null);
  const [looping, setLooping] = useState(false);
  const [inside, setInside] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<TeamPerson | null>(null);
  // A still roster only reserves room for the portrait card when someone has a portrait.
  const portraits = groups.some((group) => group.people.some((person) => person.profilePic));

  useLayoutEffect(() => {
    const list = copy.current, limit = cap.current;
    if (!list || !limit) return;
    const measure = () => {
      // Fractional heights keep the seam exact; the probe carries the stage's CSS height cap.
      const height = list.getBoundingClientRect().height;
      period.current = height;
      // A roster shorter than the stage stays still: two passes would not cover the seam.
      const next = rollable && height > limit.getBoundingClientRect().height;
      if (!next) { phase.current = 0; y.set(0); }
      else phase.current %= height;
      setLooping(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [rollable, y]);

  useEffect(() => {
    if (viewing || focused) { throttle.jump(0); wheel.current = 0; return; }
    const settle = animate(throttle, inside || paused ? 0 : 1, SETTLE);
    return () => settle.stop();
  }, [focused, inside, paused, throttle, viewing]);

  useAnimationFrame((_, delta) => {
    const height = period.current;
    if (!looping || !height) return;
    // A hidden tab resumes with one long frame; cap it so the roll never lurches.
    const seconds = Math.min(delta, 64) / 1000;
    // Keyboard browsing holds the roll where the focused name was revealed.
    if (focusPhase.current !== null) return;
    wheel.current *= Math.pow(WHEEL_FADE, seconds);
    const next = phase.current + (DRIFT * throttle.get() + wheel.current) * seconds;
    phase.current = ((next % height) + height) % height;
    y.set(-phase.current);
  });

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    // Passive: the page keeps scrolling; the roll only borrows the gesture's energy.
    if (!looping || paused || viewing || focused || event.ctrlKey) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (stage.current?.clientHeight ?? 800) : 1;
    wheel.current = Math.max(-WHEEL_LIMIT, Math.min(WHEEL_LIMIT, wheel.current + event.deltaY * unit * WHEEL_GAIN));
  };

  const onNameFocus = (person: TeamPerson, name: HTMLButtonElement) => {
    setFocused(true);
    setPreview(person);
    if (!looping) return;
    // Reveal the focused button itself at once, inside the original pass, never its hidden
    // duplicate, so the focus ring is never clipped while the roll catches up.
    const room = stage.current?.clientHeight ?? 0;
    focusPhase.current = Math.max(0, name.offsetTop - room * FOCUS_LINE);
    phase.current = focusPhase.current;
    y.set(-phase.current);
  };
  const onTrackBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    focusPhase.current = null;
    setFocused(false);
    if (!inside) setPreview(null);
  };

  return (
    <div className={cn("relative", className)}>
      {looping && <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => { wheel.current = 0; setPaused((value) => !value); }}
          className="inline-flex min-h-12 items-center gap-3 rounded-full border border-border px-5 text-sm outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2"
        >
          {paused ? <Play aria-hidden="true" className="size-4" strokeWidth={1.5} /> : <Pause aria-hidden="true" className="size-4" strokeWidth={1.5} />}
          {paused ? t("playCredits") : t("pauseCredits")}
        </button>
      </div>}
      <div
        ref={stage}
        onPointerEnter={() => setInside(true)}
        onPointerLeave={() => { setInside(false); if (!focused) setPreview(null); }}
        onWheel={onWheel}
        className={cn("relative isolate overflow-clip", looping ? "h-[min(85svh,52rem)]" : portraits && "min-h-[32rem]")}
      >
        <div ref={cap} aria-hidden="true" className="pointer-events-none invisible absolute h-[min(85svh,52rem)] w-px" />
        <AnimatePresence initial={false}>
          {preview?.profilePic && <m.div
            key={preview.id}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <Image src={preview.profilePic.src} alt="" fill sizes="100vw" className="scale-110 object-cover blur-[15px]" />
          </m.div>}
        </AnimatePresence>
        <div className="grid h-full grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-10 lg:gap-16">
          <div
            onBlur={onTrackBlur}
            className={cn("relative h-full min-w-0", looping && "overflow-clip", looping && !focused && "[mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]")}
          >
            <m.div style={{ y }} className="relative">
              <RollCopy
                ref={copy}
                groups={groups}
                onSelect={(person) => onSelect(person.id)}
                onPreview={setPreview}
                onNameFocus={onNameFocus}
              />
              {looping && <RollCopy
                duplicate
                groups={groups}
                onSelect={(person) => onSelect(person.id)}
                onPreview={setPreview}
              />}
            </m.div>
          </div>
          <div aria-hidden="true" className="pointer-events-none relative min-w-0">
            <AnimatePresence initial={false}>
              {preview && <m.figure
                key={preview.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-6 right-0 w-full max-w-88"
              >
                {preview.profilePic && <div className="relative aspect-[0.88] overflow-hidden rounded-xl bg-muted">
                  <Image src={preview.profilePic.src} alt="" fill sizes="22rem" className="object-cover" />
                </div>}
                <figcaption className="mt-4">
                  <p className="text-3xl leading-tight tracking-tight break-words">{preview.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{preview.role}</p>
                </figcaption>
              </m.figure>}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One pass of the credits. The duplicate only fills the loop's seam: it is hidden from
 * assistive technology and is not focusable; its clicks open the same profile.
 */
function RollCopy({ ref, groups, duplicate = false, onSelect, onPreview, onNameFocus }: {
  ref?: Ref<HTMLDivElement>;
  groups: CreditGroup[];
  duplicate?: boolean;
  onSelect: (person: TeamPerson) => void;
  onPreview: (person: TeamPerson) => void;
  onNameFocus?: (person: TeamPerson, name: HTMLButtonElement) => void;
}) {
  const t = useTranslations("Customer.app_site_team_page");
  return (
    <div ref={ref} aria-hidden={duplicate || undefined} className="grid gap-y-12 pb-12">
      {groups.map((group) => (
        <div key={group.role} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-x-7">
          <h3 className="pt-3 text-right text-sm leading-6 text-muted-foreground">{group.role}</h3>
          <ul className="min-w-0">
            {group.people.map((person) => (
              <li key={person.id}>
                {duplicate ? (
                  // Pointer-only stand-in: not focusable, so focus never lands inside aria-hidden.
                  <div
                    onClick={() => onSelect(person)}
                    onPointerEnter={() => onPreview(person)}
                    className="relative flex min-h-12 w-full cursor-pointer items-center text-[clamp(1.25rem,1.6vw,1.875rem)] leading-none tracking-tight break-words before:absolute before:top-1/2 before:-left-5 before:size-2 before:-translate-y-1/2 before:rounded-full before:bg-current before:opacity-0 before:transition-opacity before:content-[''] hover:before:opacity-100"
                  >
                    {person.name}
                  </div>
                ) : (
                  <button
                    type="button"
                    data-credit-id={person.id}
                    onClick={() => onSelect(person)}
                    onPointerEnter={() => onPreview(person)}
                    onFocus={onNameFocus ? (event) => onNameFocus(person, event.currentTarget) : undefined}
                    className="relative flex min-h-12 w-full items-center text-left text-[clamp(1.25rem,1.6vw,1.875rem)] leading-none tracking-tight break-words outline-offset-4 before:absolute before:top-1/2 before:-left-5 before:size-2 before:-translate-y-1/2 before:rounded-full before:bg-current before:opacity-0 before:transition-opacity before:content-[''] hover:before:opacity-100 focus-visible:outline-2 focus-visible:before:opacity-100"
                  >
                    {person.name}<span className="sr-only">. {t("viewProfile")}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Touch, narrow screens: the same credits as a still list, each name opening the profile viewer. */
export function CreditsList({ groups, onSelect, className }: {
  groups: CreditGroup[];
  onSelect: Select;
  className?: string;
}) {
  const t = useTranslations("Customer.app_site_team_page");
  return (
    <div className={cn("grid gap-10", className)}>
      {groups.map((group) => (
        <div key={group.role}>
          <h3 className="text-sm text-muted-foreground">{group.role}</h3>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {group.people.map((person, index) => (
              <m.li key={person.id} initial={{ y: 12 }} whileInView={{ y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}>
                <button
                  type="button"
                  data-credit-id={person.id}
                  onClick={() => onSelect(person.id)}
                  className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 text-left outline-offset-4 focus-visible:outline-2"
                >
                  <span className="min-w-0 text-2xl leading-tight tracking-tight break-words">{person.name}<span className="sr-only">. {t("viewProfile")}</span></span>
                  <span aria-hidden="true" className="text-muted-foreground">-&gt;</span>
                </button>
              </m.li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
