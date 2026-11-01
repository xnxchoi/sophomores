"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { motion, useAnimate, useIsPresent, type AnimationPlaybackControlsWithThen } from "motion/react";
import {
  Check,
  CircleCheck,
  CircleX,
  Clock3,
  Copy,
  Fingerprint,
  LoaderCircle,
  TriangleAlert
} from "lucide-react";
import { cn } from "../../lib/utils";
import { motionTokens } from "../../lib/motion-tokens";
import { phaseCopy } from "./_shared/account-phase-copy";
import type {
  AccountPhaseViewProps,
  PhaseAction
} from "./_shared/account-phase-types";
import {
  StudyChoiceAction,
  StudyCodeField,
  StudyField,
  StudyPrimaryAction,
  StudyTextAction
} from "./study-controls";

type Props = AccountPhaseViewProps;
type CopyText = (typeof phaseCopy)[Props["locale"]];

function PhaseSpinner({ visible, size, duration, className }: {
  visible: boolean;
  size: number;
  duration: number;
  className?: string;
}) {
  const [scope, animate] = useAnimate<SVGSVGElement>();
  const playback = useRef<AnimationPlaybackControlsWithThen | null>(null);
  useEffect(() => {
    playback.current = animate(scope.current, { rotate: [0, 360] }, {
      duration, ease: "linear", repeat: Infinity,
    });
    return () => playback.current?.stop();
  }, [animate, scope, duration]);
  useEffect(() => {
    // Pause the same native playback so hidden phases retain their exact angle.
    if (visible) playback.current?.play();
    else playback.current?.pause();
  }, [visible]);
  return <LoaderCircle ref={scope} aria-hidden="true" size={size} strokeWidth={1.5} className={className} />;
}

export const AccountPhaseViews = forwardRef<HTMLDivElement, Props>(
  function AccountPhaseViews(props, ref) {
    const body = useRef<HTMLDivElement>(null);
    const wasBusy = useRef(props.busy);
    const present = useIsPresent();
    useLayoutEffect(() => {
      if (!present || document.visibilityState === "hidden") return;
      const target =
        body.current?.querySelector<HTMLElement>("input") ??
        body.current?.querySelector<HTMLElement>("h3");
      target?.focus({ preventScroll: true });
    }, [present, props.phase]);
    useLayoutEffect(() => {
      const finished = wasBusy.current && !props.busy;
      wasBusy.current = props.busy;
      if (
        finished &&
        present &&
        props.phase === "email-code" &&
        (!props.code ||
          props.invalid === "code" ||
          props.failure === "invalid-code") &&
        document.visibilityState !== "hidden"
      ) {
        const input = body.current?.querySelector<HTMLInputElement>("input");
        input?.focus({ preventScroll: true });
        if (props.invalid === "code" || props.failure === "invalid-code")
          input?.select();
      }
    }, [
      present,
      props.busy,
      props.code,
      props.invalid,
      props.failure,
      props.phase
    ]);

    return (
      <motion.div
        className="[font-family:system-ui]"
        ref={(element) => {
          body.current = element;
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
        }}
        data-account-phase-body={props.phase}
        data-account-phase={props.phase}
        inert={!present}
        aria-hidden={!present}
        initial={{ opacity: 0, y: motionTokens.distance.sm }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -motionTokens.distance.sm }}
        transition={{
          duration: motionTokens.duration.fast,
          ease: motionTokens.easing.smooth
        }}
      >
        <PhaseContent {...props} />
        <span role={props.busy ? "status" : undefined} aria-live="polite" className="sr-only">
          {props.busy ? (props.pendingAction === "send-code" ? phaseCopy[props.locale].sending : props.pendingAction === "verify-code" ? phaseCopy[props.locale].verifying : phaseCopy[props.locale].busy) : null}
        </span>
      </motion.div>
    );
  }
);

