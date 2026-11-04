"use client";

import { useEffect } from "react";

import { createFaviconWorkerInitMessage } from "./faviconConfig";
import {
  captureFaviconLink,
  ensureFaviconLink,
  restoreFaviconLink,
  restoreStaticFaviconLinks,
  setAnimatedFaviconHref,
  suspendStaticFaviconLinks
} from "./faviconLink";
import {
  canAnimateFavicon,
  measureFaviconFrameRate
} from "./support";

const FAVICON_WORKER_PATH = "/favicon-spin-worker.js";

type FaviconWorkerMessage =
  | {
      dataUrl: string;
      type: "updateFavicon";
    }
  | {
      message: string;
      type: "favicon:error";
    };

const getAnimationRuntime = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window;
};

export const AnimatedFavicon = () => {
  useEffect(() => {
    const runtime = getAnimationRuntime();

    if (!runtime || !canAnimateFavicon(runtime)) {
      return;
    }

    let isActive = true;
    let worker: Worker | null = null;
    let restoreFavicons: (() => void) | null = null;

    const cleanupWorker = () => {
      worker?.postMessage({ type: "stop" });
      worker?.terminate();
      worker = null;
    };

    const restore = () => {
      cleanupWorker();
      restoreFavicons?.();
      restoreFavicons = null;
    };

    const startAnimation = async () => {
      const variant = await measureFaviconFrameRate(runtime);

      if (!isActive || !canAnimateFavicon(runtime)) {
        return;
      }

      const initMessage = createFaviconWorkerInitMessage(variant);
      const link = ensureFaviconLink(document);
      const snapshot = captureFaviconLink(link);
      const staticFaviconSnapshots = suspendStaticFaviconLinks(document, link);

      setAnimatedFaviconHref(link, initMessage.baseImage);

      restoreFavicons = () => {
        restoreFaviconLink(link, snapshot);
        restoreStaticFaviconLinks(staticFaviconSnapshots);
      };

      try {
        worker = new Worker(FAVICON_WORKER_PATH);
      } catch {
        restore();
        return;
      }

      worker.onerror = () => {
        restore();
      };

      worker.onmessage = (event: MessageEvent<FaviconWorkerMessage>) => {
        if (!isActive) {
          return;
        }

        if (event.data.type === "updateFavicon") {
          setAnimatedFaviconHref(link, event.data.dataUrl);
          return;
        }

        restore();
      };

      worker.postMessage(initMessage);
    };

    void startAnimation();

    return () => {
      isActive = false;
      restore();
    };
  }, []);

  return null;
};

export default AnimatedFavicon;
