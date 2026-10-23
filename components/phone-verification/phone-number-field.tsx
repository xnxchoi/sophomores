"use client";

import type { Ref } from "react";
import { useTranslations } from "next-intl";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "../ui/input-group";

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
    <Field className="pv-number-field" data-invalid={Boolean(error)}>
      <FieldLabel id="pv-phone-label" htmlFor="pv-phone">
        {t("phoneNumber")}
      </FieldLabel>
      <InputGroup className="pv-phone-field" aria-labelledby="pv-phone-label">
        <InputGroupInput
          id="pv-phone"
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
          aria-describedby={`pv-phone-hint${error ? " pv-error" : ""}`}
        />
        <InputGroupAddon
          className="pv-phone-country"
          align="inline-start"
          aria-label={t("countryLabel")}
        >
          <span className="pv-country-name">{t("countryName")}</span>
          <span className="pv-country-code">+82</span>
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription id="pv-phone-hint">{t("phoneHint")}</FieldDescription>
      {error && <FieldError id="pv-error">{error}</FieldError>}
    </Field>
  );
}
