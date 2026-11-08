"use client";

import { useRef } from "react";
import { useScroll, useTransform, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import s from "./EventTeaser.module.scss";

/**
 * Cinematic FOMO section. Dark, film-grain, parallax.
 *
 * Reference vibes (per Sean):
 *   - Enfants Riches Déprimés — distressed luxe, intentional decay
 *   - Hedi Slimane (Saint Laurent) — b&w rock-portrait grain
 *   - Midnight Rodeo — Western-noir, neon
 *   - Alexander DiGenova — quiet luxe portraiture
 *
 * Layered parallax (back → front):
 *   1. Atmosphere (radial gradients + grain overlay) — slowest
 *   2. Photo collage (3 stills, offset) — medium
 *   3. Big slogan + redacted metadata — faster
 *   4. Mono labels / locations — fastest
 *
 * Drop real party photos at /public/teasers/{1,2,3}.{jpg,webp} when available.
 * Until then, evocative gradient panels stand in.
 */

const EVENTS: {
  tag: string;
  location: string;
  date: string;
  caption: string;
  src?: string;
  tone: "amber" | "rose" | "ash";
}[] = [
  {
    tag: "▮▮▮▮▮▮ ▮▮▮▮▮▮▮",
    location: "Hannam · Seoul",
    date: "2026.0?",
    caption:
      "Black tie. Strict door. The smaller print on the invite said 'no phones.'",
    src: "/teasers/1.jpg",
    tone: "ash"
  },
  {
    tag: "▮▮▮▮▮▮▮▮ ▮▮",
    location: "Itaewon · undisclosed",
    date: "Q2 · 2026",
    caption:
      "A converted concrete shop. One bartender. One playlist. One room you couldn't see into from the street.",
    src: "/teasers/2.jpg",
    tone: "amber"
  },
  {
    tag: "▮▮▮▮▮ ▮▮▮▮▮▮▮▮▮▮",
    location: "Seongsu · members only",
    date: "later this year",
    caption: "Dinner for 14. The seating chart was the gift.",
    src: "/teasers/3.jpg",
    tone: "rose"
  }
];

export function EventTeaserParallax() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Each layer moves at a different rate.
  const atmosphereY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const photo1Y = useTransform(scrollYProgress, [0, 1], ["12%", "-12%"]);
  const photo2Y = useTransform(scrollYProgress, [0, 1], ["18%", "-18%"]);
  const photo3Y = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);
  const sloganY = useTransform(scrollYProgress, [0, 1], ["20%", "-25%"]);
  const labelsY = useTransform(scrollYProgress, [0, 1], ["30%", "-35%"]);
  const sloganOpacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0, 1, 1, 0.4]
  );

  return (
    <section ref={ref} aria-labelledby="event-teaser" className={s.section}>
      <m.div
        className={s.atmosphere}
        style={reduced ? undefined : { y: atmosphereY }}
        aria-hidden
      />
      <div className={s.grain} aria-hidden />

      <div className={s.layout}>
        <m.div
          className={s.photo}
          data-i="1"
          data-tone={EVENTS[0].tone}
          style={reduced ? undefined : { y: photo1Y }}
        >
          <div
            className={s.photoMedia}
            style={
              EVENTS[0].src
                ? { backgroundImage: `url(${EVENTS[0].src})` }
                : undefined
            }
          >
            <span className={s.photoFallback} aria-hidden>
              {EVENTS[0].tag}
            </span>
          </div>
          <div className={s.photoMeta}>
            <div className={s.eyebrow}>
              {EVENTS[0].location} · {EVENTS[0].date}
            </div>
            <p className={s.caption}>{EVENTS[0].caption}</p>
          </div>
        </m.div>

        <m.div
          className={s.slogan}
          style={reduced ? undefined : { y: sloganY, opacity: sloganOpacity }}
        >
          <p className={s.eyebrowAccent}>You weren't there.</p>
          <h2 id="event-teaser" className={s.headline}>
            <span className={s.headlineLine}>The kind of</span>
            <span className={s.headlineLine}>
              <em>night</em> people
            </span>
            <span className={s.headlineLine}>
              describe in <em>fragments.</em>
            </span>
          </h2>
          <p className={s.subline}>
            Patrons get the address two days before. Phones at the door. The
            photos take a month to surface — if they surface at all.
          </p>
        </m.div>

        <m.div
          className={s.photo}
          data-i="2"
          data-tone={EVENTS[1].tone}
          style={reduced ? undefined : { y: photo2Y }}
        >
          <div
            className={s.photoMedia}
            style={
              EVENTS[1].src
                ? { backgroundImage: `url(${EVENTS[1].src})` }
                : undefined
            }
          >
            <span className={s.photoFallback} aria-hidden>
              {EVENTS[1].tag}
            </span>
          </div>
          <div className={s.photoMeta}>
            <div className={s.eyebrow}>
              {EVENTS[1].location} · {EVENTS[1].date}
            </div>
            <p className={s.caption}>{EVENTS[1].caption}</p>
          </div>
        </m.div>

        <m.ul
          className={s.labels}
          style={reduced ? undefined : { y: labelsY }}
          aria-label="What you missed"
        >
          <li className={s.label}>00:42 · arrival</li>
          <li className={s.label}>02:11 · the toast</li>
          <li className={s.label}>03:04 · ▮▮▮▮ played</li>
          <li className={s.label}>04:18 · taxi · taxi · taxi</li>
        </m.ul>

        <m.div
          className={s.photo}
          data-i="3"
          data-tone={EVENTS[2].tone}
          style={reduced ? undefined : { y: photo3Y }}
        >
          <div
            className={s.photoMedia}
            style={
              EVENTS[2].src
                ? { backgroundImage: `url(${EVENTS[2].src})` }
                : undefined
            }
          >
            <span className={s.photoFallback} aria-hidden>
              {EVENTS[2].tag}
            </span>
          </div>
          <div className={s.photoMeta}>
            <div className={s.eyebrow}>
              {EVENTS[2].location} · {EVENTS[2].date}
            </div>
            <p className={s.caption}>{EVENTS[2].caption}</p>
          </div>
        </m.div>
      </div>

      <div className={s.fade} aria-hidden />
    </section>
  );
}
