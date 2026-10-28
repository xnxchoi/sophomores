"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { MotionValue } from "motion/react";
import { Color, MathUtils, ShaderMaterial, Vector2, Vector3 } from "three";
import { resolveFlameConfig } from "@/components/gl/flame-backdrop/config";
import { createFragmentShader } from "@/components/gl/flame-backdrop/shaders";
import { backdropTokens } from "@/lib/teaser/backdrop-tokens";
import { getWarpFrame } from "./sequence";
import { CORONA_RESTORE_END, coronaRestoreBlend, DEFAULT_WARP_TUNING, WORMHOLE_HOLE_START, type WarpTuning } from "./_shared/tuning";
import {
  warpVertexShader as vertexShader,
  warpFragmentShader as fragmentShader
} from "./warp-shaders";

// The supplied visual loop runs on the existing R3F scheduler, not a second RAF.
// Constants adapt it to the cooler, quieter Sophomores ring without changing its flow.
const beamStyle = {
  heartbeat: 0.025,
  heartRate: 64
};

type Props = {
  progress: MotionValue<number>;
  opening: MotionValue<number>;
  settlement: MotionValue<number>;
  coronaProgress?: MotionValue<number>;
  active: boolean;
  onReady: () => void;
  tuning?: WarpTuning;
};

function useBeamPointer() {
  const canvas = useThree((state) => state.gl.domElement);
  const hoverTarget = useRef({
    x: 0,
    y: 0,
    active: false,
    startedAt: 0,
    contactId: null as number | null
  });
  useEffect(() => {
    const resetHover = () => {
      hoverTarget.current = {
        ...hoverTarget.current,
        active: false,
        contactId: null
      };
    };
    const onPointer = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      if (
        event.target instanceof Element &&
        event.target.closest("[data-warp-controls]")
      ) {
        resetHover();
        return;
      }
      if (event.pointerType === "touch") {
        if (event.type === "pointerdown")
          hoverTarget.current = {
            ...hoverTarget.current,
            contactId: event.pointerId
          };
        else if (hoverTarget.current.contactId !== event.pointerId) return;
      }
      const rect = canvas.getBoundingClientRect();
      const side = Math.min(rect.width, rect.height);
      if (
        side <= 0 ||
        event.clientX < rect.left ||
        event.clientX >= rect.right ||
        event.clientY < rect.top ||
        event.clientY >= rect.bottom
      ) {
        resetHover();
        return;
      }
      hoverTarget.current = {
        x: (event.clientX - rect.left - rect.width / 2) / side,
        y: (rect.top + rect.height / 2 - event.clientY) / side,
        active: true,
        startedAt: hoverTarget.current.active
          ? hoverTarget.current.startedAt
          : performance.now(),
        contactId: hoverTarget.current.contactId
      };
    };
    const onRelease = (event: PointerEvent) => {
      if (
        hoverTarget.current.contactId === null ||
        hoverTarget.current.contactId === event.pointerId
      )
        resetHover();
    };
    const onOutside = (event: PointerEvent) => {
      if (event.relatedTarget === null) resetHover();
    };
    document.addEventListener("pointerdown", onPointer, { passive: true });
    document.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerup", onRelease, { passive: true });
    document.addEventListener("pointercancel", onRelease, { passive: true });
    document.addEventListener("pointerout", onOutside, { passive: true });
    window.addEventListener("blur", resetHover);
    document.addEventListener("visibilitychange", resetHover);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerup", onRelease);
      document.removeEventListener("pointercancel", onRelease);
      document.removeEventListener("pointerout", onOutside);
      window.removeEventListener("blur", resetHover);
      document.removeEventListener("visibilitychange", resetHover);
    };
  }, [canvas]);
  return hoverTarget;
}

