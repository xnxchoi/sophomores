"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PreviewStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface AudioPreviewState {
  activeId: string | null;
  status: PreviewStatus;
  isPlaying: boolean;
  toggle: (id: string, previewUrl?: string) => void;
  pause: () => void;
}

type Preview = {
  id: string;
  url: string;
  audio: HTMLAudioElement;
  attempt: number;
  status: PreviewStatus;
  dispose: () => void;
};

export function useAudioPreview(): AudioPreviewState {
  const [state, setState] = useState<{ activeId: string | null; status: PreviewStatus }>({ activeId: null, status: "idle" });
  const current = useRef<Preview | null>(null);

  useEffect(() => () => {
    const preview = current.current;
    current.current = null;
    preview?.dispose();
  }, []);

  const pause = useCallback(() => {
    const preview = current.current;
    if (!preview || (preview.status !== "playing" && preview.status !== "loading")) return;
    preview.attempt++;
    preview.status = "paused";
    preview.audio.pause();
    setState({ activeId: preview.id, status: "paused" });
  }, []);

  const toggle = useCallback((id: string, url?: string) => {
    if (!url) return;
    let preview = current.current;
    if (preview?.id === id && preview.url === url && (preview.status === "playing" || preview.status === "loading")) {
      pause();
      return;
    }

    if (preview?.id !== id || preview.url !== url || preview.status === "error") {
      current.current = null;
      preview?.dispose();
      const audio = new Audio();
      audio.preload = "none";
      const load: Preview = { id, url, audio, attempt: 0, status: "idle", dispose: () => {
        audio.removeEventListener("ended", ended);
        audio.removeEventListener("error", failed);
        audio.removeEventListener("pause", paused);
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      } };
      const ended = () => {
        if (current.current !== load) return;
        load.attempt++;
        load.status = "idle";
        setState({ activeId: null, status: "idle" });
      };
      const failed = () => {
        if (current.current !== load) return;
        load.attempt++;
        load.status = "error";
        setState({ activeId: id, status: "error" });
      };
      const paused = () => {
        if (current.current !== load || !audio.paused || audio.ended || load.status !== "playing") return;
        load.status = "paused";
        setState({ activeId: id, status: "paused" });
      };
      audio.addEventListener("ended", ended);
      audio.addEventListener("error", failed);
      audio.addEventListener("pause", paused);
      current.current = load;
      preview = load;
      audio.src = url;
    }

    const load = preview;
    const attempt = ++load.attempt;
    load.status = "loading";
    setState({ activeId: id, status: "loading" });
    void load.audio.play().then(() => {
      if (current.current !== load || load.attempt !== attempt) return;
      load.status = load.audio.paused ? "paused" : "playing";
      setState({ activeId: id, status: load.status });
    }, () => {
      if (current.current !== load || load.attempt !== attempt) return;
      load.status = "error";
      setState({ activeId: id, status: "error" });
    });
  }, [pause]);

  return { ...state, isPlaying: state.status === "playing", toggle, pause };
}