function PhaseContent(props: Props) {
  const t = phaseCopy[props.locale];
  switch (props.phase) {
    case "entry":
      return <EmailEntry {...props} />;
    case "email-code":
      return <EmailCode {...props} />;
    case "passkey":
      return <Passkey {...props} />;
    case "phone":
      return <PhoneEntry {...props} />;
    case "waiting":
      return <Waiting {...props} />;
    case "review":
      return (
        <Outcome
          {...props}
          title={t.reviewHeading}
          help={t.reviewHelp}
          icon={<TriangleAlert />}
          action="retry"
          label={t.retry}
          changePhone
        />
      );
    case "phone-confirmed":
      return (
        <Outcome
          {...props}
          title={t.confirmedHeading}
          help={t.confirmedHelp}
          icon={<CircleCheck />}
          action="finish"
          label={t.finish}
        />
      );
    case "complete":
      return <Completion {...props} />;
    case "expired":
      return (
        <Outcome
          {...props}
          title={t.expiredHeading}
          help={t.expiredHelp}
          icon={<Clock3 />}
          action="retry"
          label={t.retry}
        />
      );
    case "used":
      return (
        <Outcome
          {...props}
          title={t.usedHeading}
          help={t.usedHelp}
          icon={<CircleX />}
          action="retry"
          label={t.retry}
        />
      );
    case "error":
      return (
        <Outcome
          {...props}
          title={t.errorHeading}
          help={t.errorHelp}
          icon={<TriangleAlert />}
          action="retry"
          label={t.retry}
        />
      );
  }
}

function Intro({
  headingId,
  title,
  children,
  icon,
  renderHeading
}: {
  headingId: string;
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  renderHeading?: Props["renderHeading"];
}) {
  const heading = (
    <h3
      id={headingId}
      tabIndex={-1}
      className={cn("text-[24px] leading-[30px] font-medium tracking-[-0.025em] text-[#f4f4f3] outline-none", renderHeading && "pr-14")}
    >
      {title}
    </h3>
  );
  return (
    <div data-phase-intro="" className="mb-6 text-left">
      <div className="flex items-center gap-3">
        {icon && (
          <span
            aria-hidden="true"
            className="shrink-0 text-neutral-400 [&>svg]:size-6 [&>svg]:stroke-[1.5]"
          >
            {icon}
          </span>
        )}
        {renderHeading ? renderHeading(heading) : heading}
      </div>
      {children && (
        <div className="mt-2 text-[14px] leading-5 text-neutral-400">
          {children}
        </div>
      )}
    </div>
  );
}

function Submit({
  props,
  children,
  wide = true
}: {
  props: Props;
  children: ReactNode;
  wide?: boolean;
}) {
  const busy = props.busy && props.pendingAction !== "google" && props.pendingAction !== "passkey" && props.pendingAction !== "magic-link";
  return (
    <StudyPrimaryAction
      type="submit"
      data-phase-action="submit"
      disabled={
        props.busy ||
        props.submitDisabled ||
        (props.phase === "email-code" && Boolean(props.codeRecovery)) ||
        (props.verificationRemaining ?? 0) > 0 ||
        (props.phase === "email-code" && props.code.length !== 6) ||
        props.failure === "expired-code" ||
        props.failure === "attempts-exhausted" ||
        (props.failure === "rate-limited" &&
          (props.verificationRemaining ?? props.resendRemaining) > 0)
      }
      aria-busy={busy}
      className={cn("relative min-w-36", wide ? "w-full" : "ml-auto w-fit")}
    >
      {busy
        ? props.pendingAction === "send-code"
          ? phaseCopy[props.locale].sending
          : props.pendingAction === "verify-code"
            ? phaseCopy[props.locale].verifying
            : phaseCopy[props.locale].busy
        : children}
      {busy && (
        <PhaseSpinner
          visible={props.visible}
          size={15}
          duration={1}
          className="absolute right-4"
        />
      )}
    </StudyPrimaryAction>
  );
}

