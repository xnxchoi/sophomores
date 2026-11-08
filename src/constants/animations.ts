import type { SpringConfig } from "@react-spring/three";
import { MotionValue } from "motion/react";
    
const easeInOutFromOut = (easeOut: (p: number) => number) => (p: number) =>
  p < 0.5 ? (1 - easeOut(1 - p * 2)) / 2 : 0.5 + easeOut((p - 0.5) * 2) / 2;
const ee = Object.freeze({
  power1: {
    in: [0.55, 0.085, 0.68, 0.53],
    out: [0.25, 0.46, 0.45, 0.94],
    inOut: [0.445, 0.05, 0.55, 0.95]
  } as EASEE,
  power2: {
    in: [0.55, 0.055, 0.675, 0.19],
    out: [0.25, 0.46, 0.45, 0.94],
    inOut: [0.455, 0.03, 0.515, 0.955]
  } as EASEE,
  power3: {
    in: [0.895, 0.03, 0.685, 0.22],
    out: [0.165, 0.84, 0.44, 1],
    inOut: [0.77, 0, 0.175, 1]
  } as EASEE,
  power4: {
    in: [0.895, 0.03, 0.685, 0.22],
    out: [0.165, 0.84, 0.44, 1],
    inOut: [0.76, 0, 0.24, 1]
  } as EASEE,
  sine: {
    in: [0.12, 0, 0.39, 0],
    out: [0.61, 1, 0.88, 1],
    inOut: [0.37, 0, 0.63, 1]
  } as EASEE,
  circ: {
    in: [0.55, 0, 1, 0.45],
    out: [0, 0.55, 0.45, 1],
    inOut: [0.85, 0, 0.15, 1]
  } as EASEE,
  expo: {
    in: [0.7, 0, 0.84, 0],
    out: [0.16, 1, 0.3, 1],
    inOut: [0.87, 0, 0.13, 1]
  } as EASEE,
  back: {
    out:
      (overshoot = 1.7058) =>
      (p: number) =>
        p ? --p * p * ((overshoot + 1) * p + overshoot) + 1 : 0,
    in:
      (overshoot = 1.7058) =>
      (p: number) =>
        1 - (p ? --p * p * ((overshoot + 1) * p + overshoot) + 1 : 0),
    inOut: (overshoot = 1.7058) =>
      easeInOutFromOut((p: number) =>
        p ? --p * p * ((overshoot + 1) * p + overshoot) + 1 : 0
      )
    // [0.36, 0, 0.66, -0.56],
    // out: [0.34, 1.56, 0.64, 1],
    // inOut: [0.68, -0.6, 0.32, 1.6]
  },
  elastic: {
    in: (t: number) =>
      t === 0
        ? 0
        : t === 1
          ? 1
          : -Math.pow(2, 10 * t - 10) *
            Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
    out: (t: number) =>
      t === 0
        ? 0
        : t === 1
          ? 1
          : Math.pow(2, -10 * t) *
              Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) +
            1,
    inOut: (t: number) => {
      const c5 = (2 * Math.PI) / 4.5;
      return t === 0
        ? 0
        : t === 1
          ? 1
          : t < 0.5
            ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
            : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) /
                2 +
              1;
    }
  } as EASEE
});
type AREASE = [number, number, number, number];
type FNEASE = (t: number) => number;
export type EASEE = Record<"in" | "out" | "inOut", AREASE | FNEASE>;
type EasCfgMp<
  T extends
    | [number, number, number, number]
    | ((t: number) => number)
    | unknown = [number, number, number, number] | ((t: number) => number)
> = Record<"in" | "out" | "inOut", T>;
type ALL_EASE = keyof typeof ee;
type POWER_EASE<t extends 1 | 2 | 3 | 4 = 1 | 2 | 3 | 4> = `power${t}`;
type REST_EASE = Exclude<ALL_EASE, POWER_EASE>;
type EASE_NAMES =
  | REST_EASE
  | POWER_EASE
  | `back${"overshoot" | "inOut" | "in" | "out"}${number | ""}`;
type BackEasee = {
  back: EasCfgMp<(overshoot?: number) => (p: number) => number>;
};
export type EASE_VARIANT = Readonly<Record<Exclude<REST_EASE, "back">, EASEE>> &
  Readonly<Record<POWER_EASE, Record<"in" | "out" | "inOut", AREASE>>> &
  BackEasee;
