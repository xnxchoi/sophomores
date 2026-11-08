import * as React from "react"
import { cn } from "cn"
import { cn as HA_cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-none border border-input bg-transparent px-2.5 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

function HA_Textarea({className, ...props}: React.ComponentProps<"textarea">) {
	const onClick:React.MouseEventHandler = React.useCallback((e) => {
		e.stopPropagation()
	}, [])
	return (<textarea data-slot="textarea" className={HA_cn(
			"border-input placeholder:text-muted-foreground focus-visible:border-none focus-visible:ring-ring/0 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[0px] disabled:opacity-50",
			className,)} onClick={onClick}
	                  {...props} />);
}

export {HA_Textarea};
