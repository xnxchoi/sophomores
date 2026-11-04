"use client";

import * as React from "react"
import { cn } from "cn"
import { OTPInput, OTPInputContext } from "input-otp"
import { MinusIcon } from "@phosphor-icons/react"
import { useAnimate, type AnimationPlaybackControlsWithThen } from "motion/react"
import { MinusIcon as HA_MinusIcon } from "lucide-react";
import { cn as HA_cn } from "@/lib/utils";

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        containerClassName
      )}
      spellCheck={false}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        "flex items-center rounded-none has-aria-invalid:border-destructive has-aria-invalid:ring-1 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  caretPaused = false,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
  caretPaused?: boolean
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "relative flex size-8 items-center justify-center border-y border-r border-input text-xs transition-all outline-none first:rounded-none first:border-l last:rounded-none aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-1 data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:bg-input/30 dark:data-[active=true]:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <InputOTPCaret paused={caretPaused} />
        </div>
      )}
    </div>
  )
}

function InputOTPCaret({ paused = false }: { paused?: boolean }) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const playback = React.useRef<AnimationPlaybackControlsWithThen | null>(null)
  React.useEffect(() => {
    // Preserve the original CSS stops and per-segment ease-out, including both holds.
    playback.current = animate(scope.current, { opacity: [1, 0, 0, 1, 1] }, {
      duration: 1,
      times: [0, 0.2, 0.5, 0.7, 1],
      ease: [0, 0, 0.58, 1],
      repeat: Infinity,
    })
    return () => playback.current?.stop()
  }, [animate, scope])
  React.useEffect(() => {
    // Visibility pauses the same controls rather than restarting the blink cycle.
    if (paused) playback.current?.pause()
    else playback.current?.play()
  }, [paused])
  return <div ref={scope} data-slot="input-otp-caret" className="h-4 w-px bg-foreground" />
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className="flex items-center [&_svg:not([class*='size-'])]:size-4"
      role="separator"
      {...props}
    >
      <MinusIcon
      />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }

function HA_InputOTP({
	className,
	containerClassName,
	...props
}: HA_React.ComponentProps<typeof OTPInput> & {
	containerClassName?: string;
}) {
	return (
		<OTPInput data-slot="input-otp" containerClassName={HA_cn(
			"flex items-center gap-2 has-disabled:opacity-50",
			containerClassName,
		)} className={HA_cn("disabled:cursor-not-allowed", className)}
		          {...props} />
	);
}

function HA_InputOTPGroup({className, ...props}: HA_React.ComponentProps<"div">) {
	return (
		<div data-slot="input-otp-group" className={HA_cn("flex items-center", className)}
		     {...props} />
	);
}

function HA_InputOTPSlot({
	index,
	className,
	...props
}: HA_React.ComponentProps<"div"> & {
	index: number;
}) {
	const inputOTPContext = HA_React.useContext(OTPInputContext);
	const {char, hasFakeCaret, isActive} = inputOTPContext?.slots[index] ?? {};

	return (
		<div data-slot="input-otp-slot" data-active={isActive} className={HA_cn(
			`data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]`,
			className,
		)}
		     {...props}
		>
			{char}
			{hasFakeCaret && (
				<div
					className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
				</div>
			)}
		</div>
	);
}

function HA_InputOTPSeparator({...props}: HA_React.ComponentProps<"div">) {
	return (
		<div data-slot="input-otp-separator" role="separator" {...props}>
			<HA_MinusIcon />
		</div>
	);
}

export {HA_InputOTP, HA_InputOTPGroup, HA_InputOTPSlot, HA_InputOTPSeparator};
