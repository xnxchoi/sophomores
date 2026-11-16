"use client";
import { useTranslations } from "next-intl";

import { cva } from "class-variance-authority";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import {
  animate,
  motion,
  type MotionValue,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform
} from "motion/react";
import { stories as fallbackStories } from "@/lib/teaser/content";
import { useTeaserContent } from "./content-provider";
import {
  chapterExitHoldVh,
  createTimeline,
  scrollChapters,
  type ChapterId
} from "@/lib/teaser/choreography";
import { chapterGeometry } from "@/lib/teaser/step-motion";
import { cn } from "@/lib/utils";
import { StoryArtwork } from "./story-artwork";

function assertIndex(value: number) {
  if (!Number.isInteger(value) || value < 0)
    throw new RangeError("Step indices must be non-negative integers.");
}

export function ProgressSegment({
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
  assertIndex(card);
  assertIndex(index);
  assertIndex(step);
  const scaleX = useTransform(progress, (value) => {
    if (!Number.isFinite(value))
      throw new RangeError("Progress must be finite.");
    if (card > step || index > card) return 0;
    if (card < step || index < card) return 1;
    return Math.max(0, Math.min(1, value));
  });
  return (
    <span className="h-1 flex-1 overflow-hidden bg-[#ffffff55] group-data-[story-tone=green]/card:bg-[#0005]">
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
  progress,
  storyLabel,
  allStories
}: {
  story: (typeof fallbackStories)[number];
  index: number;
  position: MotionValue<number>;
  step: number;
  progress: MotionValue<number>;
  storyLabel: string;
  allStories: readonly (typeof fallbackStories)[number][];
}) {
  const t = useTranslations("System");
  const opacity = useTransform(position, [index - 1, index], [0, 1]);
  const scale = useTransform(position, [index - 1, index], [0, 1]);
  return (
    <motion.article
      data-story-tone={story.tone}
      className={cn(
        "group/card relative flex h-[min(585px,calc(100svh-130px))] w-(--story-width) flex-[0_0_var(--story-width)] flex-col gap-6 overflow-hidden rounded-teaser-card p-6 short:gap-4 short:max-md:p-4.5 md:short:h-[calc(100svh-95px)] md:tall:h-[585px] teaser-wide:tall:h-[min(728px,calc(100svh-100px))]",
        story.tone === "dark"
          ? "bg-teaser-card"
          : story.tone === "green"
            ? "bg-teaser-green text-black [&>:not([data-story-artwork])]:relative [&>:not([data-story-artwork])]:z-1"
            : "bg-teaser-blue",
        story.tone === "portrait" ? "[&>:not([data-story-photo])]:relative" : ""
      )}
      data-story-card={index}
      aria-label={t("storyPosition", { label: storyLabel, position: index + 1, total: allStories.length })}
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
          data-story-photo=""
          className="z-0 object-cover brightness-[0.65]"
        />
      )}
      {story.tone === "green" && <StoryArtwork tone="green" reveal={opacity} />}
      <div className="relative flex flex-col gap-4">
        <span
          className={cn(
            "text-teaser-label self-start p-2 font-sans uppercase",
            story.tone === "green" ? "bg-[#0000001a]" : "bg-[#ffffff1a]"
          )}
        >
          {storyLabel}
        </span>
        <div
          data-story-progress=""
          className="flex gap-1 opacity-100 transition-opacity delay-150 duration-180 ease-[ease-out] [@media(hover:hover)_and_(pointer:fine)]:group-hover/track:opacity-0"
          aria-hidden="true"
        >
          {allStories.map((_, i) => (
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
      <h2 className="font-teaser-serif text-teaser-copy teaser-wide:tall:text-teaser-heading short:max-md:text-[26px] short:md:text-[28px]">
        {story.title}
      </h2>
      {story.tone === "dark" && <StoryArtwork tone="dark" reveal={opacity} />}
      <p className="text-teaser-body mt-auto font-sans whitespace-pre-line uppercase short:max-md:text-base short:max-md:leading-[1.1]">
        {story.body}
      </p>
    </motion.article>
  );
}

/** Chapter and playback controls share appearance, but never compete for width. */
export const storyControlVariants = cva(
  "h-7 bg-teaser-card text-teaser-control text-[12px] aria-pressed:bg-white aria-pressed:text-black md:h-9",
  {
    variants: {
      kind: {
        chapter: "w-7 md:w-9",
        playback: "w-auto min-w-14 px-2"
      }
    },
    defaultVariants: { kind: "chapter" }
  }
);

export function Story({
  suspended = false,
  onActive
}: {
  suspended?: boolean;
  onActive: (id: ChapterId) => void;
}) {
  const t = useTranslations("System");
  const lenis = useLenis();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Chapter activity detection (40% viewport intersection)
  const { scrollYProgress: activityProgress } = useScroll({
    target: sectionRef,
    offset: ["start 40%", "end 40%"]
  });
  useMotionValueEvent(activityProgress, "change", (value) => {
    if (value > 0 && value < 1) onActive?.("origin");
  });

  // Native scroll progress through sticky section (0 to 1)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"]
  });

  const [step, setStep] = useState(0);
  const position = useMotionValue(0);

  const content = useTeaserContent();
  const activeStories: readonly (typeof fallbackStories)[number][] =
    content.stories?.length
      ? (content.stories as readonly (typeof fallbackStories)[number][])
      : fallbackStories;

  // Map scroll progress to active card
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const total = activeStories.length;
    const next = Math.max(0, Math.min(total - 1, Math.floor(progress * total)));
    if (next !== step) {
      setStep(next);
      animate(position, next, { duration: 0.5, ease: [0.25, 0.35, 0.35, 1] });
    }
  });

  // Track scroll position: translates horizontally as step advances
  const x = useTransform(
    position,
    (value) => `calc(-${value} * (var(--story-width) + 8px))`
  );

  // Navigate to a specific card
  const goToStory = (index: number, automatic = false) => {
    const section = sectionRef.current;
    if (!section) return;
    const center = (index + 0.5) / activeStories.length;
    const target =
      section.offsetTop + center * (section.offsetHeight - window.innerHeight);
    if (lenis)
      lenis.scrollTo(target, {
        duration: 0.8,
        immediate: !automatic
      });
    else
      window.scrollTo({
        top: target,
        behavior: automatic ? "smooth" : "instant"
      });
  };

  // Reading hold & auto-advance playback
  const inView = useInView(stageRef, { amount: 0.85 });
  const playbackProgress = useMotionValue(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [completeStep, setCompleteStep] = useState<number | null>(null);
  const complete = completeStep === step;

  useEffect(() => {
    if (suspended || !inView || paused || focused) return;
    playbackProgress.set(0);
    const controls = animate(playbackProgress, 1, {
      duration: 3.5,
      ease: "linear",
      onComplete: () => {
        setCompleteStep(step);
        if (step < activeStories.length - 1) {
          goToStory(step + 1, true);
        }
      }
    });
    return () => controls.stop();
  }, [step, inView, paused, focused, suspended, activeStories.length]);

  const finished = complete && step === activeStories.length - 1;

  return (
    <motion.section
      ref={sectionRef}
      id="origin"
      className="bg-black"
      style={{
        height: `${chapterGeometry(createTimeline(scrollChapters.origin).travelVh, chapterExitHoldVh.origin ?? 0).heightVh}svh`
      }}
      aria-label={content.storyLabel}
    >
      <div
        ref={stageRef}
        className="sticky top-0 flex h-svh items-center overflow-hidden pb-[45px]"
        onFocusCapture={(event) => {
          if (
            (event.target as HTMLElement).matches(":focus-visible") &&
            !(event.target as HTMLElement).closest("[data-story-playback]")
          )
            setFocused(true);
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setFocused(false);
        }}
      >
        <motion.div
          className="group/track pointer-events-auto ml-[calc(50%-var(--story-width)/2)] flex gap-2"
          style={{ x }}
        >
          {activeStories.map((story, index) => (
            <StoryCard
              key={story.title}
              story={story}
              index={index}
              position={position}
              step={step}
              progress={playbackProgress}
              storyLabel={content.storyLabel}
              allStories={activeStories}
            />
          ))}
        </motion.div>
        <div
          className="pointer-events-auto absolute right-4.5 bottom-[63px] flex gap-1 md:right-6 md:bottom-17"
          aria-label={t("storyChapters")}
        >
          {activeStories.map((_, index) => (
            <button
              key={index}
              className={storyControlVariants()}
              aria-label={t("readStory", { position: index + 1 })}
              aria-pressed={step === index}
              onClick={() => {
                goToStory(index);
              }}
            >
              {index + 1}
            </button>
          ))}
          <button
            className={storyControlVariants({
              kind: "playback"
            })}
            data-story-playback
            aria-label={
              finished
                ? t("replayStories")
                : paused
                  ? t("playStories")
                  : t("pauseStories")
            }
            onClick={() => {
              if (finished) {
                setPaused(false);
                goToStory(0);
              } else {
                setPaused(!paused);
              }
            }}
          >
            {finished ? t("replay") : paused ? t("play") : t("pause")}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
