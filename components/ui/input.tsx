import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";
import { Label, HA_Label } from "./label";
import { ComponentProps } from "react";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      suppressHydrationWarning
      className={cn(
        "h-8 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        "border-faded-background/60 flex h-8 w-full min-w-0 border-b border-solid bg-transparent px-2.5 py-3.5 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-background selection:text-foreground file:inline-flex file:h-6 file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-base placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-faded-background/50 focus-visible:ring-ring/0 focus-visible:ring-offset-0",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  );
}

export function InputFile({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="picture">Picture</Label>
      <Input id="picture" type="file" {...props} />
    </div>
  );
}

function HA_Input({className, type, ...props}: React.ComponentProps<"input">) {
	return (
		<input type={type} data-slot="input" suppressHydrationWarning className={cn(
			"file:text-foreground placeholder:text-muted-foreground  placeholder:text-base selection:bg-background selection:text-foreground flex h-14 w-full min-w-0 border-solid border-b-1 border-faded-background/60 bg-transparent px-4 py-5 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-11 file:border-0 file:bg-transparent file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
			"focus-visible:border-faded-background/50 focus-visible:ring-ring/0 focus-visible:ring-offset-0",
			"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
			className
		)}
		       {...props} />
	)
}

export function HA_InputFile({className, ...props}: React.ComponentProps<"input">) {
	return (<div className="grid w-full max-w-sm items-center gap-1.5">
		<HA_Label htmlFor="picture">Picture</HA_Label>
		<HA_Input id="picture" type="file" {...props} />
	</div>)
}

export {HA_Input}
