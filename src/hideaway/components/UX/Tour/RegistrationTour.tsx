"use client";

import { MotionPill, MotionPillButton, RP_Btn } from "@/hideaway/components/core/Button";
import { useAppForm, withForm } from "@/hideaway/components/UX/Tour/form";
import { defaultOptions } from "@/hideaway/components/UX/Tour/Onboard/Form";
import {
  detailsSchema,
  FormSchema,
  FormValues,
  profileSchema
} from "@/hideaway/components/UX/Tour/Onboard/Form/schema";
import { SPRING_EASE } from "@/hideaway/constants/animations";
import { useBetterAuth } from "@/hideaway/lib/auth/context";
import { useRPSession } from "@/hideaway/lib/auth/session/RP_SessionProvider";
import { cn } from "@/lib/utils";
import { OnboardingBody } from "@/hideaway/payload/collections/Users/endpoints/onboardingHandler";
import type {
  OnboardingSeverity,
  RegistrationStep
} from "@/hideaway/stores/Tour/TourStore";
import { User } from "@payload-types";
import { formOptions, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useLenis } from "lenis/react";
import {
  AnimatePresence,
  HTMLMotionProps,
  useMotionValue,
  Variants
} from "motion/react";
import * as m from "motion/react-m";
import { useTransitionRouter } from "next-transition-router";
import { usePathname } from "next/navigation";
import {
  ComponentProps,
  MouseEventHandler,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { TextBlurIn } from "./TextBlurIn";
import { useTourStore } from "./TourProvider";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * PASSIVE_PATHS — explicit allowlist, highest priority.
 * Full in-page overlay is acceptable on these paths regardless of any other rule.
 * Tip: content-type roots don't need to be listed here — CONTENT_PATHS list-view
 * detection handles them. Reserve this for truly "ambient" landing/browsing pages.
 */
const PASSIVE_PATHS = new Set([
  "/",
  "/home",
  "/radio",
  "/albums",
  "/playlists",
  "/categories",
  "/tags"
]);

/**
 * AUTH_PATHS — blacklist.
 * No onboarding rendering of any kind on these paths or their sub-paths.
 */
const AUTH_PATHS = Object.freeze([
  "/accept-invitation",
  "/account",
  "/admin-ba",
  "/auth",
  "/check-in",
  "/forgot-password",
  "/me",
  "/prive",
  "/reset-password",
  "/sign-in",
  "/sign-up",
  "/two-factor"
]);

/**
 * ACTIVE_PATHS — manual blacklist.
 * Suppresses onboarding rendering without adding to AUTH_PATHS.
 * Does NOT take precedence over PASSIVE_PATHS: if a path appears in both,
 * PASSIVE_PATHS wins (overlay is shown).
 */
const ACTIVE_PATHS = Object.freeze<string[]>([
  // e.g. "/search", "/privacy", "/terms"
]);

/**
 * CONTENT_PATHS — dynamic classification.
 * Paths directly under these roots are classified as list vs. single-content.
 * List views (root, /in, /in/[page]) → overlay allowed.
 * Single-content sub-paths → only a gentle banner, never redirect.
 */
const CONTENT_PATHS = Object.freeze([
  "/archived",
  "/essays",
  "/surf",
  "/tagged",
  "/users"
]);

/** sessionStorage key for per-session banner/toast dismissal */
const DISMISSED_KEY = "rp:onboarding-dismissed";

// ─── Path classification ──────────────────────────────────────────────────────

/**
 * overlay  — render full in-page overlay
 * content  — content single-view: show gentle bottom banner only
 * default  — unclassified path: severity drives notification type
 * none     — auth/blacklisted: no onboarding rendering
 */
type PathBucket = "overlay" | "content" | "default" | "none";

/** Returns true when pathname is a paginated list view under a content root. */
function isContentListView(pathname: string): boolean {
  for (const root of CONTENT_PATHS) {
    if (pathname === root) return true;
    if (pathname === `${root}/in`) return true;
    if (new RegExp(`^${root}/in/\\d+$`).test(pathname)) return true;
  }
  return false;
}

function classifyPath(pathname: string): PathBucket {
  // 1. PASSIVE_PATHS: explicit allowlist — wins over everything
  if (PASSIVE_PATHS.has(pathname)) return "overlay";

  // 2. AUTH_PATHS: blacklist — no rendering
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
    return "none";

  // 3. ACTIVE_PATHS: manual blacklist (PASSIVE already checked, no conflict)
  if (
    ACTIVE_PATHS.length > 0 &&
    ACTIVE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  )
    return "none";

  // 4. CONTENT_PATHS: dynamic — list view → overlay, single content → content
  const isUnderContent = CONTENT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isUnderContent) {
    return isContentListView(pathname) ? "overlay" : "content";
  }

  // 5. Default — trigger uses severity to decide exact notification
  return "default";
}

