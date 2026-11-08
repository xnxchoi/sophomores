"use client";

import { cn } from "cn"
import { SpinnerIcon, CircleNotchIcon as Loader2Icon } from "@phosphor-icons/react"
import { motion } from "motion/react"
import { cn as HA_cn } from "@/lib/utils";
import { ComponentProps } from "react";

const MotionSpinnerIcon = motion.create(SpinnerIcon)

function Spinner({ className, ...props }: React.ComponentProps<typeof MotionSpinnerIcon>) {
  return (
    <MotionSpinnerIcon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4", className)} {...props} animate={{ rotate: 360 }} transition={{ duration: 1, ease: "linear", repeat: Infinity }} />
  )
}

export { Spinner }

function HA_Spinner({ className, ...props }: ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={HA_cn("size-4 animate-spinner", className)}
      {...props}
    />
  );
}

export { HA_Spinner };
