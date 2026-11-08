import { HA_ScrollArea as ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { ProgressiveBlur } from "./ProgressiveBlur";
import * as m from "motion/react-m";
type BlurEdges = "top" | "bottom" | "left" | "right";
type BlurArea = BlurEdges | BlurEdges[] | "all";
export interface ProgressiveScrollAreaProps {
  blurAreas?: BlurArea;
  blurLayers?: number;
  blurIntensity?: number;
  direction?: "vertical" | "horizontal";
}
const MotionScrollArea = m.create(ScrollArea);
export function ProgressiveScrollArea({
  blurAreas = ["top", "bottom"],
  blurLayers = 8,
  blurIntensity = 0.25,
  direction = "vertical",
  className,
  dir,
  children,
  ...props
}: ProgressiveScrollAreaProps & ComponentProps<"div">) {
  return (
    <ScrollArea {...props} dir={dir === "rtl" ? dir : "ltr"}>
      <ProgressiveBlur
        direction={"top"}
        blurLayers={blurLayers}
        blurIntensity={blurIntensity}
        className={
          "pointer-events-none absolute top-0 right-0 left-0 h-[100px] w-full"
        }
      />
      {children}
      <ProgressiveBlur
        direction={"bottom"}
        blurLayers={blurLayers}
        blurIntensity={blurIntensity}
        className={
          "pointer-events-none absolute right-0 bottom-0 left-0 h-[100px] w-full"
        }
      />
    </ScrollArea>
  );
}
export function MotionBlurScrollArea(
  props: ProgressiveScrollAreaProps & ComponentProps<typeof MotionScrollArea>
) {
  return <MotionScrollArea {...props} />;
}
