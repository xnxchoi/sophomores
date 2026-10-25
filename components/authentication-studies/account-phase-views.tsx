"use client";

import { forwardRef, useLayoutEffect, useRef, type ReactNode } from "react";
import { motion, useIsPresent } from "motion/react";
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
import { phaseCopy } from "./account-phase-copy";
import type { AccountPhaseViewProps, PhaseAction } from "./account-phase-types";
import {
  StudyChoiceAction,
  StudyCodeField,
  StudyField,
  StudyPrimaryAction,
  StudyTextAction
} from "./study-controls";

type Props = AccountPhaseViewProps;
type CopyText = (typeof phaseCopy)[Props["locale"]];

export const AccountPhaseViews = forwardRef<HTMLDivElement, Props>(
  function AccountPhaseViews(props, ref) {
    const body = useRef<HTMLDivElement>(null);
    const present = useIsPresent();
    useLayoutEffect(() => {
      if (!present || document.visibilityState === "hidden") return;
      const target =
        body.current?.querySelector<HTMLElement>("input") ??
        body.current?.querySelector<HTMLElement>("h3");
      target?.focus({ preventScroll: true });
    }, [present, props.phase]);

    return (
      <motion.div
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
    case "email-recovery":
      return <EmailRecovery {...props} />;
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
      return (
        <Outcome
          {...props}
          title={t.completeHeading}
          help={t.completeHelp}
          icon={<Check />}
          action="retry"
          label={t.restart}
        />
      );
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
  icon
}: {
  headingId: string;
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <span
            aria-hidden="true"
            className="shrink-0 text-neutral-400 [&>svg]:size-6 [&>svg]:stroke-[1.5]"
          >
            {icon}
          </span>
        )}
        <h3
          id={headingId}
          tabIndex={-1}
          className="text-[24px] leading-[30px] font-medium tracking-[-0.025em] text-[#f4f4f3] outline-none"
        >
          {title}
        </h3>
      </div>
      {children && (
        <div className="mt-2.5 text-[14px] leading-[21px] text-neutral-400">
          {children}
        </div>
      )}
    </div>
  );
}

function Submit({ props, children }: { props: Props; children: ReactNode }) {
  return (
    <StudyPrimaryAction
      type="submit"
      data-phase-action="submit"
      disabled={props.busy}
      aria-busy={props.busy}
      className="relative ml-auto w-fit min-w-36"
    >
      {props.busy ? phaseCopy[props.locale].busy : children}
      {props.busy && (
        <LoaderCircle
          aria-hidden="true"
          size={15}
          strokeWidth={1.5}
          className={cn(
            "absolute right-4 animate-spin",
            !props.visible && "[animation-play-state:paused]"
          )}
        />
      )}
    </StudyPrimaryAction>
  );
}

function Feedback({ id, children }: { id: string; children?: ReactNode }) {
  return (
    <p
      id={id}
      aria-live="polite"
      className="mt-1 mb-1 min-h-5 text-xs leading-5 text-neutral-400"
    >
      {children}
    </p>
  );
}

function EmailEntry(props: Props) {
  const t = phaseCopy[props.locale];
  const invalid = props.invalid === "email";
  return (
    <>
      <Intro
        headingId={props.headingId}
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
        <Feedback id={`${props.headingId}-feedback`}>
          {invalid ? t.emailInvalid : null}
        </Feedback>
        <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
          <StudyTextAction
            data-phase-action="google"
            className="px-3 text-[13px] font-normal text-neutral-400"
            disabled={props.busy}
            onClick={() => props.onAction("google")}
          >
            {t.google}
          </StudyTextAction>
          <Submit props={props}>{t.continue}</Submit>
        </div>
      </form>
    </>
  );
}

