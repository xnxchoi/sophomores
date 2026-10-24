"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion } from "motion/react";
import {
  canStartStepTransition,
  hasStepArrived,
  invitationStepVariants
} from "../../lib/invitation/step-motion";
import {
  initialRegistration,
  validateRegistrationStep,
  type RegistrationStep
} from "../../lib/invitation/registration";

const questions = ["email", "name", "review"] as const;
const titles: Record<RegistrationStep, string> = {
  intro: "The first invitation.",
  email: "Where should the invitation find you?",
  name: "What should we call you?",
  review: "A last look.",
  complete: "Preview complete."
};

export function InvitationForm({
  onExit,
  still
}: {
  onExit: () => void;
  still: boolean;
}) {
  const [step, setStep] = useState<RegistrationStep>("intro");
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const pendingStep = useRef<RegistrationStep | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const fieldInput = useRef<HTMLInputElement>(null);
  const quiet = still;
  const form = useForm({ defaultValues: initialRegistration() });
  const currentIndex = questions.findIndex((question) => question === step);

  useEffect(() => {
    if (!transitioning) heading.current?.focus({ preventScroll: true });
  }, [transitioning]);

  function goTo(next: RegistrationStep) {
    if (!canStartStepTransition(step, next, pendingStep.current)) return;
    pendingStep.current = next;
    setTransitioning(true);
    setError(null);
    setStep(next);
  }

  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingStep.current) return;
    const issue = validateRegistrationStep(step, form.state.values);
    setError(issue);
    if (issue) {
      fieldInput.current?.focus({ preventScroll: true });
      return;
    }
    if (step === "email") goTo("name");
    else if (step === "name") goTo("review");
    else if (step === "review") goTo("complete");
  }

  return (
    <section
      className="invitation-form"
      aria-label="Invitation preview"
      data-still={quiet}
    >
      <div className="invitation-form-topline">
        <button className="invitation-form-exit" type="button" onClick={onExit}>
          <span aria-hidden="true">←</span> Back to study
        </button>
        <p className="invitation-form-notice">
          Local study — nothing is sent or saved.
        </p>
      </div>

      <div
        className="invitation-form-stage"
        inert={transitioning}
        aria-busy={transitioning}
      >
        <AnimatePresence
          initial={false}
          mode="wait"
          onExitComplete={() => {
            if (pendingStep.current === "complete") form.reset();
          }}
        >
          <motion.div
            key={step}
            className="invitation-form-panel"
            variants={invitationStepVariants(quiet)}
            initial="hidden"
            animate="visible"
            exit="exit"
            onAnimationComplete={(definition) => {
              if (hasStepArrived(pendingStep.current, step, definition)) {
                pendingStep.current = null;
                setTransitioning(false);
              }
            }}
          >
            {currentIndex >= 0 && (
              <nav
                className="invitation-form-progress"
                aria-label="Preview steps"
              >
                {questions.map((question, index) => (
                  <button
                    key={question}
                    type="button"
                    disabled={index > currentIndex}
                    aria-label={`Step ${index + 1}: ${question === "name" ? "preferred name" : question}`}
                    aria-current={question === step ? "step" : undefined}
                    onClick={() => goTo(question)}
                  >
                    {index + 1}
                  </button>
                ))}
              </nav>
            )}
            <p className="invitation-form-eyebrow">
              {step === "complete"
                ? "End of study"
                : "An invitation, in three small steps"}
            </p>
            <h2
              className="mx-auto mb-8 max-w-[640px] font-teaser-serif text-[clamp(34px,4.4vw,62px)] font-normal leading-[1.05] tracking-[-0.025em] focus:outline-none [text-wrap:balance]"
              ref={heading}
              tabIndex={-1}
            >
              {titles[step]}
            </h2>

            {step === "intro" && (
              <div className="invitation-form-intro">
                <p>Leave an email for news of the first night.</p>
                <p className="invitation-form-support">
                  A preview of the invitation experience. No reservation. No
                  registration.
                </p>
                <button
                  className="invitation-form-primary"
                  type="button"
                  onClick={() => goTo("email")}
                >
                  Start <span aria-hidden="true">↗</span>
                </button>
              </div>
            )}

            {currentIndex >= 0 && (
              <form
                className="invitation-form-fields"
                noValidate
                onSubmit={advance}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.nativeEvent.isComposing || event.keyCode === 229)
                  )
                    event.preventDefault();
                }}
              >
                {step === "email" && (
                  <form.Field name="email">
                    {(field) => (
                      <div className="invitation-form-field">
                        <label htmlFor="invitation-email">Email</label>
                        <input
                          ref={fieldInput}
                          id="invitation-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          autoCapitalize="none"
                          spellCheck={false}
                          maxLength={254}
                          required
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            if (pendingStep.current) return;
                            field.handleChange(event.target.value);
                            setError(null);
                          }}
                          aria-invalid={Boolean(error)}
                          aria-describedby="invitation-form-help invitation-form-error"
                          placeholder="you@example.com"
                        />
                        <p
                          id="invitation-form-help"
                          className="invitation-form-support"
                        >
                          For news of the first night. This preview sends
                          nothing.
                        </p>
                      </div>
                    )}
                  </form.Field>
                )}
                {step === "name" && (
                  <form.Field name="preferredName">
                    {(field) => (
                      <div className="invitation-form-field">
                        <label htmlFor="invitation-name">
                          Preferred name <span>(optional)</span>
                        </label>
                        <input
                          ref={fieldInput}
                          id="invitation-name"
                          name="preferredName"
                          type="text"
                          autoComplete="given-name"
                          maxLength={80}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            if (pendingStep.current) return;
                            field.handleChange(event.target.value);
                            setError(null);
                          }}
                          aria-invalid={Boolean(error)}
                          aria-describedby="invitation-form-help invitation-form-error"
                          placeholder="Your name"
                        />
                        <p
                          id="invitation-form-help"
                          className="invitation-form-support"
                        >
                          Just the name you like to go by. You can skip this.
                        </p>
                      </div>
                    )}
                  </form.Field>
                )}
                {step === "review" && (
                  <>
                    <form.Subscribe selector={(state) => state.values}>
                      {(values) => (
                        <dl className="invitation-form-review">
                          <div>
                            <dt>Email</dt>
                            <dd>{values.email.trim()}</dd>
                            <button type="button" onClick={() => goTo("email")}>
                              Edit email
                            </button>
                          </div>
                          <div>
                            <dt>Name</dt>
                            <dd>
                              {values.preferredName.trim() || "Not provided"}
                            </dd>
                            <button type="button" onClick={() => goTo("name")}>
                              Edit name
                            </button>
                          </div>
                        </dl>
                      )}
                    </form.Subscribe>
                    <form.Field name="consent">
                      {(field) => (
                        <label
                          className="invitation-form-consent"
                          htmlFor="invitation-consent"
                        >
                          <input
                            ref={fieldInput}
                            id="invitation-consent"
                            name="consent"
                            type="checkbox"
                            checked={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => {
                              if (pendingStep.current) return;
                              field.handleChange(event.target.checked);
                              setError(null);
                            }}
                            aria-invalid={Boolean(error)}
                            aria-describedby="invitation-form-help invitation-form-error"
                          />
                          <span>
                            In this preview, I would choose to receive email
                            news about the first Sophomores night.
                          </span>
                        </label>
                      )}
                    </form.Field>
                    <p
                      id="invitation-form-help"
                      className="invitation-form-support"
                    >
                      This demonstrates a notification choice, not a reservation
                      or membership application. Nothing will be sent or saved.
                    </p>
                  </>
                )}

                <p
                  className="invitation-form-error"
                  id="invitation-form-error"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {error}
                </p>
                <div className="invitation-form-actions">
                  <button
                    type="button"
                    className="invitation-form-back"
                    onClick={() =>
                      goTo(
                        step === "email"
                          ? "intro"
                          : step === "name"
                            ? "email"
                            : "name"
                      )
                    }
                  >
                    Back
                  </button>
                  <button type="submit" className="invitation-form-primary">
                    {step === "review" ? "Finish preview" : "Next"}
                    <span aria-hidden="true">↗</span>
                  </button>
                  {step === "name" && (
                    <button
                      type="button"
                      className="invitation-form-back"
                      onClick={() => {
                        if (pendingStep.current) return;
                        form.setFieldValue("preferredName", "");
                        goTo("review");
                      }}
                    >
                      Skip
                    </button>
                  )}
                </div>
              </form>
            )}

            {step === "complete" && (
              <div className="invitation-form-intro">
                <p>Nothing was sent. You are not registered.</p>
                <p className="invitation-form-support">
                  Your preview entries have been cleared.
                </p>
                <button
                  className="invitation-form-primary"
                  type="button"
                  onClick={onExit}
                >
                  Back to study <span aria-hidden="true">↗</span>
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
