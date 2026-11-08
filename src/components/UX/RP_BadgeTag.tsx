import { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const RP_BadgeTag = (
  props: { content: string } & {
    wrapperClassName?: string;
  } & ComponentPropsWithoutRef<"span">
) => {
  const { content, wrapperClassName, className, ...rest } = props;
  return (
    <div className={cn("text-[1.1rem]", wrapperClassName)}>
      <span
        className={cn(
	        "inline-block rounded-[20px] border-[1px] border-solid border-nav-foreground pt-[5px] pr-[9px] pb-[5px] pl-[9px] text-center text-[10px] leading-[.95] font-medium tracking-[-.01em] text-nav-foreground uppercase",
          className
        )}
        {...rest}
      >
        {content}
      </span>
    </div>
  );
};
