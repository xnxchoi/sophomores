"use client";
import Image from "next/image";
import { useRef } from "react";
import { useChapterActivity } from "./use-chapter-activity";
import { motion } from "motion/react";
import { chapters, teaser, values } from "@/lib/teaser/content";
import type { ChapterId } from "@/lib/teaser/choreography";
import { springs } from "@/lib/motion-tokens";
import { useChapterScroll } from "./use-chapter-scroll";
import { BlurText } from "./blur-text";
import { sectionHeightVh } from "@/lib/teaser/step-motion";
export { Hero } from "./hero";
export { Story } from "./story";
export { Orbit } from "./orbit";
export { Conversation } from "./conversation";

export function People({
  still,
  onActive
}: {
  still: boolean;
  onActive: (id: ChapterId) => void;
}) {
  const { ref, step, sectionStyle } = useChapterScroll("people", still);
  useChapterActivity(ref, "people", onActive);
  return (
    <motion.section
      ref={ref}
      id="people"
      className="people-section"
      aria-labelledby="people-heading"
      style={sectionStyle}
    >
      <div className="people-stage">
        <h2 id="people-heading">
          <BlurText text={teaser.peopleHeadline} still={still} />
        </h2>
        <div className={`people-cards spread-${step}`}>
          {values.map((value) => (
            <motion.article
              key={value.image}
              className="people-card"
              layout={!still}
              transition={springs.gentle}
            >
              <motion.div layout={still ? false : "position"}>
                <Image src={value.image} width={96} height={96} alt="" />
              </motion.div>
              <motion.p layout={still ? false : "position"}>
                {value.body}
              </motion.p>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export function Invitation({
  onOpen,
  onActive,
  still
}: {
  onOpen: () => void;
  onActive: (id: ChapterId) => void;
  still: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useChapterActivity(ref, "contacts", onActive);
  return (
    <motion.section
      ref={ref}
      id="contacts"
      className="invitation-section"
      aria-labelledby="invitation-heading"
      style={{ minHeight: `${sectionHeightVh(0)}svh` }}
    >
      <div className="invitation-content">
        <span className="invitation-sign" aria-hidden="true">
          s/
        </span>
        <div className="invitation-block">
          <h2 id="invitation-heading">
            <BlurText text={teaser.invitation} still={still} />
          </h2>
          <button className="invitation-link" onClick={onOpen}>
            → The first invitation <span>{teaser.launchHint}</span>
          </button>
        </div>
      </div>
      <footer>
        <span>© sophomores 2026</span>
        <a href={`#${chapters[0].id}`}>Back to the beginning ↑</a>
        <span>sophomores.co</span>
      </footer>
    </motion.section>
  );
}
