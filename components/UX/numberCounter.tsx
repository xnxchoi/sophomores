import React, { ComponentPropsWithoutRef, useEffect, useState } from "react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";

const NumberCounterStyles = {
  display: "flex",
  justifyContent: "left",
  alignItems: "left"
};
type NumberCounterProps = {
  startNumber: number;
  endNumber: number;
  speed: number;
  prefix: string;
  suffix: string;
  loop: boolean;
  decimalSeparator: "comma" | "period" | "none" | string;
  width?: number;
} & ComponentPropsWithoutRef<"div">;

export function NumberCounter(props: NumberCounterProps) {
  const {
    startNumber,
    endNumber,
    speed,
    className,
    width = 44,
    prefix,
    suffix,
    loop,
    decimalSeparator
  } = props;
  const [count, setCount] = useState(startNumber);
  const [isVisible, setIsVisible] = useState(false);
  const ref = React.useRef(null);
  const classNameString = className ? ` ${className}` : "text-h1 font-black";
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      setIsVisible(entry?.isIntersecting ?? false);
    });
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);
  useEffect(() => {
    if (isVisible && startNumber !== endNumber) {
      const intervalId = setInterval(() => {
        if (count < endNumber) {
          setCount((prevCount) => prevCount + 1);
        } else if (loop) {
          setCount(startNumber);
        }
      }, speed);
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [count, startNumber, endNumber, loop, isVisible, speed]);
  const formatCount = (number: number) => {
    if (decimalSeparator === "comma") {
      return number.toLocaleString("en-US");
    } else if (decimalSeparator === "period") {
      return number.toLocaleString("en-US").replace(/,/g, ".");
    } else {
      return number.toFixed(0);
    }
  };
  return (
    <m.div
      ref={ref}
      style={{
        ...NumberCounterStyles,
        gap: `${width / 2}px`,
        flexDirection: "row",
        alignItems: "left"
      }}
      className={cn(classNameString, "text-nav-foreground/90")}
    >
      {prefix}
      {formatCount(count)}
      {suffix}
    </m.div>
  );
}
