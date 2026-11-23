"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent, ChangeEvent, FocusEvent } from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import type { Transition } from "motion/react";
import { motionTokens } from "../_shared/motion-tokens";
import styles from "./otp-input.module.css";

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  label: string;
  description?: string;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  inputMode?: "numeric" | "text";
  className?: string;
  /** Sophomores addition: ids of messages outside the field that also describe every cell (feedback, cooldowns). */
  "aria-describedby"?: string;
  /**
   * Sophomores addition: what typed or pasted text becomes before it fills the cells, or null to refuse it (the cells
   * stay as they were). Defaults to digits only for `numeric` and the text as given for `text`.
   */
  normalize?: (raw: string) => string | null;
}

/** Changed words rise in and unblur while unchanged words hold still. Assistive tech reads the plain copy. */
function MotionText({ text }: { text: string }) {
  const words = text.split(" ");
  return <><span className={styles.srOnly}>{text}</span><span className={styles.words} aria-hidden="true"><AnimatePresence initial={false} mode="popLayout">{words.map((word, index) => <motion.span key={`${index}:${word}`} className={styles.word}
    initial={{ opacity: 0, y: "0.35em", filter: `blur(${motionTokens.blur.soft}px)` }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    exit={{ opacity: 0, y: "-0.35em", filter: `blur(${motionTokens.blur.subtle}px)`, transition: { duration: motionTokens.duration.instant, ease: [...motionTokens.ease.standard] } }}
    transition={{ duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter] }}>{index < words.length - 1 ? `${word} ` : word}</motion.span>)}</AnimatePresence></span></>;
}

/** Helper and error copy: the row opens its height on a spring, then the words settle in. */
function FieldMessage({ id, text, className, alert }: { id?: string; text?: string; className?: string; alert?: boolean }) {
  return <AnimatePresence initial={false}>{text ? <MessageRow key="message" id={id} text={text} className={className} alert={alert} /> : null}</AnimatePresence>;
}