/** Returns true for paths where a low-severity subtle reminder is contextually fitting. */
function isContextRelevantForSubtle(pathname: string): boolean {
  // User profile browsing: seeing another person's profile naturally prompts
  // "I should fill mine out too"
  return pathname.startsWith("/users/") || pathname.startsWith("/@");
}

// ─── Severity computation ─────────────────────────────────────────────────────
const OPTIONAL_FIELDS: Array<Extract<keyof User, "bio" | "location" | "link">> =
  ["bio", "location", "link"];

/** Derive how incomplete the user's profile is. */
export function computeSeverity(user: User): OnboardingSeverity {
  if (user.onboarded) return "complete";

  const needsIdentity = !user.firstName?.trim() || !user.lastName?.trim();
  if (needsIdentity) return "required";

  const untouched = OPTIONAL_FIELDS.filter(
    (f) => !(user[f as keyof User] as string | null | undefined)?.trim()
  ).length;

  return untouched / OPTIONAL_FIELDS.length > 0.7
    ? "high-optional"
    : "low-optional";
}

// ─── Step configs ─────────────────────────────────────────────────────────────

type StepConfig = {
  title: string;
  subtitle: string;
  /** Alternate subtitle when fields are pre-filled (OAuth etc.) */
  subtitlePrefilled?: string;
  optional?: boolean;
};

const STEP_COPY: Record<RegistrationStep, StepConfig> = {
  welcome: {
    title: "Welcome to\nThe Hideaway.",
    subtitle: "A few quick details and you're all set."
  },
  profile: {
    title: "Tell us\nabout yourself.",
    subtitle: "Your name and a short bio to get started.",
    subtitlePrefilled: "Confirm or update how you'll appear."
  },
  details: {
    title: "Where are you\ncoming from?",
    subtitle: "Your location and a link — both optional.",
    optional: true
  },
  complete: {
    title: "You're in.",
    subtitle: "Start exploring whenever you're ready."
  }
};

// Steps shown in the indicator (exclude welcome)
const INDICATOR_STEPS: RegistrationStep[] = ["profile", "details", "complete"];

// ─── Build active steps ──────────────────────────────────────────────────────

export function buildActiveSteps(): RegistrationStep[] {
  return ["welcome", "profile", "details", "complete"];
}

// ─── Subtle fade-up for step body content ────────────────────────────────────

