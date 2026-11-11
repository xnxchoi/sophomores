"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioPreviewState {
  activeId: string | null;
  isPlaying: boolean;
  progress: number; // 0 to 1
  toggle: (id: string, previewUrl?: string) => void;
  pause: () => void;
}

export function useAudioPreview(): AudioPreviewState {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (audio.duration && audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setActiveId(null);
    };

    const onError = () => {
      setIsPlaying(false);
      setProgress(0);
      setActiveId(null);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onPlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      audio.src = "";
    };
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const toggle = useCallback(
    (id: string, previewUrl?: string) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (activeId === id && isPlaying) {
        audio.pause();
        return;
      }

      if (!previewUrl) return;

      if (audio.src !== previewUrl) {
        audio.src = previewUrl;
      }

      setActiveId(id);
      setProgress(0);
      audio.play().catch(() => {
        setIsPlaying(false);
        setActiveId(null);
      });
    },
    [activeId, isPlaying]
  );

  return {
    activeId,
    isPlaying,
    progress,
    toggle,
    pause
  };
}
