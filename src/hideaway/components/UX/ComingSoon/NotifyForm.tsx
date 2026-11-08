"use client";

import { Button } from "@/hideaway/components/core/Button";
import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NotifyFormProps {
  className?: string;
  topic?: string;
}

export function NotifyForm({ className, topic = "unknown" }: NotifyFormProps) {
  const t = useTranslations("ComingSoon.notify");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    console.info("[ComingSoon] notify-me stub", { topic, email: trimmed });
    toast(t("ack"));
    setSubmitted(true);
    setEmail("");
  };

  if (submitted) {
    return (
      <p
        className={cn(
          "font-sans text-[11px] tracking-wide text-muted-foreground/70",
          className
        )}
      >
        {t("ack")}
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex items-end gap-4", className)}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("placeholder")}
        className="flex-1 border-b border-border/30 bg-transparent pb-2 text-sm font-light tracking-tight placeholder:text-muted-foreground/30 focus:border-foreground/40 focus:outline-none"
      />
      <Button
        type="submit"
        className="shrink-0 font-sans text-[11px] tracking-widest text-foreground/70 uppercase transition-colors hover:text-foreground"
      >
        {t("cta")} →
      </Button>
    </form>
  );
}
