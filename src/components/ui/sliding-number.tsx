"use client";
import { motionValue, SpringOptions } from "motion";
import {
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform
} from "motion/react";
import * as motion from "motion/react-m";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const TRANSITION: SpringOptions = {
  stiffness: 280,
  damping: 18,
  mass: 0.3
};

function Digit({ value, place }: { value: number; place: number }) {
  const valueRoundedToPlace = Math.floor(value / place) % 10;
  const initial = motionValue(valueRoundedToPlace);
  const animatedValue = useSpring(initial, TRANSITION);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div className="relative inline-block w-[1ch] overflow-x-visible overflow-y-clip leading-none tabular-nums">
      <div className="invisible">0</div>
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} />
      ))}
    </div>
  );
}

function Number({ mv, number }: { mv: MotionValue<number>; number: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const next = ref.current?.getBoundingClientRect().height ?? 0;
    if (next > 0) setHeight(next);
  }, []);

  const y = useTransform(mv, (latest) => {
    if (!height) return 0;
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) memo -= 10 * height;
    return memo;
  });

  if (!height) {
    return (
      <span ref={ref} className="invisible absolute">
        {number}
      </span>
    );
  }

  return (
    <motion.span
      ref={ref}
      style={{ y }}
      className="absolute inset-0 flex items-center justify-center"
    >
      {number}
    </motion.span>
  );
}

type SlidingNumberProps = {
  value: MotionValue<number> | number;
  padStart?: boolean;
  decimalSeparator?: string;
};

export function SlidingNumber({
  value: valueProp,
  padStart = false,
  decimalSeparator = "."
}: SlidingNumberProps) {
  const value = typeof valueProp === "number" ? valueProp : valueProp.get();
  const absValue = Math.abs(value);
  const [integerPart, decimalPart] = absValue.toString().split(".");
  const integerValue = parseInt(integerPart, 10);
  const paddedInteger =
    padStart && integerValue < 10 ? `0${integerPart}` : integerPart;
  const integerDigits = paddedInteger.split("");
  const integerPlaces = integerDigits.map((_, i) =>
    Math.pow(10, integerDigits.length - i - 1)
  );

  return (
    <div className="flex items-center">
      {value < 0 && "-"}
      {integerDigits.map((_, index) => (
        <Digit
          key={`pos-${integerPlaces[index]}`}
          value={integerValue}
          place={integerPlaces[index]}
        />
      ))}
      {decimalPart && (
        <>
          <span>{decimalSeparator}</span>
          {decimalPart.split("").map((_, index) => (
            <Digit
              key={`decimal-${index}`}
              value={parseInt(decimalPart, 10)}
              place={Math.pow(10, decimalPart.length - index - 1)}
            />
          ))}
        </>
      )}
    </div>
  );
}
