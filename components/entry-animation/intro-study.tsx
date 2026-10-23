"use client";

import { useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import {
  introCopyOpacity,
  introFrame,
  introStudy,
  resolveIntroPlayback
} from "@/lib/entry-animation/model";
import { LightMedia } from "./light-media";
import { useIntroMedia } from "./use-intro-media";

export function IntroStudy({
  referenceVideo = introStudy.referenceVideo
}: {
  readonly referenceVideo?: string;
}) {
  const chapter = useRef<HTMLElement>(null);
  const inView = useInView(chapter, { amount: 0 });
  const environment = useIntroMedia();
  const [paused, setPaused] = useState(false);
  const [reference, setReference] = useState(true);
  const playback = resolveIntroPlayback({ ...environment, paused, inView });
  const { scrollYProgress } = useScroll({
    target: chapter,
    offset: ["start start", "end end"]
  });
  const heroOpacity = useTransform(
    () => introCopyOpacity(scrollYProgress.get()).hero
  );
  const propositionOpacity = useTransform(
    () => introCopyOpacity(scrollYProgress.get()).proposition
  );
  const scale = useTransform(
    scrollYProgress,
    (value) => introFrame(value).scale
  );
  const staticLayout = playback.staticLayout;

  return (
    <main className="intro-study" data-static={staticLayout || undefined}>
      <a className="intro-study__skip" href="#intro-first-section">
        Skip to the first night
      </a>
      <header className="intro-study__header">
        <a
          href="/studies"
          className="intro-study__wordmark"
          aria-label="Sophomores studies"
        >
          sophomores
        </a>
        <a href="/studies/invitation">
          Register for launch <span aria-hidden="true">↗</span>
        </a>
      </header>
      <section
        ref={chapter}
        className="intro-study__chapter"
        aria-label="Introduction and light transition"
      >
        <div className="intro-study__stage">
          <motion.div
            className="intro-study__frame"
            style={{ scale: staticLayout ? undefined : scale }}
          >
            <LightMedia
              reference={reference}
              source={referenceVideo}
              loadVideo={playback.loadVideo}
              playVideo={playback.playVideo}
              paused={paused || environment.reduced}
              visible={environment.visible && inView}
            />
            <div className="intro-study__scrim" />
          </motion.div>
          <motion.div
            className="intro-study__thesis"
            style={{ opacity: staticLayout ? undefined : heroOpacity }}
          >
            <p className="intro-study__eyebrow">
              sophomores · the first chapter
            </p>
            <h1 className="mt-[22px] font-teaser-serif text-[clamp(52px,6.4vw,94px)] font-normal leading-[1.03] tracking-[-0.045em] [text-wrap:balance]">
              Experienced.
              <br />
              Not finished.
            </h1>
            <p className="intro-study__scroll-cue">
              Scroll to begin <span aria-hidden="true">↓</span>
            </p>
          </motion.div>
          <motion.div
            className="intro-study__proposition"
            style={{ opacity: staticLayout ? undefined : propositionOpacity }}
          >
            <p className="m-0 max-w-[1000px] font-teaser-serif text-[clamp(38px,5.1vw,76px)] font-normal leading-[1.13] tracking-[-0.035em] [text-wrap:balance]">
              A private social club.
              <br />
              Our first chapter
              <br />
              is a night together.
            </p>
          </motion.div>
          <div className="intro-study__controls">
            <p>
              {reference ? (
                <>
                  <a
                    href={introStudy.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Reference light footage
                  </a>{" "}
                  · local study only
                </>
              ) : (
                "Current Sophomores light · R3F study"
              )}
            </p>
            <div>
              <button
                type="button"
                aria-pressed={!reference}
                onClick={() => setReference((value) => !value)}
              >
                {reference
                  ? "Use current Sophomores light"
                  : "Use reference light"}
              </button>
              <button
                type="button"
                aria-pressed={paused}
                onClick={() => setPaused((value) => !value)}
                disabled={environment.reduced}
              >
                {paused ? "Resume motion" : "Pause motion"}
              </button>
            </div>
            {environment.saveData && (
              <p>Data saving is on. Reference video is not loaded.</p>
            )}
            {environment.reduced && (
              <p>Reduced motion is on. Static reading layout.</p>
            )}
          </div>
        </div>
      </section>
      <section
        id="intro-first-section"
        className="intro-study__editorial"
        tabIndex={-1}
        aria-labelledby="intro-night-title"
      >
        <p className="intro-study__eyebrow">01 / The invitation</p>
        <div>
          <h2
            id="intro-night-title"
            className="m-0 mb-10 font-teaser-serif text-[clamp(54px,6.6vw,104px)] font-normal leading-none tracking-[-0.04em]"
          >
            The beginning
            <br />
            is a night.
          </h2>
          <p>
            Music. Conversation. A room with its own rhythm. Some things are
            better discovered in person.
          </p>
          <p>We’ll leave the rest for the invitation.</p>
          <div className="intro-study__links">
            <a href="/studies/invitation">
              Register for launch <span aria-hidden="true">↗</span>
            </a>
            <a href="/studies/tickets">
              Explore ticket interaction <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
      <footer className="intro-study__footer">
        <a href="/studies">Back to local studies</a>
        <p>
          Intro / first-section study · placement and copy provisional · no
          registration or ticket purchase on this page
        </p>
      </footer>
    </main>
  );
}
