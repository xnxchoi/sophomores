"use client";

import { siteLayer } from "@/components/gl/layers";
import type { CreditSlot } from "@/lib/content/slots";
import { useLenis } from "lenis/react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useEffect, useState } from "react";
import { CreditConfetti } from "./credit-confetti";

/**
 * A stack of credit slots. Click a name to focus that portrait and lock scrolling.
 * Click the dim layer to release the lock.
 */
export function CreditsRail({ people }: { people: CreditSlot[] }) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const focused = people.find((person) => person.id === focusedId) ?? null;
  const lenis = useLenis();

  useEffect(() => {
    if (!focused) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      document.body.style.overflow = previousOverflow;
      lenis?.start();
    };
  }, [focused, lenis]);

  const focus = (person: CreditSlot) => {
    setFocusedId(person.id);
    if (person.patronage) setBurst((current) => current + 1);
  };

  const release = () => setFocusedId(null);

  return (
    <section className="px-6 py-10">
      <div className="port-hairline mb-8" aria-hidden="true" />
      <h2 className="text-base uppercase tracking-[0.2em]">Credits</h2>
      <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        {people.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              className="text-left"
              aria-pressed={person.id === focusedId}
              onClick={() => focus(person)}
            >
              <span className="block text-base font-medium">{person.name}</span>
              <span className="port-copy block text-base">{person.role}</span>
            </button>
          </li>
        ))}
      </ul>
      {burst > 0 ? <CreditConfetti burst={burst} /> : null}
      <AnimatePresence>
        {focused ? (
          <m.div
            key={focused.id}
            className="fixed inset-0"
            style={{ zIndex: siteLayer.focus }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close portrait"
              className="port-scrim absolute inset-0 backdrop-blur-sm"
              onClick={release}
            />
            <m.div
              className="absolute top-1/2 left-1/2 flex w-[min(100%-2rem,24rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4"
              initial={{ opacity: 0, y: 24, scale: 1 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1.05,
                transition: { duration: 0.45, delay: 0.12, ease: [0.44, 0, 0.56, 1] }
              }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              {focused.profilePic ? (
                <Image
                  src={focused.profilePic.src}
                  alt={focused.profilePic.alt}
                  width={focused.profilePic.width ?? 800}
                  height={focused.profilePic.height ?? 1000}
                  className="h-72 w-full rounded-[15px] object-cover"
                />
              ) : null}
              <div className="port-panel port-sheen rounded-[15px] p-6 backdrop-blur-sm">
                <p className="text-2xl">{focused.name}</p>
                <p className="port-copy mt-1 text-base">{focused.role}</p>
                {focused.bio ? <p className="mt-4 text-base">{focused.bio}</p> : null}
                {focused.href ? (
                  <a className="mt-4 inline-block text-base underline" href={focused.href}>
                    {focused.href}
                  </a>
                ) : null}
              </div>
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
