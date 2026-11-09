"use client";

import { useState } from "react";
import { LinkUnderlined } from "@/components/core/Link/Link";
import { AuthSubmit } from "./auth-actions";
import { AuthPanel } from "./auth-panel";
import { DrawnField } from "../ui/input";

export function SignInCard({
  onSubmit
}: {
  onSubmit?: (input: { email: string; password: string }) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthPanel
      title="Sign in"
      description="Use the email and password for this account."
    >
      <form
        className="flex flex-col gap-5 text-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.({ email, password });
        }}
      >
        <div className="my-3">
          <DrawnField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="my-3">
          <DrawnField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="mt-3 flex justify-end">
            <LinkUnderlined href="#reset" className="text-[12px]">
              Forgot password
            </LinkUnderlined>
          </div>
        </div>
        <AuthSubmit>Continue</AuthSubmit>
      </form>
    </AuthPanel>
  );
}
