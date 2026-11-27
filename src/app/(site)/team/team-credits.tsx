"use client";
import { Button } from "@/components/core/Button";

import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { useScrollLock } from "@/components/shell/site-scroll";
import { linkable } from "@/lib/content/team-profile-link";
import type { CreditSlot } from "@/lib/content/slots";
import { cn } from "@/lib/utils";
import { FloatingFocusManager, useFloating } from "@floating-ui/react";
import { AnimatePresence, animate, useAnimationFrame, useIsPresent, useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FocusEvent } from "react";
import { CreditConfetti } from "@/components/sections/credit-confetti";

export type TeamPerson = Pick<CreditSlot, "id" | "name" | "role" | "bio" | "href" | "patronage" | "profilePic">;
type CreditGroup = { role: string; people: TeamPerson[] };

/**
 * The Team page, ported from The Hideaway's credits (src/hideaway/components/sections/Credits/index.tsx), the
 * whole page as it was there (owner, 19 Nov). Desktop: the credits drift upward in a loop, the wheel pushes
 * them, hovering the list eases them to a stop, hovering a name shows its portrait and a blurred ground, and
 * clicking focuses the portrait with the profile card. Phones: a still list; tapping a name opens a
 * full-screen, snap-scrolling row of profiles with a round close button. Patrons get a cake after their name
 * and confetti when their profile opens.
 *
 * Two Hideaway details are made to work as intended rather than copied as broken: the cake (its CSS matched
 * `birthday` while the markup set `birthDay`) and the confetti (its trigger chained on a setter's undefined
 * return, and its canvas had zero size); the confetti is the site's existing port of it (CreditConfetti). Names are buttons so the list works from the keyboard; they look
 * exactly like the original text.
 */

// The Hideaway numbers: a per-frame drift of dt/12 px, the wheel's push eased in by 1 - 0.9^dt, and a
// 0.8 s power2.inOut ease to and from a stop on hover. The Hideaway switches behaviour below 640px
// (MiddleMan's MOBILE_BREAKPOINT) and layout below 768px (md), so a 640-767px window has the phone layout
// with the desktop roll, as it did there.
const DRIFT_DIVISOR = 12;
const WHEEL_EASE = 0.9;
const STOP = { duration: 0.8, ease: [0.45, 0, 0.55, 1] } as const;
const PHONE_QUERY = "(width < 640px)";
const subscribePhone = (onChange: () => void) => {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const usePhone = () => useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);

function groupByRole(people: ReadonlyArray<TeamPerson>): CreditGroup[] {
  const groups = new Map<string, CreditGroup>();
  people.forEach((person) => {
    const group = groups.get(person.role) ?? { role: person.role, people: [] };
    group.people.push(person);
    groups.set(person.role, group);
  });
  return [...groups.values()];
}

