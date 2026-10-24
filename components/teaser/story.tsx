"use client";
import Image from "next/image";
import { useRef } from "react";
import { useLenis } from "lenis/react";
import { useChapterActivity } from "../../hooks/use-chapter-activity";
import { motion, type MotionValue, useTransform } from "motion/react";
import { stories } from "@/lib/teaser/content";
import type { ChapterId } from "@/lib/teaser/choreography";
import { useChapterScroll } from "../../hooks/use-chapter-scroll";
import { storyPlayback, storyTarget } from "@/lib/teaser/story-playback";
import { useStoryPlayback } from "../../hooks/use-story-playback";
import { getStoryStepProgress } from "@/lib/teaser/step-motion";
import { StoryArtwork } from "./story-artwork";

import { storyControlVariants } from "./styles";
import { cn } from "@/lib/utils";

function ProgressSegment({
  card,
  index,
  step,
  progress
}: {
  card: number;
  index: number;
  step: number;
  progress: MotionValue<number>;
}) {
  const scaleX = useTransform(progress, (value) =>
    getStoryStepProgress(card, step, index, value)
  );
  return (
    <span className="h-1 flex-1 overflow-hidden bg-[#ffffff55] group-[.story-green]:bg-[#0005]">
      <motion.i
        className="block size-full origin-left bg-current"
        style={{ scaleX }}
      />
    </span>
  );
}

function StoryCard({
  story,
  index,
  position,
  step,
  progress
}: {
  story: (typeof stories)[number];
  index: number;
  position: MotionValue<number>;
  step: number;
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(position, [index - 1, index], [0, 1]);
  const scale = useTransform(position, [index - 1, index], [0, 1]);
  return (
    <motion.article
      className={cn(
        "story-card group relative flex h-[min(585px,calc(100svh-130px))] w-(--story-width) flex-[0_0_var(--story-width)] flex-col gap-6 overflow-hidden rounded-teaser-card p-6 short:gap-4 short:max-md:p-4.5 md:short:h-[calc(100svh-95px)] md:tall:h-[585px] teaser-wide:tall:h-[min(728px,calc(100svh-100px))]",
        {
          "story-dark": story.tone === "dark",
          "story-green": story.tone === "green",
          "story-blue": story.tone === "blue",
          "story-portrait": story.tone === "portrait"
        },
        story.tone === "dark"
          ? "bg-teaser-card"
          : story.tone === "green"
            ? "bg-teaser-green text-black [&>:not(.story-artwork)]:relative [&>:not(.story-artwork)]:z-1"
            : "bg-teaser-blue",
        story.tone === "portrait" ? "[&>:not(.story-photo)]:relative" : ""
      )}
      data-story-card={index}
      aria-label={`Our story, ${index + 1} of ${stories.length}`}
      style={{
        opacity,
        scale,
        transformOrigin: "right top"
      }}
    >
      {story.tone === "portrait" && (
        <Image
          src="/teaser/portrait.webp"
          alt=""
          fill
          sizes="328px"
          className="story-photo z-0 object-cover brightness-[0.65]"
        />
      )}
      {story.tone === "green" && <StoryArtwork tone="green" reveal={opacity} />}
      <div className="story-header relative flex flex-col gap-4">
        <span className="story-label self-start bg-[#ffffff1a] p-2 font-sans text-teaser-label uppercase group-[.story-green]:bg-[#0000001a]">
          Our story
        </span>
        <div
          className="story-progress flex gap-1 opacity-100 transition-opacity delay-150 duration-180 ease-[ease-out]"
          aria-hidden="true"
        >
          {stories.map((_, i) => (
            <ProgressSegment
              card={index}
              key={i}
              index={i}
              step={step}
              progress={progress}
            />
          ))}
        </div>
      </div>
      <h2 className="font-teaser-serif text-teaser-copy short:max-md:text-[26px] short:md:text-[28px] teaser-wide:tall:text-teaser-heading">
        {story.title}
      </h2>
      {story.tone === "dark" && <StoryArtwork tone="dark" reveal={opacity} />}
      <p className="mt-auto font-sans text-teaser-body whitespace-pre-line uppercase short:max-md:text-base short:max-md:leading-[1.1]">
        {story.body}
      </p>
    </motion.article>
  );
}

export function Story({
  suspended = false,
  onActive
}: {
  suspended?: boolean;
  onActive: (id: ChapterId) => void;
}) {
  const lenis = useLenis();
  const stage = useRef<HTMLDivElement>(null);
  const { ref, position, step, settled, timeline, sectionStyle } =
    useChapterScroll("origin");
  useChapterActivity(ref, "origin", onActive);
  const x = useTransform(
    position,
    (value) => `calc(-${value} * (var(--story-width) + 8px))`
  );
  const goToStory = (index: number, automatic = false) => {
    const section = ref.current;
    if (!section) return;
    const center = storyTarget(index, timeline);
    const target =
      section.offsetTop + center * (section.offsetHeight - window.innerHeight);
    if (lenis)
      lenis.scrollTo(target, {
        duration: storyPlayback.transitionSeconds,
        immediate: !automatic
      });
    else
      window.scrollTo({
        top: target,
        behavior: automatic ? "smooth" : "instant"
      });
  };
  const playback = useStoryPlayback({
    stage,
    settlement: settled,
    step,
    suspended,
    onAdvance: () => {
      if (step < stories.length - 1) goToStory(step + 1, true);
    }
  });
  const finished = playback.complete && step === stories.length - 1;
  return (
    <motion.section
      ref={ref}
      id="origin"
      className="scroll-section origin-section bg-black"
      aria-label="Our story"
      style={sectionStyle}
    >
      <div
        ref={stage}
        className="stage story-stage sticky top-0 flex h-svh items-center overflow-hidden pb-[45px]"
        onFocusCapture={(event) => {
          if (
            (event.target as HTMLElement).matches(":focus-visible") &&
            !(event.target as HTMLElement).closest("[data-story-playback]")
          )
            playback.stopForFocus();
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            playback.clearFocus();
        }}
      >
        <motion.div
          className="story-track pointer-events-auto ml-[calc(50%-var(--story-width)/2)] flex gap-2"
          style={{ x }}
        >
          {stories.map((story, index) => (
            <StoryCard
              key={story.title}
              {...{ story, index, position, step }}
              progress={playback.progress}
            />
          ))}
        </motion.div>
        <div
          className="story-controls pointer-events-auto absolute right-4.5 bottom-[63px] flex gap-1 md:right-6 md:bottom-17"
          aria-label="Story chapters"
        >
          {stories.map((_, index) => (
            <button
              key={index}
              className={storyControlVariants()}
              aria-label={`Read story ${index + 1}`}
              aria-pressed={step === index}
              onClick={() => {
                playback.restart();
                goToStory(index);
              }}
            >
              {index + 1}
            </button>
          ))}
          <button
            className={storyControlVariants({
              kind: "playback",
              className: "story-playback-toggle"
            })}
            data-story-playback
            aria-label={
              finished
                ? "Replay stories"
                : playback.paused
                  ? "Play stories"
                  : "Pause stories"
            }
            onClick={() => {
              if (finished) {
                playback.restart();
                playback.play();
                goToStory(0);
              } else playback.toggle();
            }}
          >
            {finished ? "Replay" : playback.paused ? "Play" : "Pause"}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
