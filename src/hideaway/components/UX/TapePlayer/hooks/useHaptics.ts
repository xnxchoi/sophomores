"use client";

import { useDeviceInfo } from "@/hideaway/providers/RP_Pro";
import { useIsMobile } from "@/hideaway/providers/MiddleMan";
import { useCallback, useRef } from "react";
import { useShallow } from "zustand/shallow";

type HapticStyle = "light" | "medium" | "heavy";

/**
 * iOS haptic workaround via AudioContext.
 * Creates a very short inaudible oscillation that triggers WebKit's
 * audio-haptic coupling to the Taptic Engine. Crude but universal
 * across all iOS browsers (all WebKit-based).
 */
function iOSHaptic(style: HapticStyle) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    // Frequency mapping — different frequencies produce different taptic feels
    const freqMap: Record<HapticStyle, number> = {
      light: 50,
      medium: 30,
      heavy: 20,
    };

    oscillator.frequency.value = freqMap[style];
    gain.gain.value = 0; // Inaudible
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.01);

    // Clean up after oscillation ends
    oscillator.onended = () => {
      gain.disconnect();
      oscillator.disconnect();
      ctx.close();
    };
  } catch {
    // Silently fail — haptics are non-critical
  }
}

/**
 * Android haptic via Vibration API.
 * Supports fine-grained duration and pattern control.
 */
function androidHaptic(pattern: number | number[]) {
  try {
    navigator?.vibrate?.(pattern);
  } catch {
    // Silently fail
  }
}

export function useHaptics() {
  const os = useDeviceInfo(useShallow((s) => s.os));
  const { isTouch } = useIsMobile();
  const isIOS = os.isIOS;
  const isAndroid = os.isAndroid;
  const enabled = isTouch && (isIOS || isAndroid);

  // Throttle rapid haptic calls (e.g. during dial rotation)
  const lastTick = useRef(0);
  const TICK_THROTTLE = 40; // ms

  const tick = useCallback(() => {
    if (!enabled) return;
    const now = performance.now();
    if (now - lastTick.current < TICK_THROTTLE) return;
    lastTick.current = now;

    if (isAndroid) {
      androidHaptic(8);
    } else if (isIOS) {
      iOSHaptic("light");
    }
  }, [enabled, isAndroid, isIOS]);

  const impact = useCallback(() => {
    if (!enabled) return;
    if (isAndroid) {
      androidHaptic(15);
    } else if (isIOS) {
      iOSHaptic("medium");
    }
  }, [enabled, isAndroid, isIOS]);

  const heavy = useCallback(() => {
    if (!enabled) return;
    if (isAndroid) {
      androidHaptic([20, 30, 20]);
    } else if (isIOS) {
      iOSHaptic("heavy");
    }
  }, [enabled, isAndroid, isIOS]);

  const selection = useCallback(() => {
    if (!enabled) return;
    if (isAndroid) {
      androidHaptic(4);
    } else if (isIOS) {
      iOSHaptic("light");
    }
  }, [enabled, isAndroid, isIOS]);

  return { tick, impact, heavy, selection, enabled };
}
