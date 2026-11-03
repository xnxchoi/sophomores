import type { InputHTMLAttributes } from "react";

/** Resting rule is a faint shade. Focus draws the full-strength line from the left. */
export function DrawnField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="drawn-field">
      <input {...props} placeholder=" " className="drawn-field-input" />
      <span className="drawn-field-line" aria-hidden="true" />
      <span className="drawn-field-label">{label}</span>
    </label>
  );
}