export function TeamCredits({ people }: { people: ReadonlyArray<TeamPerson> }) {
  const t = useTranslations("Customer.team");
  const groups = useMemo(() => groupByRole(people), [people]);
  const ordered = useMemo(() => groups.flatMap((group) => group.people), [groups]);
  const phone = usePhone();
  // Each patron profile that opens fires one burst of the shared credits confetti.
  const [burst, setBurst] = useState(0);
  const [active, setActive] = useState<TeamPerson | null>(null);
  const [focused, setFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // The name that opened the current view.
  const [opener, setOpener] = useState<HTMLButtonElement | null>(null);
  // The name that gets focus back once a closed view has let go of the page (see the effect below).
  const [returnTo, setReturnTo] = useState<HTMLButtonElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set while closing hands focus back to the name, so that focus doesn't reopen what was just closed.
  const returning = useRef(false);
  const lastBurst = useRef(Number.NEGATIVE_INFINITY);
  // Crossing the breakpoint swaps the focus view for the phone row (or back): close whichever was open, so
  // nothing stays held, pointer-disabled or scroll-locked for a view that is gone.
  const [lastPhone, setLastPhone] = useState(phone);
  if (phone !== lastPhone) {
    setLastPhone(phone);
    if (focused || mobileOpen) {
      setFocused(false);
      setMobileOpen(false);
      setActive(null);
      setReturnTo(opener);
    }
  }

  // Hideaway's intent: a patron's portrait (desktop hover or focus, phone open) throws confetti, and a new
  // burst never restarts one that is still falling.
  const celebrate = (person: TeamPerson) => {
    if (!person.patronage || performance.now() - lastBurst.current < 4000) return;
    lastBurst.current = performance.now();
    setBurst((count) => count + 1);
  };
  const show = (person: TeamPerson) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (active?.id !== person.id) celebrate(person);
    setActive(person);
  };
  // Leaving a name hides its portrait after 200 ms, as in The Hideaway, unless the portrait is focused. On
  // phones nothing hides on leave (Hideaway's `isMobile ||` guard): a tap's pointerleave must not clear the
  // open row's ground.
  const scheduleHide = () => {
    if (focused || phone || mobileOpen) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setActive(null), 200);
  };
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const select = (person: TeamPerson, button: HTMLButtonElement) => {
    setOpener(button);
    show(person);
    if (phone) setMobileOpen(true);
    else setFocused(true);
  };
  const closeFocus = () => {
    setFocused(false);
    setActive(null);
    setReturnTo(opener);
  };
  const closeMobile = () => {
    setMobileOpen(false);
    setActive(null);
    setReturnTo(opener);
  };
  // The open view keeps the rest of the page inert; its focus manager lets go in the same commit that closes
  // it, before this effect runs, so the name can take focus again. The roll is clipped, so focusing it must
  // not scroll it.
  useEffect(() => {
    if (!returnTo) return;
    returning.current = true;
    if (returnTo.isConnected) returnTo.focus({ preventScroll: true });
    returning.current = false;
    setReturnTo(null);
  }, [returnTo]);
  // Released on close, on a breakpoint change (above) and on unmount (the hook's cleanup).
  useScrollLock(mobileOpen);
  useEffect(() => {
    if (!focused && !mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (focused) closeFocus();
      else closeMobile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <main className="relative h-svh overflow-hidden bg-carbon-deep text-(--white) max-md:mb-[70px] max-md:h-auto max-md:min-h-svh max-md:overflow-visible max-md:px-0 max-md:pt-[110px]">
      <h1 className="sr-only">{t("title")}</h1>

      {/* Blurred ground of the shown profile. */}
      <div aria-hidden="true" className={cn("pointer-events-none fixed inset-0", mobileOpen && "z-1 scale-120")}>
        <AnimatePresence initial={false}>
          {active?.profilePic && <m.div
            key={active.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5, transition: { type: "tween", ease: "easeIn", duration: 0.2, delay: 0.1 } }}
            exit={{ opacity: 0, transition: { type: "tween", ease: "easeInOut", duration: 0.2, delay: 0.1 } }}
            className="absolute inset-0"
          >
            <Image src={active.profilePic.src} alt="" fill sizes="100vw" className={cn("object-cover blur-[15px]", mobileOpen ? "opacity-100" : "opacity-35")} />
          </m.div>}
        </AnimatePresence>
      </div>

      {people.length === 0 ? (
        <div className="relative mx-auto w-[calc(96vw-15px)] pt-[120px] max-md:pt-0">
          <p className="ml-[8vw] w-[calc(48vw-15px)] text-[clamp(20px,1.6vw,30px)] leading-none max-md:ml-0 max-md:w-full">{t("emptyTitle")}</p>
        </div>
      ) : (
        <>
          {!phone && <Portrait person={active} focused={focused} onClose={closeFocus} />}
          <CreditsRoll
            groups={groups}
            still={phone}
            held={focused || mobileOpen}
            hidden={mobileOpen}
            onShow={show}
            onFocusName={(person) => { if (!returning.current) show(person); return !returning.current; }}
            onLeave={scheduleHide}
            onSelect={select}
          />
          {phone && mobileOpen && <MobileProfiles people={ordered} start={active} onShow={(person) => { celebrate(person); setActive(person); }} onClose={closeMobile} />}
        </>
      )}
      <CreditConfetti burst={burst} />
    </main>
  );
}

