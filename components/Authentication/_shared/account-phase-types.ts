import type { Ref, ReactElement, ReactNode } from "react";
import type { MemberAuthFailureKind } from "../../../lib/member-auth/client";

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
  pendingAction?:
    "send-code" | "verify-code" | "google" | "passkey" | "magic-link" | "other" | null;
  failure?: MemberAuthFailureKind | null;
  codeRecovery?: "expired-code" | "attempts-exhausted" | null;
  verificationRemaining?: number;
  submitDisabled?: boolean;
  googleDisabled?: boolean;
  resendDisabled?: boolean;
  onEditEmail?: () => void;
  renderHeading?: (heading: ReactElement) => ReactNode;
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