function Feedback({
  id,
  children,
  className,
  failure,
  followup,
  retryRemaining,
  locale = "en",
  quiet = false
}: {
  id: string;
  children?: ReactNode;
  className?: string;
  failure?: Props["failure"];
  followup?: ReactNode;
  retryRemaining?: number;
  locale?: Props["locale"];
  quiet?: boolean;
}) {
  const neutral =
    failure === "passkey-cancelled" || failure === "provider-denied";
  const message = failure ? phaseCopy[locale].failures[failure] : children;
  const hasFeedback = Boolean(message || followup || (retryRemaining ?? 0) > 0);
  return (
    <motion.p
      id={id}
      initial={false}
      animate={{ opacity: hasFeedback ? 1 : 0, height: hasFeedback ? "auto" : 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        hasFeedback ? "my-2 overflow-hidden text-[13px] leading-5 text-neutral-200" : "sr-only",
        className
      )}
    >
      <span
        role={
          (message || followup) && !quiet
            ? neutral
              ? "status"
              : "alert"
            : undefined
        }
        aria-live={
          quiet
            ? "off"
            : (message || followup) && !neutral
              ? "assertive"
              : "polite"
        }
        aria-atomic="true"
      >
        {message}
        {followup && <span className="block"> {followup}</span>}
      </span>
      {(retryRemaining ?? 0) > 0 && (
        <span role="timer" aria-live="off" className="block">
          {phaseCopy[locale].retryIn}{" "}
          <span className="font-mono tabular-nums">
            {Math.floor((retryRemaining ?? 0) / 60)}:
            {String((retryRemaining ?? 0) % 60).padStart(2, "0")}
          </span>
        </span>
      )}
    </motion.p>
  );
}

function EmailEntry(props: Props) {
  const t = phaseCopy[props.locale];
  const invalid = props.invalid === "email";
  return (
    <>
      <Intro
        headingId={props.headingId}
        renderHeading={props.renderHeading}
        title={props.flow === "login" ? t.login : t.signup}
      >
        {props.flow === "login" ? t.loginHelp : t.signupHelp}
      </Intro>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          props.onAction("submit");
        }}
        noValidate
      >
        <StudyField
          id={`${props.headingId}-email`}
          label={t.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          value={props.email}
          disabled={props.busy}
          aria-invalid={invalid}
          aria-describedby={`${props.headingId}-feedback`}
          onChange={(event) => props.onField("email", event.target.value)}
        />
        <Feedback
          id={`${props.headingId}-feedback`}
          failure={props.failure}
          locale={props.locale}
          quiet={!props.failure && !invalid && props.resendRemaining > 0}
        >
          {invalid
            ? t.emailInvalid
            : props.resendRemaining > 0
              ? `${t.retryIn} ${Math.floor(props.resendRemaining / 60)}:${String(props.resendRemaining % 60).padStart(2, "0")}`
              : null}
        </Feedback>
        <div className="mt-4 space-y-2">
          <Submit props={props}>{t.continue}</Submit>
          {!props.googleDisabled && (
            <StudyTextAction
              data-phase-action="google"
              className="relative w-full px-3 text-[14px] font-medium text-neutral-300 disabled:opacity-40 aria-busy:opacity-80"
              disabled={props.busy}
              aria-busy={props.busy && props.pendingAction === "google"}
              onClick={() => props.onAction("google")}
            >
              {props.busy && props.pendingAction === "google" ? t.busy : t.google}
              {props.busy && props.pendingAction === "google" && (
                <PhaseSpinner visible={props.visible} size={15} duration={1} className="absolute right-4" />
              )}
            </StudyTextAction>
          )}
        </div>
      </form>
    </>
  );
}

function EmailCode(props: Props) {
  const t = phaseCopy[props.locale];
  const invalid = props.invalid === "code";
  return (
    <div className="w-full">
      <Intro
        headingId={props.headingId}
        title={t.emailHeading}
        renderHeading={props.renderHeading}
      >
        <p>
          {t.emailHelp}{" "}
          <span className="block mt-1 font-medium break-all text-neutral-200">
            {props.email}
          </span>
        </p>
      </Intro>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          props.onAction("submit");
        }}
        noValidate
      >
        <StudyCodeField
          id={`${props.headingId}-code`}
          label={t.code}
          value={props.code}
          disabled={
            props.busy ||
            props.submitDisabled ||
            Boolean(props.codeRecovery) ||
            (props.verificationRemaining ?? 0) > 0 ||
            props.failure === "expired-code" ||
            props.failure === "attempts-exhausted" ||
            (props.failure === "rate-limited" &&
              (props.verificationRemaining ?? props.resendRemaining) > 0)
          }
          invalid={invalid || props.failure === "invalid-code"}
          descriptionId={`${props.headingId}-feedback`}
          visible={props.visible}
          onChange={(value) => props.onField("code", value)}
          onComplete={props.onCodeComplete}
        />
        <Feedback
          id={`${props.headingId}-feedback`}
          className="text-left"
          failure={props.failure}
          followup={
            props.codeRecovery && props.failure !== props.codeRecovery
              ? t.newCodeRequired
              : undefined
          }
          retryRemaining={
            props.verificationRemaining ??
            (props.failure === "rate-limited"
              ? props.resendRemaining
              : undefined)
          }
          locale={props.locale}
        >
          {invalid ? t.codeInvalid : null}
        </Feedback>
        <div className="mt-4">
          <Submit props={props} wide>{t.verify}</Submit>
        </div>
        <InlineEmailResend props={props} />
        {props.onEditEmail && (
          <StudyTextAction
            className="mx-auto mt-1 min-h-11 px-3 text-[13px] text-neutral-400"
            disabled={props.busy}
            onClick={props.onEditEmail}
          >
            {t.changeEmail}
          </StudyTextAction>
        )}
      </form>
    </div>
  );
}

