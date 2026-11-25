"use client";

import {
  forwardRef,
  useContext,
  useEffect,
  useRef,
  type ReactNode
} from "react";
import {
  motion,
  useAnimate,
  useIsPresent,
  type AnimationPlaybackControlsWithThen
} from "motion/react";
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
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { DrawnField } from "@/components/ui/input";
import { OtpInput } from "@/components/arc/otp-input/otp-input";
import { motionTokens } from "../../lib/motion-tokens";
import { useTranslations } from "next-intl";
import { useAccountPhaseFocus } from "./account-phase-focus";
import { VerificationPresentation } from "./phone-verification/verification-tray";
import { Button } from "@/components/core/ArcFocus/ArcFocus";
import type {
  AccountPhaseViewProps,
  PhaseAction
} from "./_shared/account-phase-types";
import {
  StudyChoiceAction,
  StudyField,
  StudyPrimaryAction,
  StudyTextAction
} from "./study-controls";

type Props = AccountPhaseViewProps;
type CopyText = ReturnType<typeof useTranslations<"AuthPhase">>;

function PhaseSpinner({
  visible,
  size,
  duration,
  className
}: {
  visible: boolean;
  size: number;
  duration: number;
  className?: string;
}) {
  const [scope, animate] = useAnimate<SVGSVGElement>();
  const playback = useRef<AnimationPlaybackControlsWithThen | null>(null);
  useEffect(() => {
    playback.current = animate(
      scope.current,
      { rotate: [0, 360] },
      {
        duration,
        ease: "linear",
        repeat: Infinity
      }
    );
    return () => playback.current?.stop();
  }, [animate, scope, duration]);
  useEffect(() => {
    // Pause the same native playback so hidden phases retain their exact angle.
    if (visible) playback.current?.play();
    else playback.current?.pause();
  }, [visible]);
  return (
    <LoaderCircle
      ref={scope}
      aria-hidden="true"
      size={size}
      strokeWidth={1.5}
      className={className}
    />
  );
}

export const AccountPhaseViews = forwardRef<HTMLDivElement, Props>(
  function AccountPhaseViews(props, ref) {
    const t = useTranslations("AuthPhase");
    const body = useRef<HTMLDivElement>(null);
    const present = useIsPresent();
    const focus = useAccountPhaseFocus(props, body, present);

    return (
      <motion.div
        key={props.phase}
        className="[font-family:system-ui]"
        ref={(element) => {
          body.current = element;
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
        }}
        data-account-phase-body={props.phase}
        data-account-phase={props.phase}
        onFocusCapture={focus.onFocusCapture}
        onBlurCapture={focus.onBlurCapture}
        inert={!present}
        aria-hidden={!present}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: motionTokens.duration.fast,
          ease: motionTokens.easing.smooth
        }}
      >
        <PhaseContent {...props} />
        <span
          role={
            props.busy && props.showBusyFeedback !== false
              ? "status"
              : undefined
          }
          aria-live="polite"
          className="sr-only"
        >
          {props.busy && props.showBusyFeedback !== false
            ? props.pendingAction === "send-code"
              ? t("sending")
              : props.pendingAction === "verify-code"
                ? t("verifying")
                : t("busy")
            : null}
        </span>
      </motion.div>
    );
  }
);

function PhaseContent(props: Props) {
  const t = useTranslations("AuthPhase");
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
          title={t("reviewHeading")}
          help={t("reviewHelp")}
          icon={<TriangleAlert />}
          action="retry"
          label={t("retry")}
          changePhone
        />
      );
    case "phone-confirmed":
      return (
        <Outcome
          {...props}
          title={t("confirmedHeading")}
          help={t("confirmedHelp")}
          icon={<CircleCheck />}
          action="finish"
          label={t("finish")}
        />
      );
    case "complete":
      return <Completion {...props} />;
    case "expired":
      return (
        <Outcome
          {...props}
          title={t("expiredHeading")}
          help={t("expiredHelp")}
          icon={<Clock3 />}
          action="retry"
          label={t("retry")}
        />
      );
    case "used":
      return (
        <Outcome
          {...props}
          title={t("usedHeading")}
          help={t("usedHelp")}
          icon={<CircleX />}
          action="retry"
          label={t("retry")}
        />
      );
    case "error":
      return (
        <Outcome
          {...props}
          title={t("errorHeading")}
          help={t("errorHelp")}
          icon={<TriangleAlert />}
          action="retry"
          label={t("retry")}
        />
      );
  }
}

