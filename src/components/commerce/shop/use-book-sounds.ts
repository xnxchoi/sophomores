"use client";

import { Howl, Howler } from "howler";
import { useEffect } from "react";

/**
 * The shop's book sounds: stripe.press's sound module (63913 in 12s2, mapped in .tmp/stripe-notes/slice-S-sounds.md)
 * with the owner's Kenney files (public/assets/three/book/audio/PROVENANCE.md) in place of theirs. Their scene calls
 * its eight exports through globalThis.__SPSOUND (vendor change 10); the shop calls the same functions by name.
 *
 * | Their export, role | Where it plays | Our file |
 * |---|---|---|
 * | `t` hit | a cover slaps shut, a shelf pick settles, a book flips over | bookPlace1–3 |
 * | `B` crackle | an open starts from shut (200 ms in) | bookOpen |
 * | `J` settle hit | an open or close settles; a page jump of more than 3 | bookClose |
 * | `z` page turn | each turn (bar, keys, click, drag) | bookFlip1–3 |
 * | `D` flop, `X` grab, `r` shuffle | a page let go, a page taken, the pages fanning | bookFlip1–3, quieter |
 * | `G` rub | pointer or page friction | band-passed noise (theirs, no file) |
 *
 * Volumes, rates and throttles are theirs. Nothing plays before the first press, key or touch (browsers allow audio
 * only then; theirs waits the same way). Unlike theirs, every file is created and decoded at that first input rather
 * than at its first use, so the first turn isn't late by a decode.
 */
const DIR = "/assets/three/book/audio/";
const FILES = {
  open: ["bookOpen"], close: ["bookClose"],
  flip: ["bookFlip1", "bookFlip2", "bookFlip3"], place: ["bookPlace1", "bookPlace2", "bookPlace3"]
} as const;
type Role = keyof typeof FILES;
const UNLOCK = ["pointerdown", "keydown", "touchstart"] as const;

let unlocked = false, listening = false;
let howls: Record<Role, Howl[]> | null = null;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

function resume() {
  const context = Howler.ctx;
  if (context?.state === "suspended") context.resume().catch(() => undefined);
}

function load() {
  howls ??= Object.fromEntries((Object.keys(FILES) as Role[]).map((role) =>
    [role, FILES[role].map((name) => new Howl({ src: [DIR + name + ".ogg"], format: ["ogg"], preload: true, pool: 12 }))])) as Record<Role, Howl[]>;
  return howls;
}

function unlock() {
  unlocked = true;
  UNLOCK.forEach((type) => window.removeEventListener(type, unlock, true));
  resume(); load();
}

/** Their `d`: true once audio is allowed; until then it listens for the first input. */
function ready() {
  if (!unlocked && !listening && typeof window !== "undefined") {
    listening = true;
    UNLOCK.forEach((type) => window.addEventListener(type, unlock, { capture: true, passive: true }));
  }
  return unlocked;
}

function play(role: Role, volume: number, rate = 1) {
  if (!ready()) return;
  const howl = pick(load()[role]);
  const start = () => { resume(); const id = howl.play(); howl.volume(volume, id); howl.rate(rate, id); };
  if (howl.state() === "loaded") start(); else howl.once("load", start);
}

let hitUntil = 0, settledAt = 0;
let noise: AudioBuffer | null = null;
let rubVoice: { source: AudioBufferSourceNode; band: BiquadFilterNode; gain: GainNode; context: AudioContext; endsAt: number } | null = null;

