"use client";

import { useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useRef } from "react";

/**
 * Closing section of a Tape page — artist social links + handoff back
 * to /radio (the Broadcast hub).
 *
 * Composed by hand-crafted Tape pages. Each volume passes its own link
 * list; the layout is consistent so the bottom of every Tape feels
 * like part of the same publication.
 */

export interface TapeLink {
  label: string;
  href: string;
  external?: boolean;
}

interface TapeConnectProps {
  /** Centered h2 — usually the artist name */
  heading: string;
  /** Optional one-line under the heading */
  blurb?: string;
  /** External profile/social links */
  links: TapeLink[];
  /** Where the "Return" button sends the reader. Defaults to /radio. */
  returnHref?: string;
  /** Label on the return button. Defaults to "Return to broadcast →". */
  returnLabel?: string;
}

export function TapeConnect({
  heading,
  blurb,
  links,
  returnHref = "/radio",
  returnLabel = "Return to broadcast →"
}: TapeConnectProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80%", "start 40%"]
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], ["2rem", "0rem"]);

  return (
    <section ref={sectionRef} className="relative py-32 xl:py-40">
      <m.div style={{ opacity, y }} className="mx-auto max-w-7xl px-6 xl:px-10">
        <div className="mb-16 h-px w-full border-t border-border/20" />

        <div className="flex flex-col items-center text-center">
          <p className="mb-6 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/50 uppercase xl:text-xs">
            · Connect
          </p>

          <h2 className="mb-8 text-2xl font-light tracking-tight xl:text-3xl">
            {heading}
          </h2>

          {blurb && (
            <p className="mb-12 max-w-md font-sans text-[11px] leading-relaxed text-muted-foreground/60 xl:text-xs">
              {blurb}
            </p>
          )}

          <ul className="flex flex-col items-center gap-4">
            {links.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <ExternalLink
                  href={link.href}
                  external={link.external !== false}
                >
                  {link.label}
                </ExternalLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-24 flex justify-center">
          <Link
            href={returnHref}
            className="border border-border/40 px-5 py-2.5 font-sans text-[11px] tracking-widest text-foreground/60 uppercase transition-colors hover:border-border hover:text-foreground"
          >
            {returnLabel}
          </Link>
        </div>
      </m.div>
    </section>
  );
}

interface ExternalLinkProps {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}

function ExternalLink({ href, external, children }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group inline-flex items-center gap-3 border-b border-border/30 pb-1 font-sans text-[11px] tracking-widest uppercase transition-colors hover:border-foreground/50"
    >
      <span>{children}</span>
      {external && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        >
          <path
            d="M2 10L10 2M10 2H4M10 2V8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </a>
  );
}
