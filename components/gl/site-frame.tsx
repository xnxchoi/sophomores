"use client";

import { useRef, type ReactNode } from "react";
import { SiteCursor } from "@/components/shell/cursor";
import { CanvasBoundary } from "./canvas-boundary";
import { SharedCanvas } from "./shared-canvas";

/**
 * The public site's one shared canvas. Pages join it with drei `<View>`.
 * Auth's staff login document and the Payload admin root do not mount this.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={frameRef} className="has-site-cursor">
      {children}
      <SiteCursor />
      <CanvasBoundary>
        <SharedCanvas eventSource={frameRef} />
      </CanvasBoundary>
    </div>
  );
}
