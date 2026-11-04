import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export function PlaceHolderImage({
  className,
  style,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "absolute top-0 block h-full w-full rounded-[5px] object-cover transition-opacity duration-400",
        className
      )}
      style={style}
      {...props}
    />
  );
}