function Intro({
  headingId,
  title,
  children,
  icon,
  renderHeading,
  centered = false
}: {
  headingId: string;
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  renderHeading?: Props["renderHeading"];
  centered?: boolean;
}) {
  const presentation = useContext(VerificationPresentation);
  const mobileTray = presentation === "tray";
  const heading = (
    <h3
      id={headingId}
      tabIndex={-1}
      className="text-[24px] leading-[30px] font-medium tracking-[-0.025em] text-foreground outline-none"
    >
      {title}
    </h3>
  );
  return (
    <div
      data-phase-intro=""
      data-authentication-presentation={presentation ?? undefined}
      className={cn(
        "mb-6 data-[authentication-presentation=modal]:[@media(max-height:600px)]:mb-4",
        centered ? "text-center" : "text-left",
        renderHeading && presentation != null && !mobileTray && !centered && "pl-14"
      )}
    >
      <div
        className={cn("flex items-center gap-3", centered && "justify-center")}
      >
        {icon && (
          <span
            aria-hidden="true"
            className="shrink-0 text-muted-foreground [&>svg]:size-6 [&>svg]:stroke-[1.5]"
          >
            {icon}
          </span>
        )}
        {renderHeading ? renderHeading(heading, title) : heading}
      </div>
      {children && (
        <div className="mt-2 text-[14px] leading-5 text-muted-foreground">
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
  const t = useTranslations("AuthPhase");
  const busy =
    props.showBusyFeedback !== false &&
    props.busy &&
    props.pendingAction !== "google" &&
    props.pendingAction !== "apple" &&
    props.pendingAction !== "kakao" &&
    props.pendingAction !== "passkey" &&
    props.pendingAction !== "magic-link";
  return (
    // Arc's primary button, as in Arc's Sign in block (owner, 23 Nov: "Arc block, underlined field"). Until an email is
    // typed, the entry step's Continue is secondary, so Apple's required white button isn't a second white primary in
    // dark mode (critique, 26 Nov); it fills once there is something to continue with.
    <Button
      type="submit"
      variant={props.phase === "entry" && !props.email.trim() ? "secondary" : "primary"}
      size="lg"
      loading={busy}
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
      className={cn("min-w-36", wide ? "w-full" : "ml-auto w-fit")}
    >
      {busy
        ? props.pendingAction === "send-code"
          ? t("sending")
          : props.pendingAction === "verify-code"
            ? t("verifying")
            : t("busy")
        : children}
    </Button>
  );
}

function Feedback({
  id,
  children,
  className,
  failure,
  followup,
  retryRemaining,
  quiet = false,
  reserve = false,
  action
}: {
  id: string;
  children?: ReactNode;
  className?: string;
  failure?: Props["failure"];
  followup?: ReactNode;
  retryRemaining?: number;
  locale?: Props["locale"];
  quiet?: boolean;
  reserve?: boolean;
  action?: ReactNode;
}) {
  const t = useTranslations("AuthPhase");
  const neutral =
    failure === "passkey-cancelled" || failure === "provider-denied";
  const message =
    failure === "rate-limited" && retryRemaining !== undefined
      ? null
      : failure
        ? t(`failures.${failure}`)
        : children;
  const hasFeedback = Boolean(message || followup || (retryRemaining ?? 0) > 0);
  const feedback = (
    <p
      id={id}
      className={cn(
        hasFeedback || reserve
          ? "my-2 overflow-hidden text-[13px] leading-5 text-foreground"
          : "sr-only",
        reserve && !action && "min-h-10",
        action && "my-0 min-w-0 flex-1",
        className
      )}
    >
      <span
        role={
          failure === "rate-limited" && retryRemaining !== undefined && !quiet
            ? "status"
            : undefined
        }
        aria-live={quiet ? "off" : "polite"}
        data-rate-limit-status=""
        className="sr-only"
      >
        {failure === "rate-limited" && retryRemaining !== undefined
          ? retryRemaining > 0
            ? t("failures.rate-limited")
            : t("retry")
          : null}
      </span>
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
          {t("retryIn")}{" "}
          <span className="font-sans tabular-nums">
            {Math.floor((retryRemaining ?? 0) / 60)}:
            {String((retryRemaining ?? 0) % 60).padStart(2, "0")}
          </span>
        </span>
      )}
    </p>
  );
  return (
    <div
      data-account-feedback-row=""
      className={cn(action && "mt-2 flex min-h-11 items-center gap-3")}
    >
      {feedback}
      {action}
    </div>
  );
}

function EmailEntry(props: Props) {
  const t = useTranslations("AuthPhase");
  const invalid = props.invalid === "email";
  // Social-only sign-up has no form, but its failures and recovery still show.
  const feedback = (
    <Feedback
      id={`${props.headingId}-feedback`}
      failure={props.failure}
      reserve={props.reserveFeedback || props.failure === "rate-limited"}
      action={props.feedbackAction}
      retryRemaining={props.resendRemaining}
      locale={props.locale}
      quiet={
        props.feedbackPending ||
        (!props.failure && !invalid && props.resendRemaining > 0)
      }
    >
      {invalid
        ? t("emailInvalid")
        : props.feedbackMessage
          ? props.feedbackMessage
          : null}
    </Feedback>
  );
  return (
    <>
      <Intro
        centered
        headingId={props.headingId}
        renderHeading={props.renderHeading}
        title={props.flow === "login" ? t("login") : t("signup")}
      >
        {props.flow !== "signup"
          ? null
          : props.emailForm === false
            ? t("signupSocialHelp")
            : t("signupHelp")}
      </Intro>
      {props.emailForm === false ? (
        feedback
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            props.onAction("submit");
          }}
          noValidate
        >
          <div>
          <DrawnField
            steady
            id={`${props.headingId}-email`}
            label={t("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={props.email}
            disabled={props.busy}
            aria-invalid={invalid}
            aria-describedby={`${props.headingId}-feedback`}
            onChange={(event) => props.onField("email", event.target.value)}
          />
          </div>
          {feedback}
          {/* No empty row once the submit is hidden, so spacing matches the other states. */}
          {(!props.submitHidden || !props.googleDisabled) && (
            <div className="mt-4 space-y-2">
              {!props.submitHidden && (
                <Submit props={props}>
                  {props.submitLabel ?? t("continue")}
                </Submit>
              )}
              {!props.googleDisabled && (
                <StudyTextAction
                  data-phase-action="google"
                  className="relative w-full px-3 text-[14px] font-medium text-muted-foreground disabled:opacity-40 aria-busy:opacity-80"
                  disabled={props.busy}
                  aria-busy={props.busy && props.pendingAction === "google"}
                  onClick={() => props.onAction("google")}
                >
                  {props.busy && props.pendingAction === "google"
                    ? t("busy")
                    : t("google")}
                  {props.busy && props.pendingAction === "google" && (
                    <PhaseSpinner
                      visible={props.visible}
                      size={15}
                      duration={1}
                      className="absolute right-4"
                    />
                  )}
                </StudyTextAction>
              )}
            </div>
          )}
        </form>
      )}
    </>
  );
}

function EmailCode(props: Props) {
  const t = useTranslations("AuthPhase");
  // Centred in the sheet; left-aligned when it takes over a page inline.
  const inline = useContext(VerificationPresentation) == null;
  const invalid = props.invalid === "code";
  // A rejected code is marked on the code input itself (Arc's documented error prop: aria-invalid on each cell, the
  // message under the cells); the feedback row keeps every other outcome.
  const rejected = invalid || props.failure === "invalid-code";
  const codeError = rejected ? (props.failure === "invalid-code" ? t("failures.invalid-code") : t("codeInvalid")) : undefined;
  const codeDisabled =
    props.busy ||
    props.submitDisabled ||
    Boolean(props.codeRecovery) ||
    (props.verificationRemaining ?? 0) > 0 ||
    props.failure === "expired-code" ||
    props.failure === "attempts-exhausted" ||
    (props.failure === "rate-limited" && (props.verificationRemaining ?? props.resendRemaining) > 0);
  return (
    <div className="w-full">
      <Intro
        centered={!inline}
        headingId={props.headingId}
        title={t("emailHeading")}
        renderHeading={props.renderHeading}
      >
        <p>
          {t("emailHelp")}{" "}
          <span className="block mt-1 font-medium break-all text-foreground">
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
        {/* Arc's code input (owner, 23 Nov: "Arc block, underlined field"). Codes are letters and digits, upper case;
            a full code verifies once, and a replaced full code verifies again. Monochrome: Arc's accent is the
            foreground here. */}
        {/* Arc's message rows read --leading-body, which the project's token layer does not define; set it here.
            data-arc-control keeps the legacy global input rule (sphmrs.scss: margin, padding, tracking) off the cells,
            so each cell fills its slot and the focus ring sits on it. */}
        <div data-email-code-field="" data-arc-control="" className="[--accent-strong:var(--foreground)] [--accent-subtle:transparent] [--accent:var(--foreground)] [--leading-body:1.25rem]">
          <OtpInput
            label={t("code")}
            inputMode="text"
            error={codeError}
            value={props.code}
            disabled={codeDisabled}
            aria-describedby={`${props.headingId}-feedback`}
            // As the previous field: spaces and hyphens in a pasted or autofilled code are formatting and are dropped;
            // any other character outside A-Z and 0-9 refuses the whole entry, so the cells stay as they were.
            normalize={(raw) => {
              const compact = raw.replace(/[\s-]/g, "");
              return /^[A-Za-z0-9]*$/.test(compact) ? compact.toUpperCase() : null;
            }}
            onChange={(next) => {
              // Letters and digits only, as the previous field accepted; anything else is dropped.
              const normalized = next.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
              props.onField("code", normalized);
              // As before: verify when the code becomes complete, or when a rejected code is replaced by another full one.
              if (normalized.length === 6 && !codeDisabled && props.visible
                && (props.code.length < 6 || (rejected && normalized !== props.code)))
                props.onCodeComplete(normalized);
            }}
          />
        </div>
        <Feedback
          id={`${props.headingId}-feedback`}
          className="text-left"
          failure={rejected ? null : props.failure}
          reserve={props.reserveFeedback || props.failure === "rate-limited"}
          action={props.feedbackAction}
          quiet={props.feedbackPending}
          followup={
            props.codeRecovery && props.failure !== props.codeRecovery
              ? t("newCodeRequired")
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
          {rejected ? null : props.feedbackMessage}
        </Feedback>
        <div className="mt-4">
          <Submit props={props} wide>
            {t("verify")}
          </Submit>
        </div>
        <InlineEmailResend props={props} />
        {props.onEditEmail && (
          <StudyTextAction
            className="mx-auto mt-1 min-h-11 px-3 text-[13px] text-muted-foreground"
            disabled={props.busy}
            onClick={props.onEditEmail}
          >
            {t("changeEmail")}
          </StudyTextAction>
        )}
      </form>
    </div>
  );
}

function InlineEmailResend({ props }: { props: Props }) {
  const t = useTranslations("AuthPhase");
  const coolingDown = props.resendRemaining > 0;
  const countdown = `${Math.floor(props.resendRemaining / 60)}:${String(props.resendRemaining % 60).padStart(2, "0")}`;
  return (
    <div className="mt-2 flex min-h-11 items-center justify-center text-[13px] leading-5">
      <StudyTextAction
        data-phase-action="retry"
        disabled={props.busy || props.resendDisabled || coolingDown}
        aria-label={
          coolingDown ? undefined : `${t("codeRecovery")} ${t("resend")}`
        }
        onClick={() => props.onAction("retry")}
        className="min-h-11 w-44 gap-1 rounded-md px-3 text-[13px] font-normal text-muted-foreground underline decoration-current/30 underline-offset-4 hover:bg-transparent hover:text-foreground disabled:text-muted-foreground disabled:no-underline"
      >
        {coolingDown ? (
          <>
            {t("resendIn")}{" "}
            <span className="font-sans tabular-nums">{countdown}</span>
          </>
        ) : (
          t("codeRecovery")
        )}
      </StudyTextAction>
    </div>
  );
}

function Passkey(props: Props) {
  const t = useTranslations("AuthPhase");
  return (
    <>
      <Intro
        headingId={props.headingId}
        title={t("passkeyHeading")}
        icon={<Fingerprint />}
      >
        {t("passkeyHelp")}
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
        {props.busy ? t("busy") : t("passkey")}
      </StudyPrimaryAction>
      <StudyTextAction
        data-phase-action="email-code"
        className="mt-3 w-full text-[13px] text-muted-foreground"
        disabled={props.busy}
        onClick={() => props.onAction("email-code")}
      >
        {t("emailFallback")}
      </StudyTextAction>
    </>
  );
}

function PhoneEntry(props: Props) {
  const t = useTranslations("AuthPhase");
  const invalid = props.invalid === "phone";
  return (
    <>
      <Intro headingId={props.headingId} title={t("phoneHeading")}>
        {t("phoneHelp")}
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
          label={t("phone")}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={t("phonePlaceholder")}
          value={props.phone}
          disabled={props.busy}
          aria-invalid={invalid}
          aria-describedby={`${props.headingId}-feedback`}
          onChange={(event) => props.onField("phone", event.target.value)}
        />
        <Feedback id={`${props.headingId}-feedback`}>
          {invalid ? t("phoneInvalid") : null}
        </Feedback>
        <Submit props={props}>{t("continue")}</Submit>
      </form>
    </>
  );
}

function Waiting(props: Props) {
  const t = useTranslations("AuthPhase");
  return (
    <>
      <Intro headingId={props.headingId} title={t("waitingHeading")}>
        <p>
          {t("waitingHelp")}{" "}
          <span className="whitespace-nowrap text-foreground">
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
        {t("compose")}
      </StudyPrimaryAction>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] leading-5 text-muted-foreground">
        <span role="status" className="flex items-center gap-2">
          <PhaseSpinner visible={props.visible} size={12} duration={2} />
          {props.checked ? t("checked") : t("waiting")}
        </span>
        <span
          role="timer"
          aria-live="off"
          className="font-sans text-muted-foreground"
        >
          {props.remaining}{" "}
          <span className="font-[system-ui]">{t("remaining")}</span>
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2">
        <StudyTextAction
          data-phase-action="check"
          className="px-3 text-[13px]"
          disabled={props.busy}
          onClick={() => props.onAction("check")}
        >
          {props.busy ? t("busy") : t("check")}
        </StudyTextAction>
        <StudyTextAction
          data-phase-action="edit-phone"
          className="px-3 text-[13px] text-muted-foreground"
          disabled={props.busy}
          onClick={() => props.onAction("edit-phone")}
        >
          {t("changePhone")}
        </StudyTextAction>
      </div>
    </>
  );
}

function MessageDetails({ props, t }: { props: Props; t: CopyText }) {
  return (
    <div className="rounded-xl border border-border bg-transparent px-4 py-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs leading-[18px] text-muted-foreground select-all">
            <span className="sr-only">{t("to")} </span>
            <span className="block break-all">{props.recipient}</span>
          </p>
          <p className="mt-2 font-sans text-[15px] leading-[22px] tracking-normal break-all text-foreground select-all">
            {props.message}
          </p>
        </div>
        <button
          type="button"
          data-phase-action="copy"
          aria-label={props.copied ? t("copied") : t("copy")}
          onClick={() => props.onAction("copy")}
          className={cn(
            "group/focus flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-[background-color,color,transform] duration-200 ease-out hover:bg-muted hover:text-foreground active:scale-95",
            props.copied && "text-foreground"
          )}
        >
          <FocusShape className="flex items-center justify-center group-focus-visible/focus:outline-foreground">
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
          </FocusShape>
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "text-[11px] leading-4 text-muted-foreground",
          props.copyFailed ? "mt-1" : "sr-only"
        )}
      >
        {props.copyFailed ? t("copyFailed") : props.copied ? t("copied") : null}
      </p>
    </div>
  );
}

function Completion(props: Props) {
  const t = useTranslations("AuthPhase");
  return (
    <div
      data-phase-completion=""
      className="mx-auto flex w-full max-w-88 flex-col items-center text-center"
    >
      <Check
        aria-hidden="true"
        size={32}
        strokeWidth={1.5}
        className="mb-4 text-foreground"
      />
      <h3
        id={props.headingId}
        tabIndex={-1}
        className="mb-8 text-[28px] leading-[34px] font-medium tracking-[-0.025em] text-foreground outline-none"
      >
        {t("completeHeading")}
      </h3>
      <StudyChoiceAction
        data-phase-action="retry"
        tone="secondary"
        onClick={() => props.onAction("retry")}
      >
        {t("restart")}
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
  const t = useTranslations("AuthPhase");
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
          className="mt-3 w-full text-[13px] text-muted-foreground"
          disabled={props.busy}
          onClick={() => props.onAction("edit-phone")}
        >
          {t("changePhone")}
        </StudyTextAction>
      )}
    </>
  );
}
