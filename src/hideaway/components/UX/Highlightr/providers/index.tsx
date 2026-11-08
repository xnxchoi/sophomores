"use client";
import { FloatMenuProvider } from "./FloatProvider";
import { HighlighterProvider } from "./HighlighterProvider";
import { SideBarProvider } from "./sideBarProvider";
import { type ReactNode } from "react";
import { CitationProvider } from "./CitationProvider";
import { PrivateMemoizer } from "../PrivateHighlights";
import { RangerProvider } from "./RangerProvider";
export const ContentProvider = ({ children }: { children: ReactNode }) => {
  return (
    <RangerProvider>
      <FloatMenuProvider>
        <HighlighterProvider>
          <CitationProvider>
            <PrivateMemoizer>
              <SideBarProvider>{children}</SideBarProvider>
            </PrivateMemoizer>
          </CitationProvider>
        </HighlighterProvider>
      </FloatMenuProvider>
    </RangerProvider>
  );
};
