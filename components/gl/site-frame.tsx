"use client";

import { useRef, type ReactNode } from "react";
import { SiteCursor } from "@/components/shell/cursor";
import { SiteMenu } from "@/components/shell/site-menu";
import { PageMotion } from "@/components/shell/page-motion";
import { SiteScroll } from "@/components/shell/site-scroll";
import { SiteTheme } from "@/components/shell/site-theme";
import { CanvasBoundary } from "./canvas-boundary";
import { SharedCanvas } from "./shared-canvas";

/**
 * The public site's one shared canvas. Pages join it with drei `<View>`.
 * Auth's staff login document and the Payload admin root do not mount this.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);

  return (
    <SiteScroll>
    <div ref={frameRef} className="has-site-cursor">
      <SiteTheme />
      <PageMotion>{children}</PageMotion>
      <SiteMenu />
      <SiteCursor />
      <CanvasBoundary>
        <SharedCanvas eventSource={frameRef} />
      </CanvasBoundary>
    </div>
    </SiteScroll>
  );
}
