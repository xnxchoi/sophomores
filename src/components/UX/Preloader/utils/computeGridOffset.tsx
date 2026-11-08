"use client";
import styles from "*.module.css";
import { TranslatePosition } from "@/components/UX/Preloader/types";

export const computeGridOffset = ({
  number,
  corner,
  offset
}: TranslatePosition): { x: number; y: number } => {
  const box = document.querySelector(
    `[data-grid-box="${number}"]`
  ) as HTMLElement | null;
  const cornerEl = box?.querySelector(`[data-position="${corner}"]`);
  const wrapper = document.querySelector(`.${styles.text}`); // container for measuring spacing

  if (!box || !cornerEl || !wrapper) return { x: 0, y: 0 };

  const { top, left } = cornerEl.getBoundingClientRect();
  const gridGap = parseInt(
    getComputedStyle(wrapper).getPropertyValue("gap"),
    10
  );
  const boxWidth = box.offsetWidth + gridGap;
  const boxHeight = box.offsetHeight + gridGap;

  let xOffset = 0,
    yOffset = 0;

  if (typeof offset?.x === "string") {
    const [dir, mult] = offset.x.split("_");
    xOffset = parseInt(mult) * boxWidth * (dir === "LEFT" ? -1 : 1);
  } else if (typeof offset?.x === "number") {
    xOffset = offset.x;
  }

  if (typeof offset?.y === "string") {
    const [dir, mult] = offset.y.split("_");
    yOffset = parseInt(mult) * boxHeight * (dir === "UP" ? -1 : 1);
  } else if (typeof offset?.y === "number") {
    yOffset = offset.y;
  }

  return {
    x: left + xOffset,
    y: top + yOffset
  };
};
