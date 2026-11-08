"use client";

import { cn } from "@/lib/utils";
import { ForwardButton } from "./ForwardButton";
import { PlayPauseButton } from "./PlayPauseButton";
import { RewindButton } from "./RewindButton";

type TransportBarProps = {
  compact?: boolean;
  className?: string;
};

export const TransportBar = ({
  compact = false,
  className
}: TransportBarProps) => {
  const buttonSize = compact ? 36 : 48;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center",
        compact ? "gap-2" : "gap-6",
        className
      )}
    >
      <RewindButton size={buttonSize} />
      <PlayPauseButton size={buttonSize + (compact ? 4 : 8)} />
      <ForwardButton size={buttonSize} />
    </div>
  );
};
