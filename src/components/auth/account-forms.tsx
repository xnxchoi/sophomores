"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations("AuthCards");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthPanel
      title={t("createAnAccount")}
      description={t("theAccountIsCreatedWhenThisFormIsSubmitted")}
      footer={t("alreadyHaveAnAccountSignIn")}
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
            label={t("name")}
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="my-3">
          <TextField
            label={t("email")}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="my-3">
          <TextField
            label={t("password")}
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <AuthSubmit>{t("createAccount")}</AuthSubmit>
      </form>
    </AuthPanel>
  );
}

export function ForgotPasswordCard({
  onSubmit
}: {
  onSubmit?: (input: { email: string }) => void;
}) {
  const t = useTranslations("AuthCards");
  const [email, setEmail] = useState("");

  return (
    <AuthPanel
      title={t("resetPassword")}
      description={t("aResetLinkIsSentToThisEmail")}
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
            label={t("email")}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <AuthSubmit>{t("sendResetLink")}</AuthSubmit>
      </form>
    </AuthPanel>
  );
}