const bodyFadeVariants: Variants = {
  hidden: { opacity: 0, y: 6, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.84,
      delay: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};
// ── TanStack Form (single source of truth for step + field values) ────────
const formOp = formOptions({
  defaultValues: {
    step: "welcome",
    profile: {
      firstName: "",
      lastName: "",
      bio: ""
    },
    details: {
      location: "",
      link: ""
    }
  } as FormValues,
  validators: {
    onSubmit: ({ value, formApi }) => {
      console.log("[validator] running for step:", value.step);
      switch (value.step) {
        case "welcome": {
          console.log("[validator] welcome → undefined");
          return undefined;
        }
        case "profile": {
          const r = formApi.parseValuesWithSchema(
            profileSchema as typeof FormSchema
          );
          console.log("[validator] profile result:", r);
          return r;
        }
        case "details": {
          const r = formApi.parseValuesWithSchema(
            detailsSchema as typeof FormSchema
          );
          console.log("[validator] details result:", r);
          return r;
        }
        case "complete": {
          const r = formApi.parseValuesWithSchema(FormSchema);
          console.log("[validator] complete result:", r);
          return r;
        }
      }
    }
  }
});
// ─── Step content components ──────────────────────────────────────────────────

export const WelcomeStep = withForm({
  ...formOp,
  render: function Render({ form }) {
    const firstName = form.state.values.profile?.firstName;
    return firstName ? (
      <TextBlurIn
        text={`Great to see you, ${firstName}.`}
        as="h1"
        className="text-xl leading-[1.2] font-extrabold tracking-[-0.025em] text-foreground"
        style={{ fontSize: "clamp(3rem, 5.5vw, 4.75rem)" }}
        preserveNewlines
        splitBy="word"
        stagger={0.05}
        delay={0.45}
        yOffset={6}
        blurAmount={6}
        duration={0.8}
      />
    ) : (
      <TextBlurIn
        text={STEP_COPY.welcome.title}
        as="h1"
        className="text-xl leading-[1.2] font-extrabold tracking-[-0.025em] text-foreground"
        style={{ fontSize: "clamp(3rem, 5.5vw, 4.75rem)" }}
        preserveNewlines
        splitBy="word"
        stagger={0.05}
        delay={0.45}
        yOffset={6}
        blurAmount={6}
        duration={0.8}
      />
    );
  }
});

/** Merged identity + bio step */
export const ProfileStep = withForm({
  ...formOp,
  render: function Render({ form }) {
    return (
      <m.div
        className="flex flex-col gap-4"
        variants={bodyFadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Name fields */}
        <div className="flex flex-col gap-3">
          <form.AppField name="profile.firstName">
            {(field) => (
              <field.TextField
                placeholder="First name"
                autoComplete="given-name"
              />
            )}
          </form.AppField>
          <form.AppField name="profile.lastName">
            {(field) => (
              <field.TextField
                placeholder="Last name"
                autoComplete="family-name"
              />
            )}
          </form.AppField>
        </div>

        {/* Bio — visually separated */}
        <div className="pt-1">
          <form.AppField name="profile.bio">
            {(field) => (
              <field.TextArea
                placeholder="Your passion, work, interests — keep it interesting."
                maxLength={200}
              />
            )}
          </form.AppField>
        </div>
      </m.div>
    );
  }
});

const DetailsStep = withForm({
  ...formOp,
  render: function Render({ form }) {
    return (
      <m.div
        className="flex flex-col gap-3"
        variants={bodyFadeVariants}
        initial="hidden"
        animate="visible"
      >
        <form.AppField name="details.location">
          {(field) => (
            <field.TextField
              placeholder="Location (e.g. Seoul, KR)"
              autoComplete="address-level2"
            />
          )}
        </form.AppField>
        <form.AppField name="details.link">
          {(field) => (
            <field.TextField
              placeholder="Website or social link"
              type="url"
              autoComplete="url"
            />
          )}
        </form.AppField>
      </m.div>
    );
  }
});

function CompleteStep() {
  return (
    <m.p
      className="text-[15px] text-muted-foreground"
      variants={bodyFadeVariants}
      initial="hidden"
      animate="visible"
    >
      You can always update your profile in settings.
    </m.p>
  );
}

// ─── Step indicators ──────────────────────────────────────────────────────────

function StepIndicators({
  current,
  steps
}: {
  current: RegistrationStep;
  steps: RegistrationStep[];
}) {
  const currentIdx = steps.indexOf(current);

  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-valuenow={Math.max(0, currentIdx + 1)}
      aria-valuemax={steps.length}
    >
      {steps.map((step, i) => {
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <m.span
            key={step}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium",
              isCurrent
                ? "bg-foreground text-background"
                : isPast
                  ? "border border-foreground/25 text-foreground/40"
                  : "border border-foreground/10 text-foreground/20"
            )}
            layout
            transition={{ type: "spring", ...SPRING_EASE.power2.out }}
          >
            {isPast ? (
              <m.svg
                width="10"
                height="8"
                viewBox="0 0 10 8"
                fill="none"
                aria-hidden="true"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", ...SPRING_EASE.power3.out }}
              >
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </m.svg>
            ) : (
              i + 1
            )}
          </m.span>
        );
      })}
    </div>
  );
}

// ─── Exit warning ─────────────────────────────────────────────────────────────

