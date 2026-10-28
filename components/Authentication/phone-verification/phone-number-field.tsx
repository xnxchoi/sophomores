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
};

export function PhoneNumberField({
  value,
  onChange,
  error,
  inputRef,
  disabled = false
}: PhoneNumberFieldProps) {
  const t = useTranslations("Verification");
  return (
    <Field className="gap-2" data-invalid={Boolean(error)}>
      <FieldLabel
        className="text-xs font-medium text-neutral-300"
        id="pv-phone-label"
        htmlFor="pv-phone"
      >
        {t("phoneNumber")}
      </FieldLabel>
      <InputGroup
        className="h-15 gap-0 rounded-lg border-white/20 bg-black/20 p-1 shadow-[inset_0_1px_2px_#00000040] transition-[border-color,box-shadow] duration-200 ease-out focus-within:!border-white focus-within:!ring-2 focus-within:!ring-white/15 has-[[aria-invalid=true]]:border-red-400"
        aria-labelledby="pv-phone-label"
      >
        <InputGroupInput
          id="pv-phone"
          className="!mt-0 h-12 min-w-0 !border-0 bg-transparent px-3 !text-base !font-normal !tracking-[0.02em] !text-white tabular-nums !shadow-none placeholder:text-neutral-400 sm:!text-lg sm:!tracking-wide md:!text-xl"
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
          className="w-16 flex-none flex-col gap-0.5 border-r border-white/15 px-2 text-neutral-300 sm:w-20"
          align="inline-start"
          aria-label={t("countryLabel")}
        >
          <span className="text-[10px]">{t("countryName")}</span>
          <span className="text-sm tabular-nums">+82</span>
        </InputGroupAddon>
      </InputGroup>
      <div className="relative h-10">
        <FieldDescription
          aria-hidden={Boolean(error)}
          className={cn(
            "absolute inset-0 m-0! text-xs leading-relaxed text-neutral-400 transition-opacity duration-200 ease-out",
            error ? "opacity-0" : "opacity-100"
          )}
          id="pv-phone-hint"
        >
          {t("phoneHint")}
        </FieldDescription>
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200 ease-out",
            error ? "opacity-100" : "opacity-0"
          )}
        >
          {error && (
            <FieldError
              className="!m-0 text-xs leading-relaxed text-red-300"
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
