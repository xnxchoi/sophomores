"use client";

import { useState, type InputHTMLAttributes } from "react";
import { AuthSubmit } from "./auth-actions";
import { AuthPanel } from "./auth-panel";
import { DrawnField } from "../ui/input";

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
    <AuthPanel
      title="Create an account"
      description="The account is created when this form is submitted."
      footer="Already have an account? Sign in."
    >
      <form
        className="flex flex-col gap-5 text-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.({ name, email, password });
        }}
      >
        <div className="my-3">
          <TextField
            label="Name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="my-3">
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="my-3">
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <AuthSubmit>Create account</AuthSubmit>
      </form>
    </AuthPanel>
  );
}

export function ForgotPasswordCard({
  onSubmit
}: {
  onSubmit?: (input: { email: string }) => void;
}) {
  const [email, setEmail] = useState("");

  return (
    <AuthPanel
      title="Reset password"
      description="A reset link is sent to this email."
    >
      <form
        className="flex flex-col gap-5 text-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.({ email });
        }}
      >
        <div className="my-3">
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <AuthSubmit>Send reset link</AuthSubmit>
      </form>
    </AuthPanel>
  );
}
