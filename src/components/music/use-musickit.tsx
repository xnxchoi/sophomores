"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    MusicKit?: {
      configure: (config: {
        developerToken: string;
        app: { name: string; build: string };
      }) => Promise<unknown>;
      getInstance: () => {
        authorize: () => Promise<string>;
        unauthorize: () => Promise<void>;
        isAuthorized: boolean;
        musicUserToken?: string;
      };
    };
  }
}

export interface UseMusicKitReturn {
  isConfigured: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  statusMessage: string | null;
  authorizeCurator: () => Promise<boolean>;
  syncNow: () => Promise<{ success: boolean; syncedCount: number; message?: string }>;
}

export function useMusicKit(slug: string, initialIsConfigured = false): UseMusicKitReturn {
  const [isConfigured, setIsConfigured] = useState(initialIsConfigured);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const isScriptLoadedRef = useRef(false);

  // Check current configuration from server
  useEffect(() => {
    let isCancelled = false;
    async function checkServerStatus() {
      try {
        const res = await fetch(`/api/setlists/${encodeURIComponent(slug)}/apple-token`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && typeof data.isConfigured === "boolean") {
            setIsConfigured(data.isConfigured);
          }
        }
      } catch {
        // Keep initial state if fetch fails
      }
    }
    checkServerStatus();
    return () => {
      isCancelled = true;
    };
  }, [slug]);

  // Load and initialize MusicKit JS on demand
  const initializeMusicKit = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    if (window.MusicKit && isScriptLoadedRef.current) {
      return true;
    }

    // 1. Fetch Developer Token
    const devTokenRes = await fetch("/api/music/apple/developer-token");
    if (!devTokenRes.ok) {
      throw new Error("Failed to retrieve Apple Developer Token.");
    }
    const { developerToken } = await devTokenRes.json();

    // 2. Load script if not already present in DOM
    if (!document.getElementById("musickit-sdk")) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.id = "musickit-sdk";
        script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Apple MusicKit SDK"));
        document.head.appendChild(script);
      });
    }

    // 3. Configure MusicKit instance
    if (window.MusicKit) {
      await window.MusicKit.configure({
        developerToken,
        app: {
          name: "Sophomores Setlist",
          build: "2026.1"
        }
      });
      isScriptLoadedRef.current = true;
      return true;
    }

    return false;
  }, []);

  // Authorize Curator Apple ID
  const authorizeCurator = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      await initializeMusicKit();
      const music = window.MusicKit?.getInstance();
      if (!music) {
        throw new Error("MusicKit instance not available.");
      }

      // Apple displays native Apple ID sign-in modal
      const musicUserToken = await music.authorize();

      if (!musicUserToken) {
        throw new Error("Apple ID sign in did not return a user token.");
      }

      // Send token to server
      const saveRes = await fetch(`/api/setlists/${encodeURIComponent(slug)}/apple-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicUserToken })
      });

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || "Failed to save user token to setlist.");
      }

      setIsConfigured(true);
      setStatusMessage("Curator Apple ID authorized. Automatic playlist sync active.");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Curator authorization cancelled.";
      setStatusMessage(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [initializeMusicKit, slug]);

  // Sync pending nominations to Apple Music playlist
  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/setlists/${encodeURIComponent(slug)}/sync`, {
        method: "POST"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sync failed.");
      }

      const count = data.syncedCount || 0;
      const msg =
        count > 0
          ? `Synced ${count} track${count === 1 ? "" : "s"} to Apple Music.`
          : "Playlist is up to date. No pending tracks to sync.";

      setStatusMessage(msg);
      return { success: true, syncedCount: count, message: msg };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed.";
      setStatusMessage(msg);
      return { success: false, syncedCount: 0, message: msg };
    } finally {
      setIsSyncing(false);
    }
  }, [slug]);

  return {
    isConfigured,
    isLoading,
    isSyncing,
    statusMessage,
    authorizeCurator,
    syncNow
  };
}
