"use client";
import { useDomCursor } from "@/components/core/cursorWrapper";
import { HA_Button as Button } from "@/components/ui/button";
import { EASING, SPRING_EASE } from "@/constants/animations";
import { cn } from "@/lib/utils";
import { Tooltip } from "@base-ui/react/tooltip";
import { Check, Copy } from "lucide-react";
import { AnimatePresence, HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState } from "react";

type CopyButtonProps = Omit<HTMLMotionProps<"div">, "children" | "onClick"> & {
  textToCopy: string;
};

export default function CopyButton({ textToCopy }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={() => (
            <Button
              variant="link"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8"
            >
              {isCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy to clipboard</span>
            </Button>
          )}
        />
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>
              <p>{isCopied ? "Copied!" : "Copy to clipboard"}</p>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
export const CopyLinkButton = ({
  textToCopy,
  onMouseLeave: oml,
  onMouseEnter: ome,
  className,
  ...props
}: CopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      timeoutRef.current && clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, [textToCopy]);
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    onEnter: ome,
    onLeave: oml
  });
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={() => (
          <m.div
            onClick={handleCopy}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            animate={{
              scale: 1,
              opacity: 0.8
            }}
            whileHover={{
              scale: 1.1,
              opacity: 1
            }}
            transition={{
              type: "spring",
              ...SPRING_EASE.power2.out,
              visualDuration: 0.15
            }}
            className={cn(
              "z-20 h-8 w-8 transition-colors duration-200 ease-in-out-power3 hover:text-muted-off-foreground",
              className
            )}
            {...props}
          >
            <AnimatePresence initial={false} mode="sync">
              {isCopied ? (
                <m.div
                  className="h-4 w-4 text-inherit"
                  initial={{
                    opacity: 0
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    transition: {
                      type: "tween",
                      ease: EASING.power3.inOut,
                      duration: 0.2
                    }
                  }}
                  exit={{
                    scale: 0.1,
                    transition: {
                      type: "tween",
                      ease: EASING.power3.inOut,
                      duration: 0.2
                    }
                  }}
                >
                  <Check className="h-4 w-4 fill-current" />
                </m.div>
              ) : (
                <m.svg
                  initial={{
                    scale: 0.1
                  }}
                  animate={{
                    scale: 1,
                    transition: {
                      type: "tween",
                      ease: EASING.power3.inOut,
                      duration: 0.2
                    }
                  }}
                  exit={{
                    scale: 0.1,
                    transition: {
                      type: "tween",
                      ease: EASING.power3.inOut,
                      duration: 0.2
                    }
                  }}
                  className="flex items-center fill-current"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 40 40"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>Copy Link to Clipboard</title>
                  <path d="M16.9691 32.9499C14.2358 35.6832 9.78321 35.6832 7.04996 32.9499C4.31671 30.2166 4.31665 25.764 7.04996 23.0307L12.5606 17.52C15.294 14.7867 19.7465 14.7867 22.4798 17.52C22.704 17.7383 22.8315 18.037 22.8337 18.3499C22.8359 18.6628 22.7125 18.9634 22.4912 19.1846C22.2702 19.4059 21.9693 19.5293 21.6568 19.5271C21.3439 19.5249 21.0449 19.3975 20.8266 19.1732C18.9805 17.3271 16.0599 17.3271 14.2137 19.1732L8.70306 24.6839C6.85694 26.53 6.85694 29.4507 8.70306 31.2968C10.5492 33.1429 13.4698 33.1426 15.3159 31.2968L20.551 26.0614V26.0617C20.7693 25.8375 21.0683 25.71 21.3811 25.7078C21.694 25.7056 21.9946 25.829 22.2159 26.0503C22.4368 26.2716 22.5602 26.5722 22.5581 26.885C22.5559 27.1979 22.4284 27.4966 22.2042 27.7149L16.9691 32.9499ZM27.4394 22.4796C24.706 25.2129 20.2535 25.2129 17.5202 22.4796V22.4799C17.296 22.2616 17.1685 21.9629 17.1663 21.65C17.1644 21.3372 17.2875 21.0366 17.5088 20.8153C17.7301 20.5941 18.0307 20.4707 18.3435 20.4728C18.6564 20.475 18.9551 20.6025 19.1734 20.8267C21.0195 22.6728 23.9401 22.6728 25.7863 20.8267L31.2969 15.316C33.1431 13.4699 33.1431 10.5493 31.2969 8.70316C29.4508 6.85704 26.5302 6.85704 24.6841 8.70316L19.449 13.9382C19.2307 14.1625 18.9317 14.2902 18.6189 14.2924C18.306 14.2946 18.0054 14.1712 17.7841 13.9499C17.5629 13.7286 17.4395 13.428 17.4417 13.1149C17.4438 12.802 17.5713 12.503 17.7958 12.285L23.0309 7.04999C25.7642 4.31667 30.2168 4.31667 32.95 7.04999C35.6833 9.7833 35.6834 14.2359 32.95 16.9691L27.4394 22.4798L27.4394 22.4796Z"></path>
                </m.svg>
              )}
            </AnimatePresence>
            <span className="sr-only">Copy to clipboard</span>
          </m.div>
        )}
      />
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" align="center">
          <Tooltip.Popup>
            <span className={"text-sm"}>
              {isCopied ? "Copied!" : "Copy to clipboard"}
            </span>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
