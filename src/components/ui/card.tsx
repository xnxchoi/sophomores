import * as React from "react"
import { cn } from "cn"
import { cn as HA_cn } from "@/lib/utils";

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-none bg-card py-(--card-spacing) text-xs/relaxed text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-none px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-sm font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-none border-t p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

function HA_Card({className, ...props}: React.ComponentProps<"div">) {
	return (
		<div data-slot="card" className={HA_cn(
			"flex flex-col gap-8.5 rounded-xl py-10 px-3 shadow-sm/25 dark:shadow-md/30 md:shadow-md/25 md:dark:shadow-lg/30 outline-1 outline-groove bg-transparent",
			className,
		)}
		     {...props} style={{
			outlineColor: "oklch(from var(--muted-faded-fg) l c h/.3)",
			...props.style,
		}} />
	);
}

function HA_CardHeader({className, ...props}: React.ComponentProps<"div">) {
	return (
		<div data-slot="card-header" className={HA_cn(
			"@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2.5 px-9 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-9",
			className,
		)}
		     {...props} />
	);
}

function HA_CardTitle({className, ...props}: React.ComponentProps<"div">) {
	return (
		<div data-slot="card-title" className={HA_cn("leading-none font-medium", className)}
		     {...props} />
	);
}

function HA_CardDescription({className, ...props}: React.ComponentProps<"div">) {
	return (
		<div data-slot="card-description" className={HA_cn("text-muted-foreground text-base", className)}
		     {...props} />
	);
}

function HA_CardAction({className, ...props}: React.ComponentProps<"div">) {
	return (
		<div data-slot="card-action" className={HA_cn(
			"col-start-2 row-span-2 row-start-1 self-start justify-self-end",
			className,
		)}
		     {...props} />
	);
}

function HA_CardContent({className, ...props}: React.ComponentProps<"div">) {
	return (
		<div data-slot="card-content" className={HA_cn("px-9", className)}
		     {...props} />
	);
}

function HA_CardFooter({className, ...props}: React.ComponentProps<"div">) {
	return (
		<div data-slot="card-footer"
		     className={HA_cn("flex items-center px-9 [.border\-t]:pt-9", className)}
		     {...props} />
	);
}

export {
	HA_Card,
	HA_CardHeader,
	HA_CardFooter,
	HA_CardTitle,
	HA_CardAction,
	HA_CardDescription,
	HA_CardContent,
};
