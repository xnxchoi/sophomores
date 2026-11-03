"use client";

import { Component, type ReactNode } from "react";

type CanvasBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type CanvasBoundaryState = {
  failed: boolean;
};

/** A lost WebGL context or a failed model renders the fallback and leaves the page up. */
export class CanvasBoundary extends Component<CanvasBoundaryProps, CanvasBoundaryState> {
  state: CanvasBoundaryState = { failed: false };

  static getDerivedStateFromError(): CanvasBoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
