import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { cn as HA_cn } from "@/lib/utils";

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-none border px-2.5 py-2 text-left text-xs has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-xs/relaxed text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-2",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "absolute top-[calc(--spacing(1.25))] right-[calc(--spacing(1.25))]",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }

const HA_alertVariants = cva(
	"relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
	{
		variants: {
			variant: {
				default: "bg-card text-card-foreground",
				destructive:
					"text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function HA_Alert({
	className,
	variant,
	...props
}: HA_React.ComponentProps<"div"> & VariantProps<typeof HA_alertVariants>) {
	return (
		<div data-slot="alert" role="alert" className={HA_cn(HA_alertVariants({variant}), className)}
		     {...props} />
	);
}

function HA_AlertTitle({className, ...props}: HA_React.ComponentProps<"div">) {
	return (
		<div data-slot="alert-title" className={HA_cn(
			"col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
			className,
		)}
		     {...props} />
	);
}

function HA_AlertDescription({
	className,
	...props
}: HA_React.ComponentProps<"div">) {
	return (
		<div data-slot="alert-description" className={HA_cn(
			"text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
			className,
		)}
		     {...props} />
	);
}

export {HA_Alert, HA_AlertTitle, HA_AlertDescription};