/** Their `G` voice: one looping half-second of white noise through a band-pass and a gain, reused while it rings. */
function rubOn(context: AudioContext) {
  if (rubVoice && rubVoice.context === context && context.currentTime < rubVoice.endsAt) return rubVoice;
  if (rubVoice) { try { rubVoice.source.stop(); } catch { /* already stopped */ } rubVoice.source.disconnect(); }
  if (!noise || noise.sampleRate !== context.sampleRate) {
    const length = Math.floor(0.5 * context.sampleRate);
    noise = context.createBuffer(1, length, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = 2 * Math.random() - 1;
  }
  const source = context.createBufferSource(); source.buffer = noise; source.loop = true;
  const band = context.createBiquadFilter(); band.type = "bandpass"; band.frequency.value = 1200; band.Q.value = 0.9;
  const gain = context.createGain(); gain.gain.value = 0;
  source.connect(band).connect(gain).connect(context.destination); source.start();
  return (rubVoice = { source, band, gain, context, endsAt: Infinity });
}

export const bookSound = {
  /** `t`: a hit, louder and higher with strength; at most one per 150 ms. */
  hit(strength = 0.5) {
    if (!ready()) return;
    const now = performance.now();
    if (now < hitUntil) return;
    hitUntil = now + 150;
    const r = clamp01(strength);
    play("place", (0.02 + 0.98 * r) * (0.5 + 0.5 * Math.random()) * 0.5, 0.8 + 0.5 * r);
  },
  /** `B`: the spine giving as an open starts. */
  crackle(delayMs = 0) {
    if (!ready()) return;
    const go = () => play("open", 0.2);
    if (delayMs > 0) window.setTimeout(go, delayMs); else go();
  },
  /** `J`: the book settling open or shut; at most one per 250 ms. */
  settle(delayMs = 0) {
    if (!ready()) return;
    const go = () => { const now = performance.now(); if (now - settledAt < 250) return; settledAt = now; play("close", 0.25); };
    if (delayMs > 0) window.setTimeout(go, delayMs); else go();
  },
  /** `D`: a page let go, pitched up with its speed. */
  flop(speed = 0.5) { play("flip", 0.14, 0.8 + 0.25 * clamp01(speed)); },
  /** `X`: a page taken hold of. */
  grab() { play("flip", 0.1, 0.96 + 0.1 * Math.random()); },
  /** `r`: the pages fanning. */
  shuffle() { play("flip", 0.25, 0.98 + 0.08 * Math.random()); },
  /** `z`: a page turn; forward turns run higher, faster turns higher still. */
  turn(direction: "forward" | "backward", speed = 0) {
    const n = clamp01(speed);
    play("flip", 0.25, direction === "forward" ? 1.1 + 0.7 * n : 0.91 + 0.26 * n);
  },
  /** `G`: friction, a short swell of band-passed noise (cover lower and narrower than paper). */
  rub(speed = 0.5, surface: "paper" | "cover" = "paper", tune: { freqMul?: number; gainMul?: number; qMul?: number } = {}) {
    if (!ready()) return;
    const context = Howler.ctx;
    if (!context) return;
    resume();
    const voice = rubOn(context), u = clamp01(speed), now = context.currentTime, cover = surface === "cover";
    const spread = (cover ? 0.5 : 0.6) + Math.random() * (cover ? 1 : 0.8);
    voice.band.Q.setTargetAtTime((cover ? 2 : 0.9) * (tune.qMul ?? 1), now, 0.03);
    voice.band.frequency.setTargetAtTime(((cover ? 55 : 110) + u * (cover ? 240 : 450)) * spread * (tune.freqMul ?? 1), now, 0.03);
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime((0.015 + 0.05 * u) * 0.196 * (cover ? 1.15 : 1) * (tune.gainMul ?? 1), now, 0.02);
    const off = now + 0.09;
    voice.gain.gain.setTargetAtTime(0, off, 0.06);
    try { voice.source.stop(off + 0.48); voice.endsAt = off + 0.48; } catch { /* already stopped */ }
  }
};

/** Their export letters, as the scene calls them through the forwarder. */
const exports = {
  t: bookSound.hit, B: bookSound.crackle, J: bookSound.settle, D: bookSound.flop,
  X: bookSound.grab, G: bookSound.rub, r: bookSound.shuffle, z: bookSound.turn
};

/** Arms the first-input unlock and hands the scene its sounds while the shop is mounted. */
export function useBookSounds() {
  useEffect(() => {
    const global = globalThis as unknown as { __SPSOUND?: typeof exports };
    ready();
    global.__SPSOUND = exports;
    return () => { if (global.__SPSOUND === exports) delete global.__SPSOUND; };
  }, []);
}
