"use client";

import { cn } from "cn"
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<"div"> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          "--ratio": ratio,
        } as React.CSSProperties
      }
      className={cn("relative aspect-(--ratio)", className)}
      {...props}
    />
  )
}

export { AspectRatio }

function HA_AspectRatio({
	...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
	return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />
}

export {HA_AspectRatio}