function ExitWarning({
  isRequiredSection,
  onConfirm,
  onCancel
}: {
  isRequiredSection: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <m.div
      className="bg-faded-foreground/0.7 absolute inset-250 z-10 flex items-center justify-center px-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onCancel}
    >
      <m.div
        className={cn(
          "rounded-2xl border border-foreground/8 bg-background p-7",
          "flex w-full max-w-xl flex-col gap-5 shadow-2xl"
        )}
        initial={{ scale: 0.96, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.97, y: 6, opacity: 0 }}
        transition={{ type: "spring", ...SPRING_EASE.power3.out }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-[17px] leading-snug font-medium text-foreground">
            {isRequiredSection
              ? "You haven't set your name yet."
              : "Leave without saving?"}
          </h3>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {isRequiredSection
              ? "Your name is required to fully use your account. You can complete this anytime from your profile settings."
              : "Your profile changes won't be saved. You can always update these in settings."}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <MotionPillButton
            onClick={onCancel}
            className="text-[13px] text-muted-foreground/50 transition-colors hover:text-foreground/70"
            autoFocus
          >
            Stay
          </MotionPillButton>
          <MotionPillButton
            onClick={onConfirm}
            className={cn(
              "text-[13px] font-medium",
              isRequiredSection
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/15"
                : "bg-foreground/5 text-foreground hover:bg-foreground/15"
            )}
          >
            {isRequiredSection ? "Skip for now" : "Leave"}
          </MotionPillButton>
        </div>
      </m.div>
    </m.div>
  );
}

// ─── Slide variants ───────────────────────────────────────────────────────────

// ─── Step-level submission helper ─────────────────────────────────────────────

type UserField = Extract<
  keyof User,
  "bio" | "link" | "firstName" | "lastName" | "location" | "onboarded"
>;

type OnboardingFields = NonNullable<
  Extract<OnboardingBody, { step: "complete" }>["fields"]
>;

/** Diff form values against the current user; return only changed fields. */
function diffOnboardingFields(
  value: FormValues,
  user: Pick<User, UserField>
): OnboardingFields {
  const fields: OnboardingFields = {};
  const firstName = value.profile?.firstName?.trim();
  if (firstName && firstName !== user.firstName) fields.firstName = firstName;
  const lastName = value.profile?.lastName?.trim();
  if (lastName && lastName !== user.lastName) fields.lastName = lastName;
  const bio = value.profile?.bio?.trim() ?? "";
  if (bio !== (user.bio ?? "")) fields.bio = bio || null;
  const location = value.details?.location?.trim() ?? "";
  if (location !== (user.location ?? "")) fields.location = location || null;
  const link = value.details?.link?.trim() ?? "";
  if (link !== (user.link ?? "")) fields.link = link || null;
  return fields;
}

async function persistOnboarding(args: {
  userId: string;
  step: RegistrationStep;
  fields: OnboardingFields;
  complete: boolean;
}) {
  const body = {
    step: args.step,
    fields: args.fields,
    complete: args.complete
  } as OnboardingBody;
  const res = await fetch(`/api/users/${args.userId}/onboarding`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`onboarding request failed: ${res.status}`);
  }
  return (await res.json()) as { ok: boolean };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RegistrationTour() {
  // Tour lifecycle — Zustand
  const closeRegistrationTour = useTourStore((s) => s.closeRegistrationTour);
  const dismissRegistrationTour = useTourStore(
    (s) => s.dismissRegistrationTour
  );
  const regPending = useTourStore((s) => s.regPending);
  const regFromPath = useTourStore((s) => s.regFromPath);

  // Session
  const { currentUserPromise } = useBetterAuth();
  const curUser = use(currentUserPromise) as User | null;
  const currentUser = useMemo(() => curUser, [curUser]);
  const markStale = useRPSession((s) => s.markStale);
  const router = useTransitionRouter();
  const [dir, setDir] = useState<1 | -1>(1);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const warnExitValue = useMotionValue(showExitWarning);
  useEffect(
    () => warnExitValue.set(showExitWarning),
    [warnExitValue, showExitWarning]
  );

  const lenis = useLenis();

  // ── Active steps (always the same 4 now) ──────────────────────────────────

  const activeSteps = useMemo(() => buildActiveSteps(), []);

  // ── Detect preexisting data for subtitle copy ─────────────────────────────

  const hasPrefilled = useMemo(
    () =>
      !!(
        currentUser?.firstName?.trim() ||
        currentUser?.lastName?.trim() ||
        currentUser?.bio?.trim()
      ),
    [currentUser]
  );

  // ── Completion mutation ───────────────────────────────────────────────────

  const completeMutation = useMutation({
    mutationKey: ["registration", "complete"],
    mutationFn: async (value: FormValues) => {
      if (!currentUser) throw new Error("no current user");
      const fields = diffOnboardingFields(value, currentUser);
      return persistOnboarding({
        userId: currentUser.id,
        step: "complete",
        fields,
        complete: true
      });
    },
    onSuccess: () => {
      markStale();
      closeRegistrationTour();
      const dest =
        regFromPath && regFromPath !== "/me/onboarding" ? regFromPath : "/";
      router.push(dest);
    },
    onError: () => {
      closeRegistrationTour();
      router.push("/");
    }
  });

  const seededDefaults = useMemo<FormValues>(
    () => ({
      step: "welcome",
      profile: {
        firstName: currentUser?.firstName ?? "",
        lastName: currentUser?.lastName ?? "",
        bio: currentUser?.bio ?? ""
      },
      details: {
        location: currentUser?.location ?? "",
        link: currentUser?.link ?? ""
      }
    }),
    [currentUser]
  );

  const form = useAppForm({
    ...formOp,
    defaultValues: seededDefaults,
    onSubmit: async ({ value, formApi }) => {
      console.log("onSubmit", value);
      setDir(1);
      switch (value.step) {
        case "welcome":
          formApi.setFieldValue("step", "profile");
          break;
        case "profile":
          formApi.setFieldValue("step", "details");
          break;
        case "details":
          formApi.setFieldValue("step", "complete");
          break;
        case "complete":
          await completeMutation.mutateAsync(value);
          break;
      }
    }
  });

  const formValues = useStore(form.store, (s) => s.values);
  const currentStep = useStore(form.store, (s) => s.values.step);
  const firstName = useStore(form.store, (s) => s.values.profile.firstName);
  const lastName = useStore(form.store, (s) => s.values.profile.lastName);
  const isFormDirty = useStore(form.store, (s) => s.isDirty);
  const formErrors = useStore(form.store, (s) => s.errors);
  const formCanSubmit = useStore(form.store, (s) => s.canSubmit);
  const formIsSubmitting = useStore(form.store, (s) => s.isSubmitting);
  const formSubmissionAttempts = useStore(
    form.store,
    (s) => s.submissionAttempts
  );
  const formErrorMap = useStore(form.store, (s) => s.errorMap);
  const formFieldMeta = useStore(form.store, (s) => s.fieldMeta);
  useEffect(() => {
    console.log("[form state]", {
      canSubmit: formCanSubmit,
      isSubmitting: formIsSubmitting,
      submissionAttempts: formSubmissionAttempts,
      errors: JSON.parse(JSON.stringify(formErrors)),
      errorMap: JSON.parse(JSON.stringify(formErrorMap)),
      fieldMeta: JSON.parse(JSON.stringify(formFieldMeta))
    });
  }, [
    formCanSubmit,
    formIsSubmitting,
    formSubmissionAttempts,
    formErrors,
    formErrorMap,
    formFieldMeta
  ]);

  const isSubmitting = completeMutation.isPending;

  // ── Lock scroll while tour is open ────────────────────────────────────────
  useEffect(() => {
    lenis?.stop();
    return () => {
      lenis?.start();
    };
  }, [lenis]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const isFirst = currentStep === "welcome";
  const isLast = currentStep === "complete";
  const isInRequiredSection =
    currentStep === "welcome" || currentStep === "profile";

  const stepCopy = STEP_COPY[currentStep] ?? STEP_COPY.welcome;
  const subtitle =
    hasPrefilled && stepCopy.subtitlePrefilled
      ? stepCopy.subtitlePrefilled
      : stepCopy.subtitle;

  const canAdvance = useStore(form.store, (s) => s.canSubmit);

  // ── beforeunload warning ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isFormDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isFormDirty]);
  const currentStepValue = useMotionValue(currentStep);
  useEffect(() => {
    console.log("currentStep changed", currentStep);
    currentStepValue.set(currentStep);
  }, [currentStep, currentStepValue]);
  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDismissRequest = useCallback(() => {
    if (currentStepValue.get() === "welcome") {
      dismissRegistrationTour();
      return;
    }
    setShowExitWarning(true);
  }, [currentStepValue, dismissRegistrationTour]);

  const handleBack: MouseEventHandler = useCallback(
    (e) => {
      e.preventDefault();
      setDir(-1);
      const cur = currentStepValue.get();
      switch (cur) {
        case "welcome":
          return;
        case "profile":
          form.setFieldValue("step", "welcome");
          break;
        case "details":
          form.setFieldValue("step", "profile");
          break;
        case "complete":
          form.setFieldValue("step", "details");
          break;
      }
    },
    [currentStepValue, form]
  );

  // ── Keyboard: Escape ──────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        if (
          e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.contentEditable === "true"
        ) {
          return;
        }
      }
      if (e.key === "Escape" && !isLast && !showExitWarning) {
        e.preventDefault();
        handleDismissRequest();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isLast, showExitWarning, handleDismissRequest]);

  // ── Keyboard: Enter → advance ─────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.key === "Enter")) return;
      if (e.target instanceof HTMLTextAreaElement) {
        if (!(e.metaKey || e.ctrlKey)) {
          // We accept ctrl/cmd key + enter when inside TextArea
          return;
        }
      }
      if (showExitWarning || isSubmitting) return;
      e.preventDefault();
      form.handleSubmit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSubmitting, showExitWarning, form]);

  const slideVariants: Variants = useMemo(
    () => ({
      initial: (dir: 1 | -1) => ({
        y: dir > 0 ? "105%" : "-50%",
        opacity: 0
      }),
      animate: {
        y: "0%",
        opacity: 1,
        transition: {
          type: "spring" as const,
          ...SPRING_EASE.power3.out,
          visualDuration: 0.6
        }
      },
      first: {
        y: "0%",
        opacity: 1,
        transition: {
          type: "spring" as const,
          ...SPRING_EASE.power3.out,
          delay: 1.1,
          visualDuration: 1.1
        }
      },
      exit: (dir: 1 | -1) => ({
        y: dir > 0 ? "-40%" : "90%",
        opacity: 0,
        transition: {
          duration: 0.32,
          ease: [0.25, 0.46, 0.45, 0.94]
        }
      })
    }),
    []
  );
  const [currentAnimation, setCurrentAnimation] = useState<"first" | "animate">(
    currentStep === "welcome" ? "first" : "animate"
  );
  useEffect(() => {
    setCurrentAnimation(currentStep === "welcome" ? "first" : "animate");
  }, [currentStep]);
  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <m.div
        className="pointer-events-auto fixed inset-0 z-40 flex flex-col bg-background/5 px-10 py-15"
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding"
      >
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("form submitted");
            form.handleSubmit();
          }}
        >
          {/* ── Header ── */}
          <header className="flex shrink-0 items-center justify-between px-8 pt-8 md:px-14">
            <span className="text-[11px] font-medium tracking-[0.12em] text-foreground/30 uppercase select-none">
              The Hideaway
            </span>
            <div className="flex items-center gap-4">
              <StepIndicators current={currentStep} steps={INDICATOR_STEPS} />
              {!isLast && (
                <MotionPillButton
                  type="button"
                  onClick={handleDismissRequest}
                  className="text-[13px] text-foreground/50 transition-colors hover:text-foreground/70"
                  aria-label="Skip onboarding"
                >
                  Skip
                </MotionPillButton>
              )}
            </div>
          </header>

          {/* ── Content ── */}
          <div
            className="z-20 flex flex-1 items-center justify-center overflow-hidden px-8 py-8 md:px-14"
            style={{ perspective: "1500px" }}
          >
            <div className="w-full max-w-[460px]">
              <AnimatePresence mode="wait" custom={dir} initial={true}>
                <m.div
                  key={currentStep}
                  custom={dir}
                  variants={slideVariants}
                  initial="initial"
                  animate={currentAnimation}
                  exit="exit"
                  className="flex flex-col gap-8"
                >
                  {/* Title block */}
                  <div className="flex flex-col gap-2.5">
                    {currentStep === "welcome" ? (
                      <WelcomeStep form={form} />
                    ) : (
                      <TextBlurIn
                        key={`title-${currentStep}`}
                        text={stepCopy.title}
                        as="h1"
                        className="text-xl leading-[1.2] font-extrabold tracking-[-0.025em] text-foreground"
                        style={{ fontSize: "clamp(3rem, 5.5vw, 4.75rem)" }}
                        preserveNewlines
                        splitBy="word"
                        stagger={0.05}
                        delay={0.45}
                        yOffset={6}
                        blurAmount={6}
                        duration={0.8}
                      />
                    )}
                    <m.div
                      initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        transition: {
                          duration: 0.8,
                          delay: currentStep === "welcome" ? 0.5 : 0.18,
                          ease: [0.25, 0.46, 0.45, 0.94]
                        }
                      }}
                    >
                      <m.p className="text-[15px] leading-relaxed text-muted-foreground">
                        {subtitle}
                        {stepCopy.optional && (
                          <m.span className="ml-2 text-small font-medium tracking-widest text-foreground/25 uppercase">
                            optional
                          </m.span>
                        )}
                      </m.p>
                    </m.div>
                  </div>

                  {/* Step body */}
                  {currentStep === "profile" && <ProfileStep form={form} />}
                  {currentStep === "details" && <DetailsStep form={form} />}
                  {currentStep === "complete" && <CompleteStep />}
                </m.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ── Footer ── */}
          <footer className="z-120 flex shrink-0 items-center justify-between px-8 pb-8 md:px-14">
            {!isFirst ? (
              <MotionPill
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 border border-foreground/50 bg-transparent text-[13px] text-foreground/50 transition-colors hover:text-foreground/70 disabled:bg-muted-foreground/60 disabled:opacity-40"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M8.5 3L4.5 7L8.5 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back
              </MotionPill>
            ) : (
              <div />
            )}
            <form.AppForm>
              <form.SubscribeButton />
            </form.AppForm>
          </footer>
        </form>
        {/* ── Exit warning ── */}
        <AnimatePresence>
          {showExitWarning && (
            <ExitWarning
              isRequiredSection={isInRequiredSection}
              onConfirm={() => {
                setShowExitWarning(false);
                dismissRegistrationTour();
              }}
              onCancel={() => setShowExitWarning(false)}
            />
          )}
        </AnimatePresence>
      </m.div>
    </>
  );
}

