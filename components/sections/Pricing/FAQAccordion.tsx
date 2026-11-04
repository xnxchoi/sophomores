"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useInView } from "react-intersection-observer";
import s from "./Pricing.module.scss";

type FAQ = { q: string; a: string };

const FAQS: FAQ[] = [
  {
    q: "How do I pay?",
    a: "Bank transfer is the primary method — pick it at checkout and we'll send instructions; your subscription activates once we confirm receipt. Cash is supported on request. Cards are not yet wired."
  },
  {
    q: "Can I cancel anytime?",
    a: "Patron is a one-time purchase — there is nothing to cancel. Resident is yearly; cancel from your account before renewal. No retention calls, no friction."
  },
  {
    q: "Refunds?",
    a: "Within 7 days of first charge, no questions. After that, prorated for technical issues only."
  },
  {
    q: "Korean tax invoice (세금계산서)?",
    a: "Available on request for Patron memberships. Email concierge@hideawayseoul.com after subscribing."
  },
  {
    q: "What is Cofounder?",
    a: "By application. Don't ask about it on this page."
  }
];

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as const
    }
  })
};

/**
 * FAQAccordion — motion-enhanced rewrite.
 *
 * - Items stagger-fade-in once the section enters the viewport (useInView,
 *   triggerOnce so the stagger plays exactly once).
 * - Expand/collapse: AnimatePresence around the answer wrapper, animating
 *   `height: 0 ↔ "auto"` with `overflow: hidden`. The answer text sits in
 *   an inner div that carries the bottom padding, so the animated wrapper
 *   has clean 0/auto transitions without padding-collapse jitter.
 * - The `+ → ×` icon rotates via Motion (smooth interpolation) instead of
 *   a CSS-transform-on-class swap.
 * - `initial={false}` on AnimatePresence prevents the default-open first
 *   item from playing the exit animation on mount.
 *
 * Motion respects `prefers-reduced-motion` automatically — reduced-motion
 * users see instant transitions.
 */
export function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "-10%" });

  return (
    <section ref={ref} aria-labelledby="faq" className={s.faqShell}>
      <header className={s.faqHeader}>
        <p className={`${s.eyebrow} ${s.faqEyebrow}`}>Questions</p>
        <h2 id="faq" className={s.faqTitle}>
          Things people ask
        </h2>
      </header>
      <div>
        {FAQS.map((f, i) => {
          const expanded = open === i;
          const answerId = `faq-answer-${i}`;
          return (
            <m.div
              key={f.q}
              className={s.faqItem}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              custom={i}
              variants={itemVariants}
            >
              <button
                type="button"
                className={s.faqQuestion}
                aria-expanded={expanded}
                // The answer region only mounts while expanded (AnimatePresence
                // unmounts on collapse). Reference the id only when it's in the
                // DOM — collapsed buttons drop the attribute entirely so AT
                // never resolves a missing id.
                aria-controls={expanded ? answerId : undefined}
                onClick={() => setOpen(expanded ? null : i)}
              >
                <span>{f.q}</span>
                <m.span
                  className={s.faqIcon}
                  aria-hidden
                  animate={{ rotate: expanded ? 45 : 0 }}
                  transition={{
                    duration: 0.22,
                    ease: [0.16, 1, 0.3, 1] as const
                  }}
                >
                  +
                </m.span>
              </button>
              <AnimatePresence initial={false}>
                {expanded ? (
                  <m.div
                    id={answerId}
                    role="region"
                    className={s.faqAnswer}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: {
                        duration: 0.32,
                        ease: [0.16, 1, 0.3, 1] as const
                      },
                      opacity: { duration: 0.24, delay: 0.06 }
                    }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className={s.faqAnswerInner}>{f.a}</div>
                  </m.div>
                ) : null}
              </AnimatePresence>
            </m.div>
          );
        })}
      </div>
    </section>
  );
}
