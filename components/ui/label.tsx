"use client";

import * as React from "react"
import { cn } from "cn"
import { useRender } from "@base-ui/react/use-render"
import { cn as HA_cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }

function HA_Label({
	className,
	asChild = false,
	children,
	onMouseDown,
	...props
}: React.ComponentProps<"label"> & { asChild?: boolean }) {
	const hasContent = Boolean(children) || children === 0;
	return useRender({
		defaultTagName: "label",
		enabled: !asChild || hasContent,
		render: asChild && hasContent ? React.Children.only(children) as React.ReactElement : undefined,
		props: {
			"data-slot": "label",
			className: HA_cn(
			"text-[14px] leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50",
			className
			),
			...props,
			children: asChild ? undefined : children,
			onMouseDown: (event: React.MouseEvent<HTMLLabelElement>) => {
				if ((event.target as Element).closest("button, input, select, textarea")) return;
				onMouseDown?.(event);
				if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
			}
		}
	})
}

export {HA_Label}