// ─── Onboarding notification components ──────────────────────────────────────

/**
 * Countdown toast for required-field situations on unclassified paths.
 * Gives the user 4 seconds to act before auto-navigating to /me/onboarding.
 */
export const OnboardingRedirectToast = ({
  onNavigate
}: ComponentProps<"div"> & { onNavigate?: () => void }) => {
  const [seconds, setSeconds] = useState(4);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          onNavigate?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onNavigate]);

  return (
    <m.div
      className={cn(
        "fixed bottom-6 left-1/2 z-[500] -translate-x-1/2",
        "flex items-center gap-4 rounded-2xl",
        "border border-foreground/10 bg-background/90 px-5 py-3.5",
        "shadow-xl backdrop-blur-xl"
      )}
      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 10, filter: "blur(4px)" }}
      transition={{ type: "spring", ...SPRING_EASE.power3.out }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium text-foreground">
          A few details needed
        </span>
        <span className="text-[12px] text-muted-foreground">
          Redirecting in {seconds}s…
        </span>
      </div>
      <MotionPillButton
        onClick={onNavigate}
        className={cn(
          "text-[12px] font-medium",
          "bg-foreground text-background",
          "hover:bg-foreground/90"
        )}
      >
        Go now
      </MotionPillButton>
    </m.div>
  );
};

