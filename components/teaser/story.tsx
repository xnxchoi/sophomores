"use client";
import Image from "next/image";
import { useRef } from "react";
import { useLenis } from "lenis/react";
import { useChapterActivity } from "./use-chapter-activity";
import { motion, useTransform, type MotionValue } from "motion/react";
import { stories } from "@/lib/teaser/content";
import type { ChapterId } from "@/lib/teaser/choreography";
import { useChapterScroll } from "./use-chapter-scroll";
import { storyPlayback, storyTarget } from "@/lib/teaser/story-playback";
import { useStoryPlayback } from "./use-story-playback";
import { getStoryStepProgress } from "@/lib/teaser/step-motion";
import { StoryArtwork } from "./story-artwork";

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
    <span>
      <motion.i style={{ scaleX }} />
    </span>
  );
}

function StoryCard({
  story,
  index,
  position,
  still,
  step,
  progress
}: {
  story: (typeof stories)[number];
  index: number;
  position: MotionValue<number>;
  still: boolean;
  step: number;
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(position, [index - 1, index], [0, 1]);
  const scale = useTransform(
    position,
    [index - 1, index],
    [0, 1]
  );
  return (
    <motion.article
      className={`story-card story-${story.tone}`}
      data-story-card={index}
      aria-label={`Our story, ${index + 1} of ${stories.length}`}
      style={{ opacity: still ? 1 : opacity, scale: still ? 1 : scale, transformOrigin: "right top" }}
    >
      {story.tone === "portrait" && (
        <Image
          src="/teaser/portrait.webp"
          alt=""
          fill
          sizes="328px"
          className="story-photo"
        />
      )}
      {story.tone === "green" && <StoryArtwork tone="green" still={still} reveal={opacity} />}
      <div className="story-header">
        <span className="story-label">Our story</span>
        <div className="story-progress" aria-hidden="true">
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
      <h2>{story.title}</h2>
      {story.tone === "dark" && (
        <StoryArtwork tone="dark" still={still} reveal={opacity} />
      )}
      <p>{story.body}</p>
    </motion.article>
  );
}

export function Story({
  still,
  suspended = false,
  onActive
}: {
  still: boolean;
  suspended?: boolean;
  onActive: (id: ChapterId) => void;
}) {
  const lenis = useLenis();
  const stage = useRef<HTMLDivElement>(null);
  const { ref, position, step, settled, timeline, sectionStyle } =
    useChapterScroll("origin", still);
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
    still: still || suspended,
    onAdvance: () => {
      if (step < stories.length - 1) goToStory(step + 1, true);
    }
  });
  const finished = playback.complete && step === stories.length - 1;
  return (
    <motion.section
      ref={ref}
      id="origin"
      className="scroll-section origin-section"
      aria-label="Our story"
      style={sectionStyle}
    >
      <div
        ref={stage}
        className="stage story-stage"
        onFocusCapture={(event) => {
          if ((event.target as HTMLElement).matches(":focus-visible") &&
              !(event.target as HTMLElement).closest("[data-story-playback]"))
            playback.stopForFocus();
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            playback.clearFocus();
        }}
      >
        <motion.div
          className="story-track"
          style={{ x: still ? 0 : x }}
        >
          {stories.map((story, index) => (
            <StoryCard
              key={story.title}
              {...{ story, index, position, still, step }}
              progress={playback.progress}
            />
          ))}
        </motion.div>
        <div className="story-controls" aria-label="Story chapters">
          {stories.map((_, index) => (
            <button
              key={index}
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
            className="story-playback-toggle"
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