/** The portrait beside the credits, top right; clicking a name focuses it with the profile card. */
function Portrait({ person, focused, onClose }: { person: TeamPerson | null; focused: boolean; onClose: () => void }) {
  return (
    <AnimatePresence mode="sync" initial={false}>
      {person && (person.profilePic || focused) && <m.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-[120px] right-[50px]">
        {person.profilePic && <m.div
          initial={{ visibility: "hidden", opacity: 0 }}
          variants={{
            visible: { visibility: "visible", opacity: 1, transformOrigin: "right center", transform: "translate3d(0,0,0) scale(1)", transition: { type: "tween", ease: "easeInOut", duration: 0.3 } },
            hidden: { visibility: "hidden", opacity: 0, transition: { type: "tween", ease: "easeOut", duration: 0.2, delay: 0.4 } },
            focus: { visibility: "visible", opacity: 1, transformOrigin: "right center", transform: "translate3d(0,100px,135px) scale(1.2)", zIndex: 100, transition: { type: "tween", ease: "easeInOut", delay: 0.3, duration: 0.5 } }
          }}
          animate={focused ? "focus" : "visible"}
          exit="hidden"
          className="relative aspect-[.88] h-[35vw] max-h-[50vh] overflow-hidden rounded-[15px]"
        >
          <Image key={person.id} src={person.profilePic.src} alt={person.profilePic.alt} fill sizes="35vw" className="absolute h-full w-full object-cover" />
        </m.div>}
        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-0 my-[15px] text-4xl">
          {person.name}{person.patronage && <span aria-hidden="true"> 🎂</span>}
        </m.div>
        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-sans">
          <p>{person.role}</p>
        </m.div>
        {focused && <FocusCard person={person} onClose={onClose} />}
      </m.div>}
    </AnimatePresence>
  );
}

/**
 * The focused profile: the blurred overlay (clicking it closes) and the centred card. It is modal: Floating
 * UI's focus manager, as the site's Search uses, makes the rest of the page inert and keeps Tab inside, and
 * it lets go as soon as the card starts to close, so focus can go back to the name during the fade. The
 * Hideaway had no focus handling here; the visuals are unchanged.
 */
function FocusCard({ person, onClose }: { person: TeamPerson; onClose: () => void }) {
  const t = useTranslations("Customer.team");
  const present = useIsPresent();
  const { refs, context } = useFloating({ open: present });
  const card = useRef<HTMLDivElement>(null);
  return (
    <FloatingFocusManager context={context} disabled={!present} initialFocus={card} returnFocus={false} outsideElementsInert>
      <div ref={refs.setFloating} className="contents">
        <m.button
          type="button"
          aria-label={t("closeProfiles")}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { type: "tween", delay: 0.3, duration: 0.3, ease: "easeIn" } }}
          exit={{ opacity: 0, transition: { type: "tween", delay: 0, duration: 0.3, ease: "easeOut" } }}
          className="fixed inset-0 z-[99] h-screen w-screen bg-background/40 -outline-offset-8 backdrop-blur-sm focus-visible:outline-2"
        />
        <m.div
          ref={card}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={person.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-1/2 left-1/2 z-[100] mr-10 flex h-[300px] w-[400px] -translate-x-1/2 -translate-y-1/2 flex-col items-start justify-center gap-1.5 overflow-hidden rounded-[15px] bg-muted/40 p-10 outline-none backdrop-blur-sm"
        >
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.8, duration: 0.4, ease: [0.44, 0, 0.56, 1], type: "tween" } }}
            exit={{ opacity: 0, transition: { delay: 0, duration: 0.3, ease: [0.44, 0, 0.56, 1], type: "tween" } }}
            className="relative flex h-min w-full flex-none flex-col flex-wrap content-center items-center gap-[10px] overflow-hidden p-0"
          >
            {[person.name, person.bio, person.role].filter((item): item is string => typeof item === "string").map((item, index) => (
              <div key={index + item} className="relative h-auto w-full flex-none shrink-0 justify-start wrap-break-word whitespace-pre-wrap">
                <p className="text-2xl">{item}</p>
              </div>
            ))}
            <ProfileLink href={person.href} />
          </m.div>
        </m.div>
      </div>
    </FloatingFocusManager>
  );
}