function InlineEmailResend({ props }: { props: Props }) {
  const t = phaseCopy[props.locale];
  const coolingDown = props.resendRemaining > 0;
  const countdown = `${Math.floor(props.resendRemaining / 60)}:${String(props.resendRemaining % 60).padStart(2, "0")}`;
  return (
    <div className="mt-2 flex min-h-11 items-center justify-center text-[13px] leading-5">
      <StudyTextAction
        data-phase-action="retry"
        disabled={props.busy || props.resendDisabled || coolingDown}
        aria-label={coolingDown ? undefined : `${t.codeRecovery} ${t.resend}`}
        onClick={() => props.onAction("retry")}
        className="min-h-11 w-44 gap-1 rounded-md px-3 text-[13px] font-normal text-neutral-400 underline decoration-white/30 underline-offset-4 hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:text-neutral-500 disabled:no-underline"
      >
        {coolingDown ? (
          <>
            {t.resendIn}{" "}
            <span className="font-mono tabular-nums">{countdown}</span>
          </>
        ) : (
          t.codeRecovery
        )}
      </StudyTextAction>
    </div>
  );
}

function Passkey(props: Props) {
  const t = phaseCopy[props.locale];
  return (
    <>
      <Intro
        headingId={props.headingId}
        title={t.passkeyHeading}
        icon={<Fingerprint />}
      >
        {t.passkeyHelp}
      </Intro>
      <Feedback
        id={`${props.headingId}-feedback`}
        failure={props.failure}
        locale={props.locale}
        className="min-h-14 py-2"
      />
      <StudyPrimaryAction
        data-phase-action="passkey"
        className="w-full"
        disabled={props.busy}
        aria-busy={props.busy}
        onClick={() => props.onAction("passkey")}
      >
        {props.busy ? t.busy : t.passkey}
      </StudyPrimaryAction>
      <StudyTextAction
        data-phase-action="email-code"
        className="mt-3 w-full text-[13px] text-neutral-400"
        disabled={props.busy}
        onClick={() => props.onAction("email-code")}
      >
        {t.emailFallback}
      </StudyTextAction>
    </>
  );
}

function PhoneEntry(props: Props) {
  const t = phaseCopy[props.locale];
  const invalid = props.invalid === "phone";
  return (
    <>
      <Intro headingId={props.headingId} title={t.phoneHeading}>
        {t.phoneHelp}
      </Intro>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          props.onAction("submit");
        }}
        noValidate
      >
        <StudyField
          id={`${props.headingId}-phone`}
          label={t.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={t.phonePlaceholder}
          value={props.phone}
          disabled={props.busy}
          aria-invalid={invalid}
          aria-describedby={`${props.headingId}-feedback`}
          onChange={(event) => props.onField("phone", event.target.value)}
        />
        <Feedback id={`${props.headingId}-feedback`}>
          {invalid ? t.phoneInvalid : null}
        </Feedback>
        <Submit props={props}>{t.continue}</Submit>
      </form>
    </>
  );
}

