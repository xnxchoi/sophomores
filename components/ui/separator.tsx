"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "cn"
import * as React from "react"
import { cn as HA_cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }

function HA_Separator({
	className,
	orientation = "horizontal",
	decorative = true,
	asChild = false,
	children,
	...props
}: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical"; decorative?: boolean; asChild?: boolean }) {
	const [child, ...siblings] = asChild && typeof children === "object" && !React.isValidElement(children) && !Array.isArray(children) ? React.Children.toArray(children) : [children];
	const hasContent = siblings.length > 0 || Boolean(child) || child === 0;
	if (asChild && !hasContent) return null;
	return (
		<SeparatorPrimitive data-slot="separator-root"
			data-orientation={orientation}
			role={decorative ? "none" : "separator"}
			aria-orientation={!decorative && orientation === "vertical" ? "vertical" : undefined}
			render={asChild ? React.Children.only(siblings.length ? [child, ...siblings] : child) as React.ReactElement : undefined}
			orientation={orientation} className={HA_cn(
				"bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
				className
			)}
			{...props}>
			{asChild ? undefined : children}
		</SeparatorPrimitive>
	)
}

function HA_GradientSeparator({ caption, orientation = "horizontal", ...props }: React.ComponentProps<'div'> & { caption?: string; orientation?: "horizontal" | "vertical" }) {
	return <div {...props} className={HA_cn(
		// "flex items-center gap-2",
		"relative", (caption ? ("gap-[1px] bg-transparent flex items-center justify-center") : "from-transparent from-[35%] via-foreground/70 via-[65%] to-transparent"), ...((orientation === 'horizontal' ? ([(caption && "h-[3px] w-full" || "h-px w-full"), "bg-linear-to-r"]) : ([(caption && "w-[3px] h-full" || "w-px h-full"), "bg-linear-to-b"])) )
	)}>
		{caption && (<><div className=
			                    {HA_cn("relative flex-[1_1_35%] from-transparent to-foreground/70", orientation === "horizontal" ? "-left-1 h-[1px] bg-linear-to-r" : "-top-1 w-[1px] bg-linear-to-b")}
		></div>
			<div className={HA_cn("text-center text-[12px]", orientation === 'horizontal' ? 'px-[1px]' : 'py-[1px]')}>
				{caption}
			</div>
			<div className=
				     {HA_cn("relative flex-[1_1_35%] from-foreground/70 to-transparent", orientation === "horizontal" ? "-right-1 h-[1px] bg-linear-to-r" : "-bottom-1 w-[1px] bg-linear-to-b")}
			></div>
		</>
		)}
	</div>
}

export { HA_Separator, HA_GradientSeparator }
