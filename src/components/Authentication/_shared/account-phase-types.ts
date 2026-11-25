import type { Ref, ReactElement, ReactNode } from "react";
import type { MemberAuthFailureKind } from "../../../lib/member-auth/client";
import type { MemberSocialProvider } from "../../../lib/member-auth/contracts";

export type AccountPhase =
  | "entry"
  | "email-code"
  | "passkey"
  | "phone"
  | "waiting"
  | "review"
  | "phone-confirmed"
  | "complete"
  | "expired"
  | "used"
  | "error";

export type PhaseAction =
  | "submit"
  | "google"
  | "passkey"
  | "email-code"
  | "copy"
  | "compose"
  | "check"
  | "retry"
  | "finish"
  | "edit-phone";

export type PhaseNavigation = {
  back: () => boolean;
  preview: (phase: AccountPhase) => void;
  previewFailure: (failure: MemberAuthFailureKind) => void;
};

export type AccountPhaseStudyProps = {
  flow: "login" | "signup";
  locale: "en" | "ko";
  /** Stable prefix: the current phase is appended to keep exiting headings unique. */
  headingId: string;
  navigationRef: Ref<PhaseNavigation>;
  initialPhase?: AccountPhase;
  onPhaseChange?: (phase: AccountPhase) => void;
  onPreviewNotice?: (notice: string) => void;
  onFailureChange?: (failure: MemberAuthFailureKind | null) => void;
};

export type AccountPhaseViewProps = {
  phase: AccountPhase;
  flow: "login" | "signup";
  locale: "en" | "ko";
  headingId: string;
  email: string;
  phone: string;
  code: string;
  invalid: "email" | "code" | "phone" | null;
  busy: boolean;
  /** Visual progress only; busy still locks inputs and actions. */
  showBusyFeedback?: boolean;
  pendingAction?:
    "send-code" | "verify-code" | MemberSocialProvider | "passkey" | "magic-link" | "other" | null;
  failure?: MemberAuthFailureKind | null;
  reserveFeedback?: boolean;
  feedbackMessage?: ReactNode;
  feedbackAction?: ReactNode;
  feedbackPending?: boolean;
  codeRecovery?: "expired-code" | "attempts-exhausted" | null;
  verificationRemaining?: number;
  submitDisabled?: boolean;
  /** Replaces the entry step's "Continue" when the email has been looked up. */
  submitLabel?: string;
  /** Omits the entry step's submit, e.g. once an email is known to have no account. */
  submitHidden?: boolean;
  /** False for social-only sign-up: the entry step shows its heading without an email form. */
  emailForm?: boolean;
  googleDisabled?: boolean;
  resendDisabled?: boolean;
  onEditEmail?: () => void;
  renderHeading?: (heading: ReactElement, title: string) => ReactNode;
  copied: boolean;
  copyFailed: boolean;
  remaining: string;
  resendRemaining: number;
  checked: boolean;
  visible: boolean;
  recipient: string;
  message: string;
  onField: (field: "email" | "phone" | "code", value: string) => void;
  onCodeComplete: (code: string) => void;
  onAction: (action: PhaseAction) => void;
};