function Waiting(props: Props) {
  const t = phaseCopy[props.locale];
  return (
    <>
      <Intro headingId={props.headingId} title={t.waitingHeading}>
        <p>
          {t.waitingHelp}{" "}
          <span className="whitespace-nowrap text-neutral-200">
            {props.phone}
          </span>
        </p>
      </Intro>
      <MessageDetails props={props} t={t} />
      <StudyPrimaryAction
        data-phase-action="compose"
        className="mt-4 w-full"
        disabled={props.busy}
        onClick={() => props.onAction("compose")}
      >
        {t.compose}
      </StudyPrimaryAction>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] leading-5 text-neutral-400">
        <span role="status" className="flex items-center gap-2">
          <PhaseSpinner
            visible={props.visible}
            size={12}
            duration={2}
          />
          {props.checked ? t.checked : t.waiting}
        </span>
        <span
          role="timer"
          aria-live="off"
          className="font-mono text-neutral-500"
        >
          {props.remaining}{" "}
          <span className="font-[system-ui]">{t.remaining}</span>
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2">
        <StudyTextAction
          data-phase-action="check"
          className="px-3 text-[13px]"
          disabled={props.busy}
          onClick={() => props.onAction("check")}
        >
          {props.busy ? t.busy : t.check}
        </StudyTextAction>
        <StudyTextAction
          data-phase-action="edit-phone"
          className="px-3 text-[13px] text-neutral-400"
          disabled={props.busy}
          onClick={() => props.onAction("edit-phone")}
        >
          {t.changePhone}
        </StudyTextAction>
      </div>
    </>
  );
}

function MessageDetails({ props, t }: { props: Props; t: CopyText }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 shadow-[inset_0_1px_3px_#00000018]">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs leading-[18px] text-neutral-400 select-all">
            <span className="sr-only">{t.to} </span>
            <span className="block break-all">{props.recipient}</span>
          </p>
          <p className="mt-2 font-mono text-[15px] leading-[22px] tracking-normal break-all text-neutral-100 select-all">
            {props.message}
          </p>
        </div>
        <button
          type="button"
          data-phase-action="copy"
          aria-label={props.copied ? t.copied : t.copy}
          onClick={() => props.onAction("copy")}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-neutral-400 transition-[background-color,color,transform] duration-200 ease-out hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95",
            props.copied && "text-neutral-100"
          )}
        >
          <motion.span
            key={props.copied ? "copied" : "copy"}
            className="flex items-center justify-center"
            initial={{ opacity: 0, scale: motionTokens.scale.hidden }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: motionTokens.duration.fast,
              ease: motionTokens.easing.smooth
            }}
          >
            {props.copied ? (
              <Check aria-hidden="true" size={17} strokeWidth={1.5} />
            ) : (
              <Copy aria-hidden="true" size={17} strokeWidth={1.5} />
            )}
          </motion.span>
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "text-[11px] leading-4 text-neutral-400",
          props.copyFailed ? "mt-1" : "sr-only"
        )}
      >
        {props.copyFailed ? t.copyFailed : props.copied ? t.copied : null}
      </p>
    </div>
  );
}

function Completion(props: Props) {
  const t = phaseCopy[props.locale];
  return (
    <div
      data-phase-completion=""
      className="mx-auto flex w-full max-w-88 flex-col items-center text-center"
    >
      <Check
        aria-hidden="true"
        size={32}
        strokeWidth={1.5}
        className="mb-4 text-neutral-200"
      />
      <h3
        id={props.headingId}
        tabIndex={-1}
        className="mb-8 text-[28px] leading-[34px] font-medium tracking-[-0.025em] text-[#f4f4f3] outline-none"
      >
        {t.completeHeading}
      </h3>
      <StudyChoiceAction
        data-phase-action="retry"
        tone="secondary"
        onClick={() => props.onAction("retry")}
      >
        {t.restart}
      </StudyChoiceAction>
    </div>
  );
}

function Outcome(
  props: Props & {
    title: string;
    help: string;
    icon: ReactNode;
    action: PhaseAction;
    label: string;
    changePhone?: boolean;
  }
) {
  return (
    <>
      <Intro headingId={props.headingId} title={props.title} icon={props.icon}>
        {props.help}
      </Intro>
      <StudyPrimaryAction
        data-phase-action={props.action}
        className="ml-auto !w-auto min-w-36"
        disabled={props.busy}
        onClick={() => props.onAction(props.action)}
      >
        {props.label}
      </StudyPrimaryAction>
      {props.changePhone && (
        <StudyTextAction
          data-phase-action="edit-phone"
          className="mt-3 w-full text-[13px] text-neutral-400"
          disabled={props.busy}
          onClick={() => props.onAction("edit-phone")}
        >
          {phaseCopy[props.locale].changePhone}
        </StudyTextAction>
      )}
    </>
  );
}
