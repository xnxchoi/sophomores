"use client"

import { cn } from "cn"
import { SpinnerIcon } from "@phosphor-icons/react"
import { motion } from "motion/react"

const MotionSpinnerIcon = motion.create(SpinnerIcon)

function Spinner({ className, ...props }: React.ComponentProps<typeof MotionSpinnerIcon>) {
  return (
    <MotionSpinnerIcon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4", className)} {...props} animate={{ rotate: 360 }} transition={{ duration: 1, ease: "linear", repeat: Infinity }} />
  )
}

export { Spinner }
