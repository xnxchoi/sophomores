"use client";

import { useState, type InputHTMLAttributes } from "react";

function TextField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-base">
      {label}
      <input
        {...props}
        className="border-b border-border bg-transparent py-2 text-base outline-none"
      />
    </label>
  );
}

export function SignUpCard({
  onSubmit
}: {
  onSubmit?: (input: { name: string; email: string; password: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="flex flex-col gap-4 border border-border px-6 py-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.({ name, email, password });
      }}
    >
      <h2 className="text-2xl font-light tracking-tight">Create an account</h2>
      <TextField label="Name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextField label="Password" name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <button type="submit" className="border border-border px-4 py-3 text-base">
        Continue
      </button>
    </form>
  );
}

export function ForgotPasswordCard({
  onSubmit
}: {
  onSubmit?: (input: { email: string }) => void;
}) {
  const [email, setEmail] = useState("");

  return (
    <form
      className="flex flex-col gap-4 border border-border px-6 py-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.({ email });
      }}
    >
      <h2 className="text-2xl font-light tracking-tight">Reset password</h2>
      <TextField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <button type="submit" className="border border-border px-4 py-3 text-base">
        Send reset link
      </button>
    </form>
  );
}