/**
 * Medium toast for high-optional incompleteness on unclassified paths.
 * Bottom-left card — more prominent than the subtle pill, less forceful than a redirect.
 */
export const OnboardingToastMedium = ({
  onDismiss,
  onNavigate
}: HTMLMotionProps<"div"> & {
  onDismiss?: () => void;
  onNavigate?: () => void;
}) => {
  return (
    <m.div
      className={cn(
        "fixed bottom-6 left-6 z-[500]",
        "flex w-72 flex-col gap-3 rounded-2xl",
        "border border-foreground/10 bg-background/90 p-5",
        "shadow-xl backdrop-blur-xl"
      )}
      initial={{ opacity: 0, x: -16, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -8, filter: "blur(4px)" }}
      transition={{ type: "spring", ...SPRING_EASE.power3.out }}
    >
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-medium text-foreground">
          Finish setting up your profile
        </span>
        <span className="text-[12px] leading-relaxed text-muted-foreground">
          Add your bio, location, and a link so others can get to know you.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <MotionPillButton
          onClick={onNavigate}
          className={cn(
            "text-[12px] font-medium",
            "bg-foreground text-background",
            "hover:bg-foreground/90"
          )}
        >
          Let&apos;s go
        </MotionPillButton>
        <MotionPillButton
          onClick={onDismiss}
          className="text-[12px] text-muted-foreground/50 hover:text-foreground/70"
        >
          Not now
        </MotionPillButton>
      </div>
    </m.div>
  );
};

