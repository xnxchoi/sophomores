import type { Ref } from "react";

export type AccountPhase =
  | "entry"
  | "email-code"
  | "email-recovery"
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
  | "recover-email"
  | "copy"
  | "compose"
  | "check"
  | "retry"
  | "finish"
  | "edit-email"
  | "edit-phone";

export type PhaseNavigation = {
  back: () => boolean;
  preview: (phase: AccountPhase) => void;
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
  copied: boolean;
  copyFailed: boolean;
  remaining: string;
  resendRemaining: number;
  checked: boolean;
  visible: boolean;
  recipient: string;
  message: string;
  onField: (field: "email" | "phone" | "code", value: string) => void;
  onAction: (action: PhaseAction) => void;
};
