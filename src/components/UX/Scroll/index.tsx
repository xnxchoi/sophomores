"use client";
import "lenis/dist/lenis.css";
import {
  LenisProps as ReactLenisProps,
  LenisRef,
  ReactLenis
} from "lenis/react";
import { getLenisRafTime } from "./lenis-raf-time";
import { useRef } from "react";
import { useTempus } from "tempus/react";
import { LenisOptions } from "lenis";

interface LenisProps extends Omit<ReactLenisProps, "ref"> {
  root: boolean;
  options?: LenisOptions;
}

export function Linus({ root, options }: LenisProps) {
  const lenisRef = useRef<LenisRef>(null!);
  useTempus((frame) => {
    const time = getLenisRafTime(frame);
    if (time !== null && !!lenisRef.current?.lenis) {
      lenisRef.current.lenis.raf(time);
    }
  });
  return (
    <ReactLenis
      ref={lenisRef}
      root={root}
      options={{
        ...options,
        autoRaf: false,
        anchors: true
      }}
    />
  );
}