/**
 * Subtle toast for low-optional incompleteness on context-relevant paths (e.g. /users/*).
 * Top-right pill, appears after a short delay, auto-dismisses after 8 s.
 */
export function OnboardingToastSubtle({
  onDismiss,
  onNavigate
}: HTMLMotionProps<"div"> & {
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 8000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  return (
    <m.div
      className={cn(
        "fixed top-5 right-5 z-[500]",
        "flex items-center gap-3 rounded-full",
        "border border-foreground/8 bg-background/80 px-4 py-2.5",
        "shadow-lg backdrop-blur-xl"
      )}
      initial={{ opacity: 0, x: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: 8, filter: "blur(4px)" }}
      transition={{ type: "spring", ...SPRING_EASE.power3.out, delay: 1.5 }}
    >
      <span className="text-[12px] text-muted-foreground">
        Your profile is almost complete
      </span>
      <RP_Btn
        onClick={onNavigate}
        className="text-[12px] font-medium text-foreground underline-offset-2 hover:underline"
      >
        Edit
      </RP_Btn>
      <RP_Btn
        onClick={onDismiss}
        className="ml-0.5 text-muted-foreground/30 transition-colors hover:text-foreground/50"
        aria-label="Dismiss"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </RP_Btn>
    </m.div>
  );
}

/**
 * Gentle bottom-center pill for content single-view paths.
 * Used when the user is mid-read: non-intrusive, easily dismissed.
 */
export const OnboardingBanner = ({
  onDismiss,
  onNavigate
}: HTMLMotionProps<"div"> & {
  onDismiss: () => void;
  onNavigate: () => void;
}) => {
  return (
    <m.div
      className={cn(
        "fixed bottom-6 left-1/2 z-[500] -translate-x-1/2",
        "flex items-center gap-4 rounded-full",
        "border border-foreground/10 bg-background/80 px-5 py-3",
        "shadow-xl backdrop-blur-xl"
      )}
      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 10, filter: "blur(4px)" }}
      transition={{ type: "spring", ...SPRING_EASE.power3.out }}
    >
      <span className="text-[13px] text-muted-foreground">
        Complete your profile to get the full experience
      </span>
      <MotionPillButton
        onClick={onNavigate}
        className={cn(
          "text-[12px] font-medium",
          "bg-foreground text-background",
          "hover:bg-foreground/90"
        )}
      >
        Let&apos;s go
      </MotionPillButton>
      <RP_Btn
        onClick={onDismiss}
        className="ml-1 text-muted-foreground/40 transition-colors hover:text-foreground/60"
        aria-label="Dismiss"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </RP_Btn>
    </m.div>
  );
};

