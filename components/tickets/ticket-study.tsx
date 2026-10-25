"use client";

import { useState } from "react";
import { UserIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { FilmStudy } from "../invitation/film-study";
import { referenceFilm } from "@/lib/invitation/reference-media";
import { motionTokens } from "@/lib/motion-tokens";
import { BrandMark } from "@/lib/brand";
import { ticketNumberMotion } from "@/lib/tickets/motion";
import {
  changeTicketQuantity,
  computeTicketTotal,
  studyTicketBounds,
  ticketQuantityLabel
} from "@/lib/tickets/tickets";

const sampleAmountMinor = 50_000;
const ignoreModalState = () => {};
const currencyFormatter = new Intl.NumberFormat("en-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0
});

export function TicketStudy() {
  const [quantity, setQuantity] = useState<number>(studyTicketBounds.minimum);
  const [sampleEnabled, setSampleEnabled] = useState(false);

  const amount = sampleEnabled ? sampleAmountMinor : null;
  const total = computeTicketTotal(amount, quantity);
  const label = ticketQuantityLabel(quantity);
  const tap = { scale: motionTokens.scale.press };

  return (
    <main className="ticket-study">
      <header className="ticket-study__header">
        <BrandMark asChild>
          <a
            className="ticket-study__wordmark"
            href="/studies/warp"
            aria-label="Sophomores — back to intro study"
          >
            sophomores
          </a>
        </BrandMark>
        <a className="ticket-study__back" href="/studies/warp">
          Back to the story <span aria-hidden="true">↗</span>
        </a>
      </header>

      <div className="ticket-study__notice">
        Local interaction study. No tickets are on sale here.
      </div>

      <div className="ticket-study__layout">
        <section
          className="ticket-study__choice"
          aria-labelledby="ticket-study-heading"
        >
          <p className="ticket-study__eyebrow">
            The first night / ticket study
          </p>
          <h1
            id="ticket-study-heading"
            className="mt-8 font-teaser-serif text-[clamp(42px,5.4vw,88px)] leading-[1.02] font-normal tracking-[-0.04em] [text-wrap:balance]"
          >
            A night.
            <br />
            Your company.
          </h1>
          <div className="ticket-study__quantity">
            <p className="ticket-study__prompt" id="ticket-study-quantity">
              How many tickets?
            </p>
            <div
              className="ticket-study__stepper"
              role="group"
              aria-labelledby="ticket-study-quantity"
              aria-describedby="ticket-study-demo-range"
            >
              <motion.button
                type="button"
                aria-label="Remove one ticket"
                disabled={quantity === studyTicketBounds.minimum}
                onClick={() =>
                  setQuantity((current) => changeTicketQuantity(current, -1))
                }
                whileTap={tap}
                transition={{ duration: motionTokens.duration.fast }}
              >
                −
              </motion.button>
              <span className="ticket-study__counter" aria-hidden="true">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span key={quantity} {...ticketNumberMotion()}>
                    {String(quantity).padStart(2, "0")}
                  </motion.span>
                </AnimatePresence>
              </span>
              <motion.button
                type="button"
                aria-label="Add one ticket"
                disabled={quantity === studyTicketBounds.maximum}
                onClick={() =>
                  setQuantity((current) => changeTicketQuantity(current, 1))
                }
                whileTap={tap}
                transition={{ duration: motionTokens.duration.fast }}
              >
                +
              </motion.button>
            </div>
            <p className="ticket-study__range" id="ticket-study-demo-range">
              Demo range: 1–6. Not a confirmed booking limit.
            </p>
          </div>

          <div className="ticket-study__people" aria-hidden="true">
            {Array.from({ length: studyTicketBounds.maximum }, (_, index) => (
              <motion.span
                key={index}
                initial={false}
                animate={{ opacity: index < quantity ? 1 : 0.16 }}
                transition={{ duration: motionTokens.duration.fast }}
              >
                <UserIcon weight="fill" aria-hidden="true" />
              </motion.span>
            ))}
          </div>
        </section>

        <section
          className="ticket-study__summary"
          aria-labelledby="ticket-study-summary"
        >
          <div className="ticket-study__summary-top">
            <p className="ticket-study__eyebrow">
              For the first night together.
            </p>
            <span aria-hidden="true">↘</span>
          </div>
          <h2
            id="ticket-study-summary"
            className="mt-10 font-teaser-serif text-[clamp(35px,4vw,58px)] leading-[1.1] font-normal tracking-[-0.025em]"
          >
            First night
          </h2>
          <p className="ticket-study__provisional">
            Working title. Ticket details are still taking shape.
          </p>

          <div
            className="ticket-study__receipt"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="ticket-study__line">
              <span>Your selection</span>
              <span>{label}</span>
            </p>
            {sampleEnabled && (
              <p className="ticket-study__sample-warning">
                TEST PRICE — NOT AN OFFER
              </p>
            )}
            <p className="mt-7 font-teaser-serif text-[clamp(28px,3.2vw,45px)] leading-[1.12] font-normal tracking-[-0.025em] [text-wrap:balance] tabular-nums">
              {total === null
                ? "Price to be announced"
                : currencyFormatter.format(total)}
            </p>
            <p className="ticket-study__price-note">
              {amount === null
                ? "No price has been set for this study."
                : `${currencyFormatter.format(amount)} × ${quantity}. Example arithmetic only.`}
            </p>
          </div>

          <a className="ticket-study__cta" href="/studies/invitation">
            Notify me when tickets open <span aria-hidden="true">↗</span>
          </a>
          <p className="ticket-study__cta-note">
            Opens a local invitation preview. No registration or reservation is
            made.
          </p>
          <div className="ticket-study__film">
            <FilmStudy
              still={false}
              onModalChange={ignoreModalState}
              media={referenceFilm}
            />
            <p className="ticket-study__film-note">
              Analogue reference clip. Local player study, not a Sophomores
              film.
            </p>
          </div>

          <details className="ticket-study__test-controls">
            <summary>Test the calculator with sample values</summary>
            <label>
              <input
                type="checkbox"
                checked={sampleEnabled}
                onChange={(event) => setSampleEnabled(event.target.checked)}
              />{" "}
              Use a ₩50,000 test price — not an offer
            </label>
            <p>
              Developer preview only. This is not an announced price, checkout,
              or fee estimate.
            </p>
          </details>
        </section>
      </div>

      <footer className="ticket-study__footer">
        <p>Still to be confirmed</p>
        <p>Price · date · venue · inclusions · capacity · ticket policy</p>
        <a href="/studies/warp">
          Back to intro study <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </main>
  );
}