/** The row tracks the measured copy, so a longer message that wraps opens its next line instead of snapping. */
function MessageRow({ id, text, className, alert }: { id?: string; text: string; className?: string; alert?: boolean }) {
  const copyRef = useRef<HTMLSpanElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useEffect(() => {
    const node = copyRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry?.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <motion.span className={styles.messageSlot} initial={{ height: 0, opacity: 0 }} animate={{ height, opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { height: motionTokens.spring.smooth, opacity: { duration: motionTokens.duration.instant } } }} transition={{ height: motionTokens.spring.smooth, opacity: { duration: motionTokens.duration.fast } }}>
    <motion.span ref={copyRef} id={id} className={className} role={alert ? "alert" : undefined} initial={{ y: "0.35em", filter: `blur(${motionTokens.blur.subtle}px)` }} animate={{ y: 0, filter: "blur(0px)" }} transition={{ duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter] }}><MotionText text={text} /></motion.span>
  </motion.span>;
}

export function OtpInput({ length = 6, value = "", onChange, label, description, error, autoFocus = false, disabled = false, inputMode = "numeric", className, "aria-describedby": externalDescribedBy, normalize }: OtpInputProps) {
  const generatedId = useId();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  // Sophomores change: each slot keeps its position. Clearing an interior slot leaves a gap instead of shifting later
  // characters left. `value` stays the filled characters in order, so a parent only ever sees a complete code once
  // every slot is filled. When the parent changes `value` (normalising case, dropping a character, clearing), the filled slots take
  // its characters in order: a slot whose character the parent kept (in any case) takes the parent's character, and
  // a slot whose character the parent dropped is emptied. Only when `value` can't be matched that way are the slots
  // rebuilt from it.
  const [slots, setSlots] = useState<string[]>(() => Array.from({ length }, (_, index) => value[index] ?? ""));
  let values = slots;
  if (slots.join("") !== value) {
    let cursor = 0;
    const aligned = slots.map(character => {
      if (!character) return "";
      const kept = value[cursor];
      if (kept === undefined || kept.toLowerCase() !== character.toLowerCase()) return "";
      cursor += 1;
      return kept;
    });
    values = cursor === value.length && slots.length === length
      ? aligned
      : Array.from({ length }, (_, index) => value[index] ?? "");
    // A value longer than the row never matches its slots; only store a real change, so render settles.
    if (values.length !== slots.length || values.some((character, index) => character !== slots[index])) setSlots(values);
  }
  const commit = (next: string[]) => { setSlots(next); onChange?.(next.join("")); };
  const hintId = description ? `${generatedId}-description` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedBy = [hintId, errorId, externalDescribedBy].filter(Boolean).join(" ") || undefined;
  const focusAt = (index: number) => inputRefs.current[Math.max(0, Math.min(index, length - 1))]?.focus();
  const sanitize = (next: string) => normalize ? normalize(next) : inputMode === "numeric" ? next.replace(/\D/g, "") : next;
  // One ring for the whole row. It glides between slots while focus stays inside, and fades in where focus lands when it arrives from outside.
  const [ring, setRing] = useState({ x: 0, width: 0, shown: false, glide: false });
  // A paste fills several slots in one update; those digits land as a short left to right wave.
  const shape = values.map(character => character || " ").join("");
  const [fill, setFill] = useState({ shape, wave: false });
  if (fill.shape !== shape) setFill({ shape, wave: Array.from({ length }, (_, index) => (fill.shape[index] ?? " ") !== shape[index]).filter(Boolean).length > 1 });
  const lastError = useRef(error);

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
  }, [autoFocus]);

  // Slots shrink at narrow widths; keep the ring on the focused slot when the row resizes.
  useEffect(() => {
    const row = scope.current;
    if (!row || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const slot = (row.contains(document.activeElement) ? document.activeElement?.parentElement : null) as HTMLElement | null;
      if (slot) setRing(current => (current.x === slot.offsetLeft && current.width === slot.offsetWidth ? current : { ...current, x: slot.offsetLeft, width: slot.offsetWidth, glide: false }));
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, [scope]);

  // A new error nudges the row side to side once, so a rejected code reads as a response to the attempt.
  useEffect(() => {
    // motion: shake keyframes are a physical cue and keep their own duration.
    if (error && error !== lastError.current && scope.current) animate(scope.current, { x: [0, -6, 5, -3, 2, 0] }, { duration: .36, ease: [...motionTokens.ease.standard] });
    lastError.current = error;
  }, [error, animate, scope]);

  const updateAt = (index: number, raw: string) => {
    const next = values.slice();
    const clean = raw.slice(-1);
    next[index] = clean;
    commit(next);
    if (clean && index < length - 1) focusAt(index + 1);
  };

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const raw = sanitize(event.target.value);
    if (raw === null) return;
    // Sophomores change: cells have no maxLength, so a one-time code autofilled (iOS from Mail or Messages, Android's
    // autofill) or pasted into any cell arrives whole. A full-length code fills the row from the first cell.
    if (raw.length >= length) {
      fillFrom(0, raw);
      return;
    }
    // Typing into a filled cell gives the old character plus the new one; the new one replaces it.
    const old = values[index];
    if (old && raw.length === 2 && (raw[0] === old || raw[1] === old)) {
      updateAt(index, raw[0] === old ? raw[1] : raw[0]);
      return;
    }
    if (raw.length <= 1) {
      updateAt(index, raw);
      return;
    }

    const next = values.slice();
    raw.slice(0, length - index).split("").forEach((character, offset) => { next[index + offset] = character; });
    commit(next);
    focusAt(Math.min(index + raw.length, length - 1));
  };
  const fillFrom = (index: number, text: string) => {
    const next = values.slice();
    text.slice(0, length - index).split("").forEach((character, offset) => { next[index + offset] = character; });
    commit(next);
    focusAt(Math.min(index + text.length, length - 1));
  };
  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const whole = sanitize(event.clipboardData.getData("text"));
    if (whole && whole.length >= length) {
      fillFrom(0, whole);
      return;
    }
    const pasted = whole?.slice(0, length - index);
    if (!pasted) return;
    const next = values.slice();
    pasted.split("").forEach((character, offset) => { next[index + offset] = character; });
    commit(next);
    focusAt(Math.min(index + pasted.length, length - 1));
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); focusAt(index - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); focusAt(index + 1); }
    if (event.key === "Backspace" && !values[index] && index > 0) {
      event.preventDefault();
      const next = values.slice();
      next[index - 1] = "";
      commit(next);
      focusAt(index - 1);
    }
    if (event.key === "Delete" && values[index]) {
      const next = values.slice();
      next[index] = "";
      commit(next);
    }
  };
  const handleFocus = (event: FocusEvent<HTMLInputElement>) => { const slot = event.currentTarget.parentElement as HTMLElement; setRing(current => ({ x: slot.offsetLeft, width: slot.offsetWidth, shown: true, glide: current.shown })); };
  const handleBlur = (event: FocusEvent<HTMLInputElement>) => { if (!scope.current?.contains(event.relatedTarget as Node | null)) setRing(current => ({ ...current, shown: false, glide: false })); };
  const glyphTransition = (index: number): Transition => ({ duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter], delay: fill.wave ? index * motionTokens.stagger.item : 0 });

  return <div className={[styles.field, className].filter(Boolean).join(" ")}>
    <span className={styles.label}>{label}</span>
    <div ref={scope} className={styles.inputs} role="group" aria-label={label} data-invalid={error ? "true" : undefined}>
      {values.map((character, index) => <div key={`${generatedId}-${index}`} className={styles.slot}>
        <input
          ref={(node) => { inputRefs.current[index] = node; }}
          className={styles.input}
          aria-label={`${label}, digit ${index + 1} of ${length}`}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          value={character}
          data-filled={character ? "true" : undefined}
          inputMode={inputMode}
          autoCapitalize={inputMode === "text" ? "characters" : undefined}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          disabled={disabled}
          onChange={(event) => handleChange(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {/* The input text is transparent; this copy of the digit rises into the slot and unblurs. */}
        <AnimatePresence initial={false}>{character ? <motion.span key={character} className={styles.glyph} aria-hidden="true" initial={{ opacity: 0, y: "0.35em", filter: `blur(${motionTokens.blur.soft}px)` }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, scale: .9, filter: `blur(${motionTokens.blur.subtle}px)`, transition: { duration: motionTokens.duration.instant, ease: [...motionTokens.ease.standard] } }} transition={glyphTransition(index)}>{character}</motion.span> : null}</AnimatePresence>
      </div>)}
      <motion.span className={styles.ring} aria-hidden="true" initial={false} animate={{ x: ring.x, width: ring.width, opacity: ring.shown ? 1 : 0, scale: ring.shown ? 1 : .94 }} transition={{ x: ring.glide ? motionTokens.spring.snappy : { duration: 0 }, width: { duration: 0 }, scale: motionTokens.spring.snappy, opacity: { duration: motionTokens.duration.fast } }} />
    </div>
    <FieldMessage id={hintId} text={description} className={styles.description} />
    <FieldMessage id={errorId} text={error} className={styles.error} alert />
  </div>;
}