// ─── Tour trigger — mounts at layout level, watches session ──────────────────

type NotifyMode =
  | "overlay"
  | "redirect"
  | "medium"
  | "subtle"
  | "banner"
  | "none";

export function RegistrationTourTrigger() {
  const { currentUserPromise } = useBetterAuth();
  const currentUser = use(currentUserPromise);

  const regActive = useTourStore((s) => s.regActive);
  const regDismissed = useTourStore((s) => s.regDismissed);
  const openRegistrationTour = useTourStore((s) => s.openRegistrationTour);

  const pathname = usePathname();
  const router = useTransitionRouter();

  /** Per-session dismissal: once any notification is dismissed, suppress for the session. */
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(DISMISSED_KEY) === "true";
  });

  const [notifyMode, setNotifyMode] = useState<NotifyMode>("none");

  /**
   * One-shot flag: evaluated once per component mount so navigating around
   * the app doesn't repeatedly re-trigger overlays or toasts.
   * Exception: /me/onboarding is always re-evaluated (handled before the flag check).
   */
  const triggered = useRef(false);

  const dismiss = useCallback(() => {
    setNotifyMode("none");
    setBannerDismissed(true);
    sessionStorage.setItem(DISMISSED_KEY, "true");
  }, []);

  const navigateToOnboarding = useCallback(() => {
    setNotifyMode("none");
    router.push("/me/onboarding");
  }, [router]);

  useEffect(() => {
    if (!currentUser || regActive || regDismissed) return;
    const severity = computeSeverity(currentUser as User);
    if (severity === "complete") return;
    const needsIdentity = severity === "required";
    const hasPreexistingData = !!(
      currentUser.firstName?.trim() ||
      currentUser.lastName?.trim() ||
      currentUser.bio?.trim()
    );

    // /me/onboarding: RegistrationTour is rendered directly from the page, but we
    // also call openRegistrationTour to set regActive + pending state in the store.
    if (pathname === "/me/onboarding") {
      openRegistrationTour(
        { needsIdentity, hasPreexistingData, severity },
        pathname
      );
      triggered.current = true;
      return;
    }

    if (triggered.current) return;
    triggered.current = true;

    // First visit (< 10 min since account creation): redirect regardless of path.
    const createdAt = currentUser.createdAt
      ? new Date(currentUser.createdAt).getTime()
      : 0;
    if (Date.now() - createdAt < 10 * 60 * 1000) {
      router.push("/me/onboarding");
      return;
    }

    if (bannerDismissed) return;

    const bucket = classifyPath(pathname);

    if (bucket === "none") return;

    if (bucket === "overlay") {
      openRegistrationTour(
        { needsIdentity, hasPreexistingData, severity },
        pathname
      );
      return;
    }

    if (bucket === "content") {
      // User is reading content — never redirect, show gentle pill only
      setNotifyMode("banner");
      return;
    }

    // bucket === "default": severity drives the notification type
    if (severity === "required") {
      setNotifyMode("redirect");
    } else if (severity === "high-optional") {
      setNotifyMode("medium");
    } else if (
      severity === "low-optional" &&
      isContextRelevantForSubtle(pathname)
    ) {
      setNotifyMode("subtle");
    }
    // low-optional on a non-relevant path: no notification
  }, [
    currentUser,
    regActive,
    regDismissed,
    openRegistrationTour,
    pathname,
    router,
    bannerDismissed
  ]);

  if (notifyMode === "none" || regActive) return null;

  return (
    <AnimatePresence>
      {notifyMode === "redirect" && (
        <OnboardingRedirectToast
          key="redirect"
          onNavigate={navigateToOnboarding}
        />
      )}
      {notifyMode === "medium" && (
        <OnboardingToastMedium
          key="medium"
          onDismiss={dismiss}
          onNavigate={navigateToOnboarding}
        />
      )}
      {notifyMode === "subtle" && (
        <OnboardingToastSubtle
          key="subtle"
          onDismiss={dismiss}
          onNavigate={navigateToOnboarding}
        />
      )}
      {notifyMode === "banner" && (
        <OnboardingBanner
          key="banner"
          onDismiss={dismiss}
          onNavigate={navigateToOnboarding}
        />
      )}
    </AnimatePresence>
  );
}
