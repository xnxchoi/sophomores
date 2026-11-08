import { cn } from "@/lib/utils";
import { useState } from "react";

export const Marquee = ({
  direction,
  texts
}: {
  direction: "ltr" | "rtl";
  texts: string[];
}) => {
  const [state, setState] = useState<"playing" | "paused">("playing");
  return (
	  <div
		  className="relative z-200 flex h-[40px] w-full items-center justify-start overflow-hidden bg-transparent-base/100 text-nav-button">
      <div
        className={cn(
          "absolute whitespace-nowrap will-change-transform",
          direction === "ltr"
            ? "marquee-horizontal-ltr"
            : "marquee-horizontal-rtl"
        )}
        onMouseEnter={() => setState("paused")}
        onMouseLeave={() => setState("playing")}
        data-state={state}
      >
        {[1, 2, 3, 4, 5, 6].map((_, idex) =>
          texts.map((text, index) => (
            <span
              key={index + text + idex}
              className={
                "mr-[8vw] inline-block flex-[0_0_auto] text-[14px] uppercase"
              }
            >
              {text}
            </span>
          ))
        )}
      </div>
    </div>
  );
};
export const CursorMarquee = () => {};
