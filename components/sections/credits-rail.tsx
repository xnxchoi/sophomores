"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import type { CreditPerson } from "@/lib/content/slots";

/** Name rail from the credits section. Confetti and the portrait focus stay in Hideaway. */
export function CreditsRail({ people }: { people: CreditPerson[] }) {
  const list = useRef<HTMLUListElement>(null);
  const clickTween = useRef<gsap.core.Tween | null>(null);

  useGSAP(() => {
    const row = list.current;
    if (!row) return;
    const tween = gsap.to(row, {
      x: -80,
      duration: 6,
      ease: "power3.inOut",
      yoyo: true,
      repeat: -1
    });
    return () => {
      tween.kill();
      clickTween.current?.kill();
    };
  }, { scope: list });

  return (
    <section className="overflow-hidden py-10">
      <h2 className="px-6 text-base uppercase tracking-[0.2em]">Credits</h2>
      <ul ref={list} className="mt-4 flex w-max gap-8 px-6">
        {people.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              className="text-left"
              onClick={(event) => {
                clickTween.current?.kill();
                clickTween.current = gsap.to(event.currentTarget, {
                  x: 60,
                  duration: 0.5,
                  ease: "power3.inOut",
                  yoyo: true,
                  repeat: 1,
                  overwrite: "auto"
                });
              }}
            >
              <span className="block text-base font-medium">{person.name}</span>
              <span className="block text-base text-foreground/70">{person.roleLabel}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
