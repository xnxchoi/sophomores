"use client";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { useChapterActivity } from "../../hooks/use-chapter-activity";
import {
  motion,
  type MotionValue,
  useInView,
  useTransform
} from "motion/react";
import { messages } from "@/lib/teaser/content";
import { type ChapterId, conversationPoses } from "@/lib/teaser/choreography";
import { useChapterScroll } from "../../hooks/use-chapter-scroll";
import { useMobile } from "./use-device-flags";
import {
  conversationMotion,
  messageColors,
  shouldAnimateTyping,
  wordRevealTransition
} from "@/lib/teaser/conversation-motion";
import { cn } from "@/lib/utils";

const subscribeVisibility = (callback: () => void) => {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
};
const isVisible = () => document.visibilityState === "visible";
const serverVisible = () => false;

function Message({
  index,
  position,
  step,
  mobile,
  activeViewport
}: {
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
  const message = messages[index];
  const words = message.text.split(" ");
  const active = index === step;
  const colors = messageColors(index, active);
  const reveal = active && activeViewport ;
  return (
    <motion.article
      className={`conversation-card message-${index} absolute top-1/2 left-1/2 flex w-[calc(100vw-36px)] max-w-[396px] flex-col gap-6 rounded-teaser-card bg-teaser-card p-6 md:w-[396px] short:max-md:gap-4 short:max-md:p-4.5 ${active ? "active" : ""}`}
      initial={false}
      animate={{ backgroundColor: colors.backgroundColor, color: colors.color }}
      transition={{ duration: conversationMotion.colorDuration }}
      style={{
        x: x,
        y: y,
        scale: scale,
        opacity: opacity
      }}
    >
      <motion.div
        className={cn(
          `message-meta font-sans text-sm leading-[1.1] text-teaser-meta max-lg:text-xs`,
          "flex justify-between gap-4 uppercase"
        )}
        initial={false}
        animate={{ color: colors.meta }}
        transition={{ duration: conversationMotion.colorDuration }}
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
            initial={
              reveal ? { opacity: 0, y: conversationMotion.wordOffsetY } : false
            }
            animate={{ opacity: 1, y: 0 }}
            transition={wordRevealTransition(wordIndex)}
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
          className="conversation-image h-auto w-full rounded-teaser-inset short:max-md:max-h-[150px] short:max-md:object-cover"
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
  const { ref, position, step, sectionStyle } = useChapterScroll(
    "strategy",
  );
  useChapterActivity(ref, "strategy", onActive);
  const mobile = useMobile();
  const inView = useInView(ref);
  const visible = useSyncExternalStore(
    subscribeVisibility,
    isVisible,
    serverVisible
  );
  const activeViewport = inView && visible;
  const typing = shouldAnimateTyping({ step, inView, visible });
  return (
    <motion.section
      ref={ref}
      id="strategy"
      className="scroll-section conversation-section bg-black"
      aria-label="The first night"
      style={sectionStyle}
    >
      <div
        className={cn(
          `stage conversation-stage`,
          "sticky top-0 h-svh overflow-hidden"
        )}
      >
        {messages.map((message, index) => (
          <Message
            key={message.text}
            {...{ index, position, step, mobile, activeViewport }}
          />
        ))}
        {typing && (
          <p className="typing-note absolute top-[calc(50%+115px)] left-6 font-sans text-teaser-caption leading-[1.1] text-teaser-subtle uppercase md:left-[calc(50%-78px)]">
            Sophomores is typing{" "}
            <span aria-hidden="true">
              {conversationMotion.typingDelays.map((delay) => (
                <motion.span
                  key={delay}
                  className="inline-block"
                  animate={{ opacity: [...conversationMotion.typingOpacity] }}
                  transition={{
                    duration: conversationMotion.typingDuration,
                    delay,
                    repeat: Infinity
                  }}
                >
                  .
                </motion.span>
              ))}
            </span>
          </p>
        )}
      </div>
    </motion.section>
  );
}
