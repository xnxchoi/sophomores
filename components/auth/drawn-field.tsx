import type { InputHTMLAttributes } from "react";

/**
 * Hideaway field order: input, then the baseline, then the label.
 * The line and the label are the sibling rules in __inputs.scss.
 */
export function DrawnField({
  label,
  id,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? props.name;
  return (
    <div className="form-field active relative">
      <input {...props} id={fieldId} placeholder=" " className="w-input" />
      <div data-form="baseline" />
      <label className="input-label" htmlFor={fieldId}>
        {label}
      </label>
    </div>
  );
}