function EmailCode(props: Props) {
  const t = phaseCopy[props.locale];
  const invalid = props.invalid === "code";
  return (
    <>
      <Intro headingId={props.headingId} title={t.emailHeading}>
        <p>{t.emailHelp}</p>
        <p className="break-all text-neutral-200">{props.email}</p>
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
          disabled={props.busy}
          invalid={invalid}
          descriptionId={`${props.headingId}-feedback`}
          visible={props.visible}
          onChange={(value) => props.onField("code", value)}
        />
        <Feedback id={`${props.headingId}-feedback`}>
          {invalid ? t.codeInvalid : null}
        </Feedback>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <EmailRecoveryLink props={props} />
          <Submit props={props}>{t.verify}</Submit>
        </div>
      </form>
    </>
  );
}

function EmailRecoveryLink({ props }: { props: Props }) {
  return (
    <StudyTextAction
      data-phase-action="recover-email"
      disabled={props.busy}
      onClick={() => props.onAction("recover-email")}
      className="min-h-11 rounded-md px-3 text-[13px] font-normal text-neutral-400 hover:bg-transparent hover:text-white"
    >
      <span className="underline decoration-white/30 underline-offset-4">
        {phaseCopy[props.locale].codeRecovery}
      </span>
    </StudyTextAction>
  );
}

function EmailRecovery(props: Props) {
  const t = phaseCopy[props.locale];
  const coolingDown = props.resendRemaining > 0;
  const countdown = `0:${String(props.resendRemaining).padStart(2, "0")}`;
  const hintId = `${props.headingId}-resend-hint`;
  return (
    <>
      <Intro headingId={props.headingId} title={t.recoveryHeading}>
        <p className="break-all text-neutral-200">{props.email}</p>
      </Intro>
      <p id={hintId} className="mb-4 min-h-5 text-[13px] leading-5 text-neutral-400">
        {coolingDown ? <>{t.resendIn}{" "}<span className="font-mono text-neutral-300 tabular-nums">{countdown}</span></> : t.resendReady}
      </p>
      <div className="overflow-hidden rounded-[14px] border border-white/10 bg-black/10 shadow-[inset_0_1px_3px_#00000018] divide-y divide-white/8">
        <RecoveryChoice
          props={props}
          action="retry"
          label={t.resend}
          disabled={props.busy || coolingDown}
          descriptionId={coolingDown ? hintId : undefined}
        />
        <RecoveryChoice
          props={props}
          action="edit-email"
          label={t.changeEmail}
          disabled={props.busy}
        />
      </div>
    </>
  );
}

function RecoveryChoice({ props, action, label, disabled, descriptionId }: {
  props: Props;
  action: "retry" | "edit-email";
  label: string;
  disabled: boolean;
  descriptionId?: string;
}) {
  return (
    <StudyTextAction
      data-phase-action={action}
      disabled={disabled}
      aria-describedby={descriptionId}
      onClick={() => props.onAction(action)}
      className={cn(
        "min-h-13 w-full rounded-none px-4 py-3 text-[15px] text-neutral-100 hover:bg-white/5",
        disabled && "cursor-not-allowed text-neutral-500 hover:bg-transparent hover:text-neutral-500"
      )}
    >
      {label}
    </StudyTextAction>
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
          <LoaderCircle
            aria-hidden="true"
            size={12}
            strokeWidth={1.5}
            className={cn(
              "animate-spin [animation-duration:2s]",
              !props.visible && "[animation-play-state:paused]"
            )}
          />
          {props.checked ? t.checked : t.waiting}
        </span>
        <span
          role="timer"
          aria-live="off"
          className="font-mono text-neutral-500"
        >
          {props.remaining} <span className="font-[system-ui]">{t.remaining}</span>
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
      {props.phase === "complete" ? (
        <StudyChoiceAction
          data-phase-action={props.action}
          tone="secondary"
          disabled={props.busy}
          onClick={() => props.onAction(props.action)}
        >
          {props.label}
        </StudyChoiceAction>
      ) : (
        <StudyPrimaryAction
          data-phase-action={props.action}
          className="ml-auto !w-auto min-w-36"
          disabled={props.busy}
          onClick={() => props.onAction(props.action)}
        >
          {props.label}
        </StudyPrimaryAction>
      )}
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
