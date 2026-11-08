import { cn } from "@/lib/utils";
import { SVGMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { ComponentProps } from "react";

export const Logo = ({ className, ...props }: ComponentProps<"svg">) => {
  return (
    <svg
      width={45}
      height={45}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("m-0 size-[45px] p-0 text-nav-foreground", className)}
      viewBox="0 0 45 45"
      data-themed="color,fill"
      fill="none"
      {...props}
    >
      <path
        d="m10.17,42.82l-.05-40.63c0-.27.29-.5.64-.5h3.14c.35,0,.64.22.64.5l.03,25.87c0,.27.29.5.64.5h13.63c.35,0,.64-.23.64-.52v-10.96c-.01-.27.27-.5.63-.5h3.14c.35,0,.64.22.64.5l.03,25.74c0,.27-.29.5-.64.5h-3.14c-.35,0-.64-.22-.64-.5v-12.39c-.01-.27-.3-.5-.65-.5h-13.63c-.35,0-.64.23-.64.52v12.39c.01.27-.27.5-.63.5h-3.14c-.35,0-.64-.22-.64-.5h0Z"
        fill="currentColor"
        data-themed="fill"
        strokeWidth={0}
      />
      <circle
        className="fill-rouge-500"
        cx="31.97"
        cy={7}
        r="2.91"
        strokeWidth={0}
      />
    </svg>
  );
};
export const Mogo = ({
  className,
  ...props
}: SVGMotionProps<SVGSVGElement>) => {
  return (
    <m.svg
      width={45}
      height={45}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("m-0 size-[45px] p-0 text-nav-foreground", className)}
      viewBox="0 0 45 45"
      data-themed="color"
      fill="none"
      {...props}
    >
      <path
        d="m10.17,42.82l-.05-40.63c0-.27.29-.5.64-.5h3.14c.35,0,.64.22.64.5l.03,25.87c0,.27.29.5.64.5h13.63c.35,0,.64-.23.64-.52v-10.96c-.01-.27.27-.5.63-.5h3.14c.35,0,.64.22.64.5l.03,25.74c0,.27-.29.5-.64.5h-3.14c-.35,0-.64-.22-.64-.5v-12.39c-.01-.27-.3-.5-.65-.5h-13.63c-.35,0-.64.23-.64.52v12.39c.01.27-.27.5-.63.5h-3.14c-.35,0-.64-.22-.64-.5h0Z"
        fill="currentColor"
        data-themed="fill"
        strokeWidth={0}
      />
      <circle
        className="fill-rouge-500"
        cx="31.97"
        cy={7}
        r="2.91"
        strokeWidth={0}
      />
    </m.svg>
  );
};
