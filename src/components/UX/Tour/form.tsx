"use client";
import { MotionPillButton } from "@/components/core/Button";
import TextArea from "@/components/UX/Tour/Fields/text-area";
// Direct imports — NOT lazy. Lazy imports cause React to Suspend up to the
// nearest Suspense boundary, which in this tree is the outer layout Suspense.
// That unmounts Main → MainInternal → the WebGL canvas, losing the GL context.
import TextField from "@/components/UX/Tour/Fields/text-field";
import { FormValues } from "@/components/UX/Tour/Onboard/Form/schema";
import { cn } from "@/lib/utils";
import {
  createFormHook,
  type ReactFormExtendedApi
} from "@tanstack/react-form";
import { HTMLMotionProps } from "motion/react";
import { type ReactNode } from "react";
import { fieldContext, formContext, useFormContext } from "./form-context";

function SubscribeButton({
  disabled,
  onClick: handleNext
}: Omit<HTMLMotionProps<"button">, "children">) {
  const form = useFormContext() as unknown as ReactFormExtendedApi<
    FormValues,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >;
  return (
    <form.Subscribe
      selector={(state) =>
        [state.values.step, state.canSubmit, state.isSubmitting] as [
          FormValues["step"],
          boolean,
          boolean
        ]
      }
    >
      {([step, canSubmit, isSubmitting]) => (
        <MotionPillButton
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className={cn(
            "rounded-full px-7 py-3 text-[14px] font-medium",
            "bg-foreground text-background",
            "hover:bg-foreground/90 active:scale-[0.97]",
            "transition-all duration-150",
            "disabled:opacity-25 disabled:active:scale-100",
            "min-w-[140px] text-center"
          )}
        >
          {isSubmitting
            ? "Saving…"
            : step === "complete"
              ? "Get started"
              : step === "welcome"
                ? "Let's go"
                : "Continue"}
        </MotionPillButton>
      )}
    </form.Subscribe>
  );
}
export const { useAppForm, withForm, withFieldGroup, useTypedAppFormContext } =
  createFormHook({
    fieldComponents: { TextArea, TextField },
    formComponents: {
      SubscribeButton
    },
    fieldContext,
    formContext
  });