export const EASING = ee as EASE_VARIANT;

type SpringCfg = {
  stiffness: number;
  damping: number;
  mass?: number;
  velocity?: number;
  restDelta?: number;
  restSpeed?: number;
};
type SpringEasee = EasCfgMp<SpringCfg>;
type PowerEase = `power${1 | 2 | 3 | 4}`;
export const SPRING_EASE: Record<
  PowerEase | "sine" | "circ" | "expo" | "elastic",
  SpringEasee
> & {
  back: (overshoot?: number) => SpringEasee;
} = {
  power1: {
    in: {
      stiffness: 100,
      damping: 24,
      mass: 1,
      velocity: 0,
      restDelta: 0.001,
      restSpeed: 0.01
    },
    out: {
      stiffness: 150,
      damping: 28,
      mass: 1,
      velocity: 2,
      restDelta: 0.001,
      restSpeed: 0.01
    },
    inOut: {
      stiffness: 130,
      damping: 26,
      mass: 1,
      velocity: 0,
      restDelta: 0.001,
      restSpeed: 0.01
    }
  },
  power2: {
    in: {
      stiffness: 180,
      damping: 32,
      mass: 1,
      velocity: 0,
      restDelta: 0.001,
      restSpeed: 0.01
    },
    out: {
      stiffness: 230,
      damping: 36,
      mass: 1,
      velocity: 2,
      restDelta: 0.001,
      restSpeed: 0.01
    },
    inOut: {
      stiffness: 210,
      damping: 34,
      mass: 1,
      velocity: 0,
      restDelta: 0.001,
      restSpeed: 0.01
    }
  },
  power3: {
    in: {
      stiffness: 260,
      damping: 38,
      mass: 1,
      velocity: 0,
      restDelta: 0.001,
      restSpeed: 0.01
    },
    out: {
      stiffness: 320,
      damping: 42,
      mass: 1,
      velocity: 2,
      restDelta: 0.001,
      restSpeed: 0.01
    },
    inOut: {
      stiffness: 300,
      damping: 40,
      mass: 1,
      velocity: 0,
      restDelta: 0.001,
      restSpeed: 0.01
    }
  },
  power4: {
    in: {
      stiffness: 360,
      damping: 46,
      mass: 1,
      velocity: 0,
      restDelta: 0.001,
      restSpeed: 0.01
    },
    out: {
      stiffness: 440,
      damping: 50,
      mass: 1,
      velocity: 2,
      restDelta: 0.001,
      restSpeed: 0.01
    },
    inOut: {
      stiffness: 400,
      damping: 48,
      mass: 1,
      velocity: 0,
      restDelta: 0.001,
      restSpeed: 0.01
    }
  }, // NEW: Sine (Gentle, relaxed, lower tension than power1)
  sine: {
    in: { stiffness: 80, damping: 22, mass: 1, velocity: 0 },
    out: { stiffness: 120, damping: 24, mass: 1, velocity: 1 },
    inOut: { stiffness: 100, damping: 23, mass: 1, velocity: 0 }
  },

  // NEW: Circ (Swift start, but heavily damped/rounded off at the end)
  circ: {
    in: { stiffness: 200, damping: 45, mass: 1, velocity: 0 }, // Very sluggish start due to high damping
    out: { stiffness: 350, damping: 45, mass: 1, velocity: 3 }, // High initial burst, aggressive rounding
    inOut: { stiffness: 280, damping: 45, mass: 1, velocity: 0 }
  },

  // NEW: Expo (Extremely sharp initial acceleration, extremely long tail)
  expo: {
    in: { stiffness: 400, damping: 70, mass: 1, velocity: 0 }, // Heavy friction creates a long anticipation
    out: { stiffness: 550, damping: 65, mass: 1, velocity: 4 }, // Massive initial burst, long settlement
    inOut: { stiffness: 480, damping: 68, mass: 1, velocity: 0 }
  },
  back: (overshoot: number = 1.7) => {
    // Helper to calculate under-damping based on the requested overshoot
    const getDamping = (stiffness: number, os: number) => {
      const criticalDamping = 2 * Math.sqrt(stiffness); // Assuming mass is 1
      // We scale the damping down as the overshoot multiplier goes up.
      // Math.max prevents the damping from hitting 0 (which would bounce forever)
      return Math.max(criticalDamping - os * 8, 2);
    };

    return {
      in: {
        stiffness: 200,
        damping: getDamping(200, overshoot),
        mass: 1,
        // We scale the initial negative velocity pull by the overshoot amount
        velocity: -5 * (overshoot / 1.7)
      },
      out: {
        stiffness: 250,
        damping: getDamping(250, overshoot),
        mass: 1,
        velocity: 0
      },
      inOut: {
        stiffness: 225,
        damping: getDamping(225, overshoot),
        mass: 1,
        velocity: -2 * (overshoot / 1.7)
      }
    };
  }, // NEW: Elastic (Wobbly, highly under-damped)
  elastic: {
    in: { stiffness: 300, damping: 25, mass: 1, velocity: -10 },
    out: { stiffness: 400, damping: 10, mass: 1, velocity: 0 }, // Very low damping creates high-frequency oscillation
    inOut: { stiffness: 350, damping: 15, mass: 1, velocity: -5 }
  }
};
export const TWEEN_EASE = Object.freeze({
  power1: {
    in: [0.55, 0.085, 0.68, 0.53],
    out: [0.25, 0.46, 0.45, 0.94],
    inOut: [0.445, 0.05, 0.55, 0.95]
  },
  power2: {
    in: [0.55, 0.055, 0.675, 0.19],
    out: [0.25, 0.46, 0.45, 0.94],
    inOut: [0.455, 0.03, 0.515, 0.955]
  },
  power3: {
    in: [0.895, 0.03, 0.685, 0.22],
    out: [0.165, 0.84, 0.44, 1],
    inOut: [0.77, 0, 0.175, 1]
  },
  power4: {
    in: [0.895, 0.03, 0.685, 0.22],
    out: [0.165, 0.84, 0.44, 1],
    inOut: [0.76, 0, 0.24, 1]
  },
  sine: {
    in: [0.12, 0, 0.39, 0],
    out: [0.61, 1, 0.88, 1],
    inOut: [0.37, 0, 0.63, 1]
  },
  circ: {
    in: [0.55, 0, 1, 0.45],
    out: [0, 0.55, 0.45, 1],
    inOut: [0.85, 0, 0.15, 1]
  },
  expo: {
    in: [0.7, 0, 0.84, 0],
    out: [0.16, 1, 0.3, 1],
    inOut: [0.87, 0, 0.13, 1]
  },
  back: {
    out:
      (overshoot = 1.7058) =>
      (p: number) =>
        p ? --p * p * ((overshoot + 1) * p + overshoot) + 1 : 0,
    in:
      (overshoot = 1.7058) =>
      (p: number) =>
        1 - (p ? --p * p * ((overshoot + 1) * p + overshoot) + 1 : 0),
    inOut: (overshoot = 1.7058) =>
      easeInOutFromOut((p: number) =>
        p ? --p * p * ((overshoot + 1) * p + overshoot) + 1 : 0
      )
  },
  elastic: {
    in: (t: number) =>
      t === 0
        ? 0
        : t === 1
          ? 1
          : -Math.pow(2, 10 * t - 10) *
            Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
    out: (t: number) =>
      t === 0
        ? 0
        : t === 1
          ? 1
          : Math.pow(2, -10 * t) *
              Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) +
            1,
    inOut: (t: number) => {
      const c5 = (2 * Math.PI) / 4.5;
      return t === 0
        ? 0
        : t === 1
          ? 1
          : t < 0.5
            ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
            : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) /
                2 +
              1;
    }
  }
}) as EASE_VARIANT;
export const TE = TWEEN_EASE;
// Helper: if animating toward a lower target, flip velocity sign on the "out" presets
export function orientSpring(
  cfg: SpringCfg,
  from: number,
  to: number
): SpringCfg {
  if (cfg.velocity && to < from)
    return { ...cfg, velocity: -Math.abs(cfg.velocity) };
  return cfg;
}
export function getOrientedSpring(
  cfg: SpringCfg,
  currentOrMotionValue: number | MotionValue<number>,
  target: number
): SpringCfg {
  // Extract the current numerical value safely
  const current =
    typeof currentOrMotionValue === "number"
      ? currentOrMotionValue
      : currentOrMotionValue.get();

  // If the config has a velocity injected, ensure the sign matches the trajectory
  if (cfg.velocity && target < current) {
    return { ...cfg, velocity: -Math.abs(cfg.velocity) };
  } else if (cfg.velocity && target > current) {
    return { ...cfg, velocity: Math.abs(cfg.velocity) };
  }

  return cfg;
}
/**
 * GSAP-style ease presets for @react-spring/three (R3F).
 *
 * VELOCITY-FREE VARIANT — fully declarative.
 *
 * react-spring's `config.velocity` only applies on the first animation from
 * rest, so it doesn't re-trigger on every state toggle in declarative usage.
 * This variant drops `velocity` entirely and compensates by bumping tension
 * (~15–25%) and trimming friction on `out` variants to recover the "punchy"
 * feel. Less physically faithful to GSAP, but works with plain useSpring({...})
 * with no imperative api.
 *
 * Usage in R3F:
 *   import { useSpring, a } from '@react-spring/three';
 *   const { scale } = useSpring({
 *     scale: hovered ? 1.5 : 1,
 *     config: SPRING_EASE.power2.out,
 *   });
 *   return <a.mesh scale={scale} />;
 */