function ProfileLink({ href }: { href?: string }) {
  const target = linkable(href);
  if (!target) return null;
  return (
    <div className="relative h-auto w-full flex-none shrink-0 justify-start wrap-break-word whitespace-pre-wrap">
      <Link href={target} className="text-2xl outline-offset-4 focus-visible:outline-2">{href}</Link>
    </div>
  );
}

/**
 * The credits: two passes stacked so the loop never shows a seam. On desktop they drift up; the wheel pushes
 * them; hovering the list eases them to a stop. On phones they stay still.
 */
function CreditsRoll({ groups, still, held, hidden, onShow, onFocusName, onLeave, onSelect }: {
  groups: CreditGroup[];
  still: boolean;
  held: boolean;
  hidden: boolean;
  onShow: (person: TeamPerson) => void;
  /** Returns false when the focus is the page handing focus back after a close. */
  onFocusName: (person: TeamPerson) => boolean;
  onLeave: () => void;
  onSelect: (person: TeamPerson, button: HTMLButtonElement) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const acceleration = useMotionValue(1);
  const position = useRef(0);
  const intent = useRef(0);
  const wheel = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  // A short ease that brings a focused name into view; the drift waits while it runs.
  const seek = useRef<ReturnType<typeof animate> | null>(null);
  useEffect(() => () => seek.current?.stop(), []);
  // While keyboard focus holds the roll it stays exactly where the reveal left it: no wheel inertia, no wrap,
  // until focus leaves the list or the pointer takes over.
  const frozen = useRef(false);
  useEffect(() => { frozen.current = keyboard; }, [keyboard]);
  const stopSeek = () => {
    seek.current?.stop();
    seek.current = null;
  };
  const count = groups.reduce((total, group) => total + group.people.length, 0);
  // The Hideaway spaces names by 100vh shared across the whole roster.
  const gap = `${100 / Math.max(count, 1)}vh`;

  useEffect(() => {
    if (still) return;
    let quiet: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (event: WheelEvent) => {
      wheel.current = event.deltaY;
      clearTimeout(quiet);
      quiet = setTimeout(() => { wheel.current = 0; }, 66);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => { window.removeEventListener("wheel", onWheel); clearTimeout(quiet); };
  }, [still]);

  useEffect(() => {
    const control = animate(acceleration, hovered || held || keyboard ? 0 : 1, STOP);
    return () => control.stop();
  }, [acceleration, held, hovered, keyboard]);

  useAnimationFrame((_, delta) => {
    const height = list.current?.offsetHeight ?? 0;
    if (still || !height) { position.current = 0; y.set(0); return; }
    if (seek.current || frozen.current) { intent.current = 0; y.set(position.current); return; }
    // A hidden tab resumes with one long frame; cap it so the roll never lurches.
    const dt = Math.min(delta, 64);
    intent.current += (wheel.current / 2 - intent.current) * (1 - Math.pow(WHEEL_EASE, dt));
    position.current -= (dt * acceleration.get() + 6 * intent.current) / DRIFT_DIVISOR;
    // The loop wraps by half its height, which shows the same names. A held roll may sit just below its
    // start (reveal, below), so a name at the very top can clear the header; it wraps once it moves again.
    const moving = acceleration.get() > 0.001;
    if (position.current > (moving ? 0 : height / 2)) position.current -= height / 2;
    if (position.current < -height / 2) position.current += height / 2;
    y.set(position.current);
  });

  /**
   * Focus only ever sits on a name the visitor can see: below the header, above the bottom edge. A name out
   * of view is brought in by the half-loop jump when the other pass's copy of it is on screen, which looks
   * identical because the two passes are, or else by easing the roll until the name is centred.
   */
  const reveal = (button: HTMLButtonElement) => {
    const element = list.current;
    if (still || !element) return;
    const half = element.offsetHeight / 2;
    // Below the floating header.
    const top = 96;
    const bottom = window.innerHeight - 48;
    const rect = button.getBoundingClientRect();
    const seen = (shift: number) => rect.top + shift >= top && rect.bottom + shift <= bottom;
    // Every focus change cancels a reveal still easing toward the previous name.
    stopSeek();
    if (seen(0)) return;
    for (const shift of [half, -half]) {
      const next = position.current + shift;
      if (next <= top && next >= -half && seen(shift)) {
        position.current = next;
        y.set(next);
        return;
      }
    }
    const target = Math.min(top, Math.max(-half, position.current + window.innerHeight / 2 - (rect.top + rect.height / 2)));
    seek.current = animate(position.current, target, {
      ...STOP,
      onUpdate: (value) => { position.current = value; },
      onComplete: () => { seek.current = null; },
    });
  };
  const keyboardFocus = (button: HTMLButtonElement) => {
    try { return button.matches(":focus-visible"); } catch { return false; }
  };

  const twin = (id: string) => list.current?.querySelector<HTMLButtonElement>(`button[data-credit-id="${CSS.escape(id)}"]`) ?? null;

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    stopSeek();
    setKeyboard(false);
    onLeave();
  };

  return (
    <div className="relative mx-auto my-0 w-[calc(96vw-15px)]">
      <m.div
        ref={list}
        style={{ y: still ? 0 : y }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.5, delay: 1 } }}
        onPointerEnter={() => { setHovered(true); setKeyboard(false); }}
        onPointerLeave={() => setHovered(false)}
        onBlur={onBlur}
        className={cn(
          "m-0 mb-[8vw] ml-[8vw] w-[calc(48vw-15px)] align-baseline text-[clamp(20px,1.6vw,30px)] leading-none max-md:ml-0 max-md:w-full",
          hidden && "pointer-events-none"
        )}
      >
        {(still ? [0] : [0, 1]).map((pass) => groups.map((group) => (
          <div key={`${pass}-${group.role}`} aria-hidden={pass === 1 || undefined} className="flex w-[calc(48vw-30px)] gap-x-7 max-md:w-full">
            <div className="w-[calc(48vw-30px)] px-0 py-[clamp(5px,0.34vw,7px)] text-right md:w-[calc(24vw-15px)]">{group.role}</div>
            <ul className="w-[calc(48vw-30px)] md:w-[calc(24vw-15px)]">
              {group.people.map((person) => (
                <li
                  key={person.id}
                  style={{ marginBottom: gap }}
                  className="relative px-0 py-[clamp(5px,.34vw,7px)] before:absolute before:top-1/2 before:right-[calc(100%+7.5px)] before:h-[.48vw] before:w-[.48vw] before:translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-current before:opacity-0 before:transition-opacity before:duration-200 before:ease-in-out before:content-none hover:before:opacity-100 md:before:content-[''] has-focus-visible:before:opacity-100"
                >
                  <Button variant="bare"
                    type="button"
                    tabIndex={pass === 1 ? -1 : undefined}
                    data-credit-id={pass === 1 ? undefined : person.id}
                    onPointerEnter={() => onShow(person)}
                    onPointerLeave={onLeave}
                    // The second pass is only the loop's seam: a click there never takes focus, and the view
                    // it opens returns focus to the first pass's name.
                    onMouseDown={pass === 1 ? (event) => event.preventDefault() : undefined}
                    onFocus={(event) => {
                      const button = event.currentTarget;
                      reveal(button);
                      // Focus handed back after a close shows nothing, but from the keyboard it holds the roll
                      // so the name stays where the visitor can see it.
                      if (onFocusName(person) || keyboardFocus(button)) setKeyboard(true);
                    }}
                    onClick={(event) => onSelect(person, pass === 1 ? twin(person.id) ?? event.currentTarget : event.currentTarget)}
                    /* The names keep Hideaway's size; on touch an invisible inset grows each hit area to 44px+. */
                    className="group/focus relative text-left leading-none after:absolute after:inset-x-0 after:-inset-y-3 pointer-coarse:after:content-['']"
                  >
                    <FocusShape className="outline-offset-4">{person.name}{person.patronage && <span aria-hidden="true"> 🎂</span>}</FocusShape>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )))}
      </m.div>
    </div>
  );
}

/**
 * Phones: a full-screen row of profiles, one per screen, snapping as it scrolls. It opens on the tapped
 * name with The Hideaway's small nudge (60 px and back) to show it scrolls, and closes with the round
 * button at the bottom.
 */
function MobileProfiles({ people, start, onShow, onClose }: {
  people: TeamPerson[];
  start: TeamPerson | null;
  onShow: (person: TeamPerson) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Customer.team");
  const row = useRef<HTMLUListElement>(null);
  const [snap, setSnap] = useState(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  const first = Math.max(0, people.findIndex((person) => person.id === start?.id));
  // Only the card on screen is in the tab order; the others are inert until they are scrolled to.
  const [current, setCurrent] = useState(first);
  // Modal, as the desktop card: the page behind is inert and Tab stays in the row. Focus starts on Close.
  const { refs, context } = useFloating({ open: true });

  useEffect(() => {
    const list = row.current;
    if (!list) return;
    list.scrollLeft = first * list.clientWidth;
    const base = list.scrollLeft;
    const nudge = animate(base, base + 60, {
      duration: 0.5, ease: [0.77, 0, 0.175, 1], delay: 0.5, repeat: 1, repeatType: "reverse",
      onUpdate: (value) => { list.scrollLeft = value; },
      onComplete: () => setSnap(true)
    });
    return () => nudge.stop();
    // Opens once per tap; later scrolling is the visitor's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const list = row.current;
      if (!list) return;
      const index = Math.round(list.scrollLeft / list.clientWidth);
      const person = people[index];
      if (!person) return;
      setCurrent(index);
      if (person.id !== start?.id) onShow(person);
    }, 100);
  };

  return (
    <FloatingFocusManager context={context} initialFocus={close} returnFocus={false} outsideElementsInert>
    <div ref={refs.setFloating} role="dialog" aria-modal="true" aria-label={t("profiles")} className="fixed inset-0 z-2 overflow-hidden">
      <ul ref={row} onScroll={onScroll} className={cn("relative flex h-full overflow-auto", snap && "snap-x snap-mandatory")}>
        {people.map((person, index) => (
          <li key={person.id} inert={index !== current} className="relative h-full w-screen shrink-0 snap-start">
            <div className="absolute top-[56px] left-[15px] z-2 w-[calc(96vw-15px)]">
              <div className="relative aspect-[.88] max-h-[50vh] w-full overflow-hidden rounded-3xl">
                {person.profilePic && <Image src={person.profilePic.src} alt={person.profilePic.alt} fill sizes="96vw" loading="lazy" className="absolute h-full w-full object-cover" />}
              </div>
              <div className="mx-0 my-[15px] text-4xl">{person.name}{person.patronage && <span aria-hidden="true"> 🎂</span>}</div>
              <div className="font-sans"><p>{person.bio}</p></div>
              <ProfileLink href={person.href} />
            </div>
          </li>
        ))}
      </ul>
      <Button variant="bare"
        ref={close}
        type="button"
        aria-label={t("closeProfiles")}
        onClick={onClose}
        className="fixed bottom-[50px] left-1/2 z-8 flex size-[55px] -translate-x-1/2 items-center justify-center rounded-full bg-white outline-offset-4 focus-visible:outline-2"
      >
        <svg aria-hidden="true" fill="none" height="25" viewBox="0 0 25 25" width="25" xmlns="http://www.w3.org/2000/svg">
          <g className="stroke-carbon" strokeLinecap="round" strokeWidth="1.25">
            <path d="m1.5 23.3019 21.8025-21.80245" />
            <path d="m23.5328 23.269-21.80249-21.80241" />
          </g>
        </svg>
      </Button>
    </div>
    </FloatingFocusManager>
  );
}
