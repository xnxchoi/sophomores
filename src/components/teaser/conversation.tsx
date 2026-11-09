"use client";
import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";
import {
  animate,
  motion,
  type MotionValue,
  stagger,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform
} from "motion/react";
import { messages } from "@/lib/teaser/content";
import { useTeaserContent } from "./content-provider";
import {
  conversationPoses,
  createTimeline,
  scrollChapters,
  type ChapterId
} from "@/lib/teaser/choreography";
import { chapterGeometry } from "@/lib/teaser/step-motion";
import { useMobile } from "./use-device-flags";
import {
  subscribeVisibility,
  serverSnapshot,
} from "@/utils/browser/visibility";

export const messageVariants = {
  inactive: { backgroundColor: "#161616", color: "#fff" },
  first: { backgroundColor: "#292929", color: "#fff" },
  active: { backgroundColor: "#ff4c25", color: "#000" }
};

export const metaVariants = {
  inactive: { color: "#bbb" },
  first: { color: "#aaa" },
  active: { color: "#552014" }
};

export function TypingDots() {
  return (
    <span aria-hidden="true">
      {[0, 0.2, 0.4].map((delay) => (
        <motion.span
          key={delay}
          className="inline-block"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 0.8, delay, repeat: Infinity }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

const isVisible = () => document.visibilityState === "visible";

function Message({
  message,
  index,
  position,
  step,
  mobile,
  activeViewport
}: {
  message: { from: string; text: string };
  index: number;
  position: MotionValue<number>;
  step: number;
  mobile: boolean;
  activeViewport: boolean;
}) {
  const pose = conversationPoses[mobile ? "mobile" : "desktop"][index];
  const x = useTransform(position, [0, 1, 2], pose.x);
  const y = useTransform(position, [0, 1, 2], pose.y);
  const scale = useTransform(position, [0, 1, 2], pose.scale);
  const opacity = useTransform(position, [0, 1, 2], pose.opacity);
  const words = message.text.split(" ");
  const active = index === step;
  const variant = active ? (index === 0 ? "first" : "active") : "inactive";
  const reveal = active && activeViewport;
  return (
    <motion.article
      className="absolute top-1/2 left-1/2 flex w-[calc(100vw-36px)] max-w-[396px] flex-col gap-6 rounded-teaser-card bg-teaser-card p-6 md:w-[396px] short:max-md:gap-4 short:max-md:p-4.5"
      initial={false}
      animate={messageVariants[variant]}
      transition={{ duration: 0.45 }}
      style={{
        x: x,
        y: y,
        scale: scale,
        opacity: opacity
      }}
    >
      <motion.div
        className="flex justify-between gap-4 font-sans text-sm leading-[1.1] text-teaser-meta uppercase max-lg:text-xs"
        initial={false}
        animate={metaVariants[variant]}
        transition={{ duration: 0.35 }}
      >
        <span>{message.from}</span>
        <span>{index ? "Always" : "Now"}</span>
      </motion.div>
      <h2
        className="font-message text-teaser-body uppercase md:text-[21px] md:leading-[1.25]"
        aria-label={message.text}
      >
        {words.map((word, wordIndex) => (
          <motion.span
            key={`${wordIndex}-${reveal}`}
            aria-hidden="true"
            className="inline-block whitespace-pre"
            initial={reveal ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              delay: stagger(0.05)(wordIndex, words.length)
            }}
          >
            {word}
            {wordIndex < words.length - 1 ? " " : ""}
          </motion.span>
        ))}
      </h2>
      {index === 2 && (
        <Image
          src="/teaser/conversation.webp"
          alt="A surreal, brightly lit alligator — an unexpected interruption"
          width={696}
          height={392}
          sizes="(max-width: 767px) 85vw, 348px"
          className="h-auto w-full rounded-teaser-inset short:max-md:max-h-[150px] short:max-md:object-cover"
        />
      )}
    </motion.article>
  );
}

export function Conversation({
  onActive
}: {
  onActive: (id: ChapterId) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: activityProgress } = useScroll({
    target: ref,
    offset: ["start 40%", "end 40%"]
  });
  useMotionValueEvent(activityProgress, "change", (value) => {
    if (value > 0 && value < 1) onActive("strategy");
  });
  const mobile = useMobile();
  const inView = useInView(ref);
  const visible = useSyncExternalStore(
    subscribeVisibility,
    isVisible,
    serverSnapshot,
  );
  const activeViewport = inView && visible;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"]
  });

  const [step, setStep] = useState(0);
  const position = useMotionValue(0);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const next = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;
    if (next !== step) {
      setStep(next);
      animate(position, next, { duration: 0.65, ease: [0.25, 0.35, 0.35, 1] });
    }
  });

  const typing = step === 1 && activeViewport;
  const content = useTeaserContent();
  const activeMessages = content.messages || messages;
  return (
    <motion.section
      ref={ref}
      id="strategy"
      className="bg-black"
      style={{
        height: `${chapterGeometry(createTimeline(scrollChapters.strategy).travelVh).heightVh}svh`
      }}
      aria-label="The first night"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        {activeMessages.map((message, index) => (
          <Message
            key={`${index}-${message.from}`}
            {...{ message, index, position, step, mobile, activeViewport }}
          />
        ))}
        {typing && (
          <p className="text-teaser-caption absolute top-[calc(50%+115px)] left-6 font-sans leading-[1.1] text-teaser-subtle uppercase md:left-[calc(50%-78px)]">
            {content.typingNotice} <TypingDots />
          </p>
        )}
      </div>
    </motion.section>
  );
}