type EaseMap<T> = {
  in: T;
  out: T;
  inOut: T;
};

type RSpringEase = EaseMap<SpringConfig>;

export const RSPRING_EASE: Record<
  PowerEase | "sine" | "circ" | "expo" | "elastic",
  RSpringEase
> & {
  back: (overshoot?: number) => RSpringEase;
} = {
  power1: {
    in: { tension: 100, friction: 24, mass: 1, precision: 0.001 },
    out: { tension: 180, friction: 26, mass: 1, precision: 0.001 },
    inOut: { tension: 130, friction: 26, mass: 1, precision: 0.001 }
  },
  power2: {
    in: { tension: 180, friction: 32, mass: 1, precision: 0.001 },
    out: { tension: 280, friction: 33, mass: 1, precision: 0.001 },
    inOut: { tension: 210, friction: 34, mass: 1, precision: 0.001 }
  },
  power3: {
    in: { tension: 260, friction: 38, mass: 1, precision: 0.001 },
    out: { tension: 390, friction: 39, mass: 1, precision: 0.001 },
    inOut: { tension: 300, friction: 40, mass: 1, precision: 0.001 }
  },
  power4: {
    in: { tension: 360, friction: 46, mass: 1, precision: 0.001 },
    out: { tension: 540, friction: 46, mass: 1, precision: 0.001 },
    inOut: { tension: 400, friction: 48, mass: 1, precision: 0.001 }
  },

  // Sine — gentle, relaxed
  sine: {
    in: { tension: 80, friction: 22, mass: 1 },
    out: { tension: 145, friction: 22, mass: 1 },
    inOut: { tension: 100, friction: 23, mass: 1 }
  },

  // Circ — swift start, heavily rounded off at the end
  circ: {
    in: { tension: 200, friction: 45, mass: 1 },
    out: { tension: 430, friction: 42, mass: 1 },
    inOut: { tension: 280, friction: 45, mass: 1 }
  },

  // Expo — sharp acceleration, long tail
  expo: {
    in: { tension: 400, friction: 70, mass: 1 },
    out: { tension: 680, friction: 60, mass: 1 },
    inOut: { tension: 480, friction: 68, mass: 1 }
  },

  back: (overshoot: number = 1.7): RSpringEase => {
    // Under-damp relative to critical (2 * sqrt(tension)) to produce overshoot.
    const getFriction = (tension: number, os: number) => {
      const critical = 2 * Math.sqrt(tension);
      return Math.max(critical - os * 8, 2);
    };

    return {
      // `in` variants normally used negative initial velocity to "wind up"
      // before launching. Without velocity, we bump tension a bit so the
      // overshoot on settle still reads as a "back" feel.
      in: {
        tension: 240,
        friction: getFriction(240, overshoot),
        mass: 1
      },
      out: {
        tension: 250,
        friction: getFriction(250, overshoot),
        mass: 1
      },
      inOut: {
        tension: 245,
        friction: getFriction(245, overshoot),
        mass: 1
      }
    };
  },

  // Elastic — wobbly, highly under-damped
  elastic: {
    in: { tension: 340, friction: 22, mass: 1 },
    out: { tension: 400, friction: 10, mass: 1 },
    inOut: { tension: 350, friction: 15, mass: 1 }
  }
};
