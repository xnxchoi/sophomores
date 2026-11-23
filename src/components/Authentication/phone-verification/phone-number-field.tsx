"use client";

import { cn } from "@/lib/utils";

import type { Ref } from "react";
import { useTranslations } from "next-intl";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "../../ui/input-group";

type PhoneNumberFieldProps = {
  value: string;
  onChange: (value: string) => void;
  error: string;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  compact?: boolean;
};

export function PhoneNumberField({
  value,
  onChange,
  error,
  inputRef,
  disabled = false,
  compact = false
}: PhoneNumberFieldProps) {
  const t = useTranslations("Verification");
  return (
    <Field className="gap-2" data-invalid={Boolean(error)}>
      <FieldLabel
        className="text-xs font-medium text-muted-foreground"
        id="pv-phone-label"
        htmlFor="pv-phone"
      >
        {t("phoneNumber")}
      </FieldLabel>
      <InputGroup
        className={cn(
          "h-15 gap-0 rounded-lg border-border bg-transparent p-1 transition-[border-color,box-shadow] duration-200 ease-out focus-within:!border-foreground",
          compact ? "h-13 rounded-xl border-border bg-transparent shadow-none has-[[aria-invalid=true]]:border-border" : "has-[[aria-invalid=true]]:border-foreground"
        )}
        aria-labelledby="pv-phone-label"
      >
        <InputGroupInput
          id="pv-phone"
          className={cn(
            "!mt-0 h-12 min-w-0 !border-0 bg-transparent px-3 !text-base !font-normal !tracking-[0.02em] !text-foreground tabular-nums !shadow-none placeholder:text-muted-foreground",
            compact ? "h-10 !tracking-normal" : "sm:!text-lg sm:!tracking-wide md:!text-xl"
          )}
          ref={inputRef}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="010-0000-0000"
          required
          disabled={disabled}
          maxLength={40}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "pv-error" : "pv-phone-hint"}
        />
        <InputGroupAddon
          className={cn("w-16 flex-none flex-col gap-0.5 border-r border-border px-2 text-muted-foreground sm:w-20", compact && "w-20 whitespace-nowrap")}
          align="inline-start"
          aria-label={t("countryLabel")}
        >
          <span className="text-[10px]">{t("countryName")}</span>
          <span className="text-sm tabular-nums">+82</span>
        </InputGroupAddon>
      </InputGroup>
      <div className={cn(compact ? "min-h-5" : "relative h-10")}>
        <FieldDescription
          aria-hidden={Boolean(error)}
          className={cn(
            "m-0! text-xs leading-relaxed text-muted-foreground transition-opacity duration-200 ease-out",
            compact ? error && "hidden" : "absolute inset-0",
            error ? "opacity-0" : "opacity-100"
          )}
          id="pv-phone-hint"
        >
          {t("phoneHint")}
        </FieldDescription>
        <div
          className={cn(
            "transition-opacity duration-200 ease-out",
            !compact && "absolute inset-0",
            error ? "opacity-100" : "opacity-0"
          )}
        >
          {error && (
            <FieldError
              className={cn("!m-0 text-xs leading-relaxed", compact ? "text-foreground" : "text-foreground")}
              id="pv-error"
            >
              {error}
            </FieldError>
          )}
        </div>
      </div>
    </Field>
  );
}