function Filaments({
  progress,
  opening,
  settlement,
  onReady,
  tuning = DEFAULT_WARP_TUNING
}: Omit<Props, "active" | "coronaProgress">) {
  const material = useRef<ShaderMaterial>(null);
  const elapsed = useRef(2.4);
  const renderedFrames = useRef(0);
  const hoverTarget = useBeamPointer();
  const uniforms = useMemo(
    () => ({
      uViewport: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uRays: { value: 0 },
      uPoint: { value: 0 },
      uRadius: { value: 0.006 },
      uOpening: { value: 0 },
      uDensity: { value: DEFAULT_WARP_TUNING.rayDensity },
      uIntensity: { value: DEFAULT_WARP_TUNING.rayIntensity },
      uRingScale: { value: 1 },
      uRayWidth: { value: 1 },
      uPointScale: { value: 1 },
      uPointBrightness: { value: 1 },
      uPointSoftness: { value: 1 },
      uBloomStrength: { value: 1 },
      uBloomSpread: { value: 1 },
      uShowPoint: { value: 1 },
      uShowBloom: { value: 1 },
      uColor: { value: new Vector3(0.16, 0.31, 0.54) },
      uHoverPointer: { value: new Vector2(0, 0) },
      uHover: { value: 0 },
      uHeartbeat: { value: 1 }
    }),
    []
  );

  useFrame(({ size }, delta) => {
    if (!material.current) return;
    if (++renderedFrames.current === 2) onReady();
    // Three's documented imperative uniform API; never React/application state.
    elapsed.current += Math.min(delta, 0.05) * tuning.motionSpeed;
    const frame = getWarpFrame(progress.get());
    const current = material.current.uniforms;
    current.uViewport.value.set(size.width, size.height);
    current.uTime.value = elapsed.current;
    current.uTravel.value = frame.travel;
    current.uRays.value =
      MathUtils.lerp(1, 0.45, MathUtils.smoothstep(progress.get(), 0, 0.74)) *
      (1 - MathUtils.smoothstep(settlement.get(), 0, 1)) * Number(tuning.showRays);
    current.uPoint.value = frame.pointOpacity;
    current.uRadius.value = frame.ringScale * 0.35;
    current.uOpening.value = opening.get();
    current.uDensity.value = tuning.rayDensity;
    current.uIntensity.value = tuning.rayIntensity;
    // Rays meet the currently forming rim, not the future full-ring silhouette.
    const restoredScale = MathUtils.lerp(
      tuning.ringScale, 1,
      coronaRestoreBlend(settlement.get())
    );
    const morph = MathUtils.smoothstep(settlement.get(), 0, CORONA_RESTORE_END);
    const coreRadius = Math.max(
      .35 * .85 * tuning.pointScale / restoredScale,
      1 / (Math.min(size.width, size.height) * frame.ringScale * restoredScale)
    );
    // Project the same soft edge as the material; no future-sized black gap.
    // Keep the Filaments aperture in lockstep with the shader: width settles
    // behind radial travel, so the bright core does not suddenly hollow out.
    // The void waits. Until then the aperture is only the filled core, so the
    // rays never outline a dark disc.
    const hole = MathUtils.smoothstep(morph, WORMHOLE_HOLE_START, 1);
    const edgeWidth = MathUtils.lerp(coreRadius, .018, Math.pow(hole, 1.35))
      * (1 + tuning.edgeBlur * Math.sin(Math.PI * hole));
    current.uRingScale.value = restoredScale * (hole + edgeWidth / .35 * (1 - hole));
    current.uPoint.value *= 1 - hole;
    current.uRayWidth.value = tuning.rayWidth;
    current.uPointScale.value = tuning.pointScale;
    current.uPointBrightness.value = tuning.pointBrightness;
    current.uPointSoftness.value = tuning.pointSoftness;
    current.uBloomStrength.value = tuning.bloomStrength;
    current.uBloomSpread.value = tuning.bloomSpread;
    current.uShowPoint.value = Number(tuning.showPoint);
    current.uShowBloom.value = Number(tuning.showBloom);
    const target = hoverTarget.current;
    const hoverSeconds = Math.max(
      0,
      (performance.now() - target.startedAt) / 1000 - 0.06
    );
    const strength = target.active && hoverSeconds > 0 ? tuning.hoverStrength : 0;
    const step = Math.min(delta, 0.1);
    // Native Three damping preserves reference attack/release/follow timing.
    current.uHover.value = MathUtils.damp(
      current.uHover.value,
      strength,
      1 / (strength > current.uHover.value ? 0.26 : 0.32),
      step
    );
    const pointer = current.uHoverPointer.value as Vector2;
    if (current.uHover.value < 0.001) pointer.set(target.x, target.y);
    else
      pointer.set(
        MathUtils.damp(pointer.x, target.x, 5, step),
        MathUtils.damp(pointer.y, target.y, 5, step)
      );
    const phase = ((hoverSeconds * beamStyle.heartRate) / 60) % 1;
    const beat =
      Math.exp(-Math.pow((phase - 0.16) / 0.05, 2)) +
      0.4 * Math.exp(-Math.pow((phase - 0.31) / 0.065, 2));
    current.uHeartbeat.value = 1 + beamStyle.heartbeat * beat;
  });

  return (
    <mesh frustumCulled={false} renderOrder={1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// The production ring's exact material, not a copied approximation. Full-size
// framebuffer + coordinate scaling retains detail even at the distant hotspot.
function Ring({
  progress,
  coronaProgress,
  settlement,
  tuning = DEFAULT_WARP_TUNING
}: Pick<Props, "progress" | "coronaProgress" | "settlement" | "tuning">) {
  const material = useRef<ShaderMaterial>(null);
  const elapsed = useRef(0);
  const motionSpeed = useRef(0);
  // Deform the production field itself from a filled core into its original ring.
  // Both the neutral carrier and emerging texture sample the SAME coordinates.
  const fragment = useMemo(
    () => {
      const config = resolveFlameConfig({
        pointer: { enabled: false },
        visual: { backgroundColor: "#000000" }
      });
      return `
#define main warpRingMain
${createFragmentShader(config)}
#undef main
uniform float uSettlement;
uniform float uFormation;
uniform float uCoreRadius;
uniform float uCoreSoftness;
uniform float uCoreTransfer;
uniform float uCoreBrightness;
uniform float uInteriorBrightness;
uniform vec3 uInteriorColor;
uniform float uInteriorBloom;
uniform float uInteriorBlur;
uniform float uEdgeBlur;
uniform float uRingBrightness;
uniform float uRingSaturation;
void main() {
  // Before the core transfers, this pass is exactly opaque black. Keep that
  // output without evaluating an invisible five-layer material at every pixel.
  if (uFormation < ${CORONA_RESTORE_END} && uCoreTransfer == 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float brightness = uRingBrightness;
  if (uFormation >= ${CORONA_RESTORE_END}) {
    warpRingMain();
  } else {
    vec2 point = (vUv - .5) * uScale - uOrigin;
    float radius = length(point);
    float theta = radius > .000001 ? atan(point.y, point.x) : 0.0;
    float morph = smoothstep(0.0, ${CORONA_RESTORE_END}, uFormation);
    // Growth uses morph. The void is separate: the center stays on the ridge
    // until the field is ready to become the corona.
    float hole = smoothstep(${WORMHOLE_HOLE_START}, 1.0, morph);
    float rim = .35 * hole;
    // Width settles behind the void, not behind the earlier growth, so the
    // body does not hollow into a ring ahead of the opening.
    float width = mix(max(uCoreRadius, uCssPixel), .018, pow(hole, 1.35))
      * (1.0 + uEdgeBlur * sin(3.14159265359 * hole));
    float exponent = mix(2.0 / uCoreSoftness, 1.0, hole);
    // At hole=1 this is the identity outside the rim. Inside, brightness falls
    // inward. sign() used to fold the center back onto the ridge and leave a cusp.
    float outward = max(radius - rim, 0.0);
    float inward = clamp((rim - radius) / max(width, uCssPixel), 0.0, 1.0);
    float deformedRadius = radius >= rim
      ? .35 + .018 * pow(outward / max(width, uCssPixel), exponent)
      : mix(.35, 0.0, inward);
    float phase = uTime * 6.283185307179586 / ${config.motion.loopSeconds.toFixed(8)};
    float detail = smoothstep(.05, .7, morph);
    vec3 carrier = profile(vec3(deformedRadius - .35), .018, .018);
    // Interpolate surface character, not silhouettes: crisp white becomes the
    // existing asymmetric material only after a cavity has started to form.
    vec3 resolved = carrier;
    if (detail > 0.0) {
      vec3 surface = shade(deformedRadius, theta, phase, 0.0);
      vec3 textured = vec3(toSrgb(surface.r), toSrgb(surface.g), toSrgb(surface.b));
      resolved = mix(carrier, textured, detail);
    }
    gl_FragColor = vec4(resolved * uCoreTransfer, 1.0);
    brightness = mix(uCoreBrightness, uRingBrightness, morph);
  }
  // Neutral controls deliberately bypass color arithmetic, preserving the original.
  if (uRingSaturation != 1.0) {
    float tunedLuma = dot(gl_FragColor.rgb, vec3(.2126, .7152, .0722));
    gl_FragColor.rgb = max(vec3(0.0), mix(vec3(tunedLuma), gl_FragColor.rgb, uRingSaturation));
  }
  if (brightness != 1.0) gl_FragColor.rgb *= brightness;
  if (uSettlement >= 1.0) return;
  // Display-space luma: preserve its weighted sum, not physical luminance.
  float luma = dot(gl_FragColor.rgb, vec3(.2126, .7152, .0722));
  float radius = length((vUv - .5) * uScale - uOrigin);
  float front = mix(.22, .82, smoothstep(.12, 1.0, uSettlement));
  float saturation = smoothstep(.12, .24, uSettlement) * (1.0 - smoothstep(front - .08, front + .08, radius));
  gl_FragColor.rgb = mix(vec3(luma), gl_FragColor.rgb, saturation);
  // Interior radiance has its own envelope, independent of the opening cavity.
  // It hands off gradually across the whole settlement, not when the rim moves.
  float interiorEnvelope = smoothstep(.01, .18, uFormation)
    * (1.0 - smoothstep(.45, 1.0, uFormation));
  float opening = smoothstep(0.0, ${CORONA_RESTORE_END}, uFormation);
  float interiorRadius = max(uCoreRadius * (1.0 - opening), .35 * opening);
  float softness = clamp(uInteriorBlur / 3.0, 0.0, 1.0);
  // Reach the rim even at minimum blur: no separate orb inside a dark moat.
  float reach = max(interiorRadius * mix(1.05, 1.6, softness), uCssPixel);
  float fill = exp(-pow(radius / reach, mix(6.0, 2.0, softness)));
  float bloom = exp(-pow(radius / (reach * 1.65), 2.0)) * .25;
  float radiance = (fill * uInteriorBrightness + bloom * uInteriorBloom)
    * interiorEnvelope * uCoreTransfer;
  // Add transmitted light into available headroom, retaining the material
  // variation underneath. A max() floor erased every darker surface detail.
  vec3 interiorLight = clamp(uInteriorColor * radiance, vec3(0.0), vec3(.9));
  gl_FragColor.rgb += interiorLight
    * (vec3(1.0) - clamp(gl_FragColor.rgb, 0.0, 1.0));
}`;
    },
    []
  );
  const uniforms = useMemo(
    () => ({
      uScale: { value: new Vector2(.1, .1) },
      uOrigin: { value: new Vector2(0, 0) },
      uTime: { value: 0 },
      uPointer: { value: new Vector2(0, 0) },
      uPointerStrength: { value: 0 },
      uChromatic: { value: 1 },
      uCssPixel: { value: 0.001 },
      uPaletteWeights: { value: new Vector3(0, 1, 0) },
      uSettlement: { value: 0 },
      uFormation: { value: 0 },
      uCoreRadius: { value: .2975 },
      uCoreSoftness: { value: 1 },
      uCoreTransfer: { value: 0 },
      uCoreBrightness: { value: 0 },
      uInteriorBrightness: { value: 0 },
      uInteriorColor: { value: new Color(DEFAULT_WARP_TUNING.interiorColor) },
      uInteriorBloom: { value: 0 },
      uInteriorBlur: { value: 1 },
      uEdgeBlur: { value: 1 },
      uRingBrightness: { value: 0.31 },
      uRingSaturation: { value: 1 }
    }),
    []
  );
  useFrame(({ size }, delta) => {
    if (!material.current) return;
    const step = Math.min(delta, 0.05);
    const frame = getWarpFrame(progress.get());
    // Keep prelude tuning through the jump; settle into the untouched production
    // material/geometry before Hero starts. The shared Motion curve responds
    // immediately instead of holding at the start, and remains reversible.
    const coronaBlend = coronaRestoreBlend(settlement.get());
    const ringScale = MathUtils.lerp(tuning.ringScale, 1, coronaBlend);
    const diameter = 0.7 * Math.min(size.width, size.height) * frame.ringScale * ringScale;
    const colorThreshold = Math.min(
      0.6 * size.width,
      0.7 * Math.min(size.width, size.height) * backdropTokens.heroScale
    );
    const colorSettlement =
      diameter >= colorThreshold
        ? MathUtils.smoothstep(settlement.get(), CORONA_RESTORE_END, 1)
        : 0;
    // Reverse freezes immediately; release ramps speed without resetting phase.
    motionSpeed.current =
      colorSettlement >= 1
        ? MathUtils.damp(motionSpeed.current, 1, 3, step)
        : 0;
    elapsed.current += step * motionSpeed.current * MathUtils.lerp(tuning.motionSpeed, 1, coronaBlend);
    const corona = coronaProgress?.get() ?? 0;
    const side =
      Math.min(size.width, size.height) *
      frame.ringScale * ringScale *
      (1 + corona * backdropTokens.scrollZoom);
    const current = material.current.uniforms;
    current.uScale.value.set(size.width / side, size.height / side);
    // Match Scene's downward CSS travel in the shader's upward-positive space.
    current.uOrigin.value.set(
      0,
      (-size.height * ((corona * backdropTokens.scrollY) / 100)) / side
    );
    current.uCssPixel.value = 1 / side;
    current.uTime.value = elapsed.current;
    current.uSettlement.value = colorSettlement;
    current.uFormation.value = MathUtils.clamp(settlement.get(), 0, 1);
    // Match the original filament hotspot in world space as canvas scaling
    // changes. Its disappearing core transfers into this coincident filled core.
    current.uCoreRadius.value = .35 * .85 * tuning.pointScale / ringScale;
    current.uCoreSoftness.value = tuning.pointSoftness;
    current.uCoreTransfer.value = 1 - frame.pointOpacity;
    current.uCoreBrightness.value = tuning.showRing ? tuning.pointBrightness : 0;
    current.uInteriorBrightness.value = tuning.showRing ? tuning.interiorBrightness : 0;
    current.uInteriorColor.value.set(tuning.interiorColor).convertLinearToSRGB();
    current.uInteriorBloom.value = tuning.showRing && tuning.showBloom ? tuning.interiorBloom : 0;
    current.uInteriorBlur.value = tuning.interiorBlur;
    current.uEdgeBlur.value = tuning.edgeBlur;
    current.uRingBrightness.value = tuning.showRing
      ? MathUtils.lerp(tuning.ringBrightness, 1, coronaBlend)
      : 0;
    current.uRingSaturation.value = MathUtils.lerp(tuning.ringSaturation, 1, coronaBlend);
  });
  return (
    <mesh frustumCulled={false} renderOrder={0}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragment}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function FieldMessage() {
  return (
    <p
      role="status"
      className="absolute inset-x-6 bottom-28 text-center text-xs text-white/60"
    >
      The light study needs WebGL. Text and the next section remain available.
    </p>
  );
}

function FieldFallback({ onReady }: Pick<Props, "onReady">) {
  useEffect(onReady, [onReady]);
  return <FieldMessage />;
}

class FieldBoundary extends Component<
  { children: ReactNode; onReady: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("[Warp] Field renderer failed.", error);
  }
  render() {
    return this.state.failed ? (
      <FieldFallback onReady={this.props.onReady} />
    ) : (
      this.props.children
    );
  }
}

export default function WarpField({
  progress,
  opening,
  coronaProgress,
  settlement,
  active,
  onReady,
  tuning = DEFAULT_WARP_TUNING
}: Props) {
  return (
    <FieldBoundary onReady={onReady}>
      <Canvas
        className={"pointer-events-none relative h-full w-full overflow-hidden"}
        dpr={[1, 1.5]}
        frameloop={active ? "always" : "demand"}
        gl={{ alpha: true, antialias: false }}
        // Native canvas fallback children mount even when WebGL is supported.
        // Only actual rendered frames (or the error boundary) may mark ready.
        fallback={<FieldMessage />}
      >
        <Ring
          progress={progress}
          coronaProgress={coronaProgress}
          settlement={settlement}
          tuning={tuning}
        />
        <Filaments
          progress={progress}
          opening={opening}
          settlement={settlement}
          onReady={onReady}
          tuning={tuning}
        />
      </Canvas>
    </FieldBoundary>
  );
}
