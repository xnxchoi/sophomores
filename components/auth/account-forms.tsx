"use client";

import { useState, type InputHTMLAttributes } from "react";
import { DrawnField } from "./drawn-field";


function TextField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <DrawnField label={label} {...props} />;
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
      className="port-rule flex flex-col gap-5 rounded-2xl border bg-faded-black px-6 py-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.({ name, email, password });
      }}
    >
      <h2 className="font-serif text-4xl font-light tracking-tight">Create an account</h2>
      <TextField label="Name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextField label="Password" name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <button type="submit" className="port-control port-sheen inline-flex h-12 w-full items-center justify-center rounded-md px-4 text-base font-light tracking-wide">
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
      className="port-rule flex flex-col gap-5 rounded-2xl border bg-faded-black px-6 py-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.({ email });
      }}
    >
      <h2 className="font-serif text-4xl font-light tracking-tight">Reset password</h2>
      <TextField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <button type="submit" className="port-control port-sheen inline-flex h-12 w-full items-center justify-center rounded-md px-4 text-base font-light tracking-wide">
        Send reset link
      </button>
    </form>
  );
}
