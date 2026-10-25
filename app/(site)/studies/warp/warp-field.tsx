"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { MotionValue } from "motion/react";
import { MathUtils, ShaderMaterial, Vector2, Vector3 } from "three";
import { resolveFlameConfig } from "@/flame-backdrop/config";
import { createFragmentShader } from "@/flame-backdrop/shaders";
import { backdropTokens } from "@/lib/teaser/backdrop-tokens";
import { getWarpFrame } from "./sequence";
import { warpVertexShader as vertexShader, warpFragmentShader as fragmentShader } from "./warp-shaders";

// The supplied visual loop runs on the existing R3F scheduler, not a second RAF.
// Constants adapt it to the cooler, quieter Sophomores ring without changing its flow.
const beamStyle = { density: .85, intensity: 1.35, hover: .24, heartbeat: .025, heartRate: 64 };

type Props = {
  progress: MotionValue<number>;
  opening: MotionValue<number>;
  settlement: MotionValue<number>;
  coronaProgress?: MotionValue<number>;
  active: boolean;
  onReady: () => void;
};

function useBeamPointer() {
  const canvas = useThree(state => state.gl.domElement);
  const hoverTarget = useRef({ x: 0, y: 0, active: false, startedAt: 0, contactId: null as number | null });
  useEffect(() => {
    const resetHover = () => { hoverTarget.current = { ...hoverTarget.current, active: false, contactId: null }; };
    const onPointer = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      if (event.target instanceof Element && event.target.closest("[data-warp-controls]")) { resetHover(); return; }
      if (event.pointerType === "touch") {
        if (event.type === "pointerdown") hoverTarget.current = { ...hoverTarget.current, contactId: event.pointerId };
        else if (hoverTarget.current.contactId !== event.pointerId) return;
      }
      const rect = canvas.getBoundingClientRect();
      const side = Math.min(rect.width, rect.height);
      if (side <= 0 || event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom) { resetHover(); return; }
      hoverTarget.current = {
        x: (event.clientX - rect.left - rect.width / 2) / side,
        y: (rect.top + rect.height / 2 - event.clientY) / side,
        active: true,
        startedAt: hoverTarget.current.active ? hoverTarget.current.startedAt : performance.now(),
        contactId: hoverTarget.current.contactId
      };
    };
    const onRelease = (event: PointerEvent) => {
      if (hoverTarget.current.contactId === null || hoverTarget.current.contactId === event.pointerId) resetHover();
    };
    const onOutside = (event: PointerEvent) => { if (event.relatedTarget === null) resetHover(); };
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

function Filaments({ progress, opening, settlement, onReady }: Omit<Props, "active" | "coronaProgress">) {
  const material = useRef<ShaderMaterial>(null);
  const elapsed = useRef(2.4);
  const renderedFrames = useRef(0);
  const hoverTarget = useBeamPointer();
  const uniforms = useMemo(() => ({
    uViewport: { value: new Vector2(1, 1) },
    uTime: { value: 0 }, uTravel: { value: 0 }, uRays: { value: 0 },
    uPoint: { value: 0 }, uRadius: { value: .006 }, uOpening: { value: 0 },
    uDensity: { value: beamStyle.density }, uIntensity: { value: beamStyle.intensity },
    uColor: { value: new Vector3(.16, .31, .54) },
    uHoverPointer: { value: new Vector2(0, 0) }, uHover: { value: 0 }, uHeartbeat: { value: 1 }
  }), []);

  useFrame(({ size }, delta) => {
    if (!material.current) return;
    if (++renderedFrames.current === 2) onReady();
    // Three's documented imperative uniform API; never React/application state.
    elapsed.current += Math.min(delta, .05);
    const frame = getWarpFrame(progress.get());
    const current = material.current.uniforms;
    current.uViewport.value.set(size.width, size.height);
    current.uTime.value = elapsed.current;
    current.uTravel.value = frame.travel;
    current.uRays.value = MathUtils.lerp(1, .45, MathUtils.smoothstep(progress.get(), 0, .74)) * (1 - MathUtils.smoothstep(settlement.get(), 0, 1));
    current.uPoint.value = frame.pointOpacity;
    current.uRadius.value = frame.ringScale * .35;
    current.uOpening.value = opening.get();
    const target = hoverTarget.current;
    const hoverSeconds = Math.max(0, (performance.now() - target.startedAt) / 1000 - .06);
    const strength = target.active && hoverSeconds > 0 ? beamStyle.hover : 0;
    const step = Math.min(delta, .1);
    // Native Three damping preserves reference attack/release/follow timing.
    current.uHover.value = MathUtils.damp(current.uHover.value, strength, 1 / (strength > current.uHover.value ? .26 : .32), step);
    const pointer = current.uHoverPointer.value as Vector2;
    if (current.uHover.value < .001) pointer.set(target.x, target.y);
    else pointer.set(MathUtils.damp(pointer.x, target.x, 5, step), MathUtils.damp(pointer.y, target.y, 5, step));
    const phase = (hoverSeconds * beamStyle.heartRate / 60) % 1;
    const beat = Math.exp(-Math.pow((phase - .16) / .05, 2)) + .4 * Math.exp(-Math.pow((phase - .31) / .065, 2));
    current.uHeartbeat.value = 1 + beamStyle.heartbeat * beat;
  });

  return (
    <mesh frustumCulled={false} renderOrder={1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={material} uniforms={uniforms}
        vertexShader={vertexShader} fragmentShader={fragmentShader}
        transparent depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

// The production ring's exact material, not a copied approximation. Full-size
// framebuffer + coordinate scaling retains detail even at the distant hotspot.
function Ring({ progress, coronaProgress, settlement }: Pick<Props, "progress" | "coronaProgress" | "settlement">) {
  const material = useRef<ShaderMaterial>(null);
  const elapsed = useRef(0);
  const motionSpeed = useRef(0);
  // Reuse the exact production material; native GLSL mixes only its final tone.
  // This local treatment avoids another postprocessing pass or shared ring edits.
  const fragment = useMemo(() => `
#define main warpRingMain
${createFragmentShader(resolveFlameConfig({
    pointer: { enabled: false }, visual: { backgroundColor: "#000000" }
  }))}
#undef main
uniform float uSettlement;
void main() {
  warpRingMain();
  if (uSettlement >= 1.0) return;
  // Display-space luma: preserve its weighted sum, not physical luminance.
  float luma = dot(gl_FragColor.rgb, vec3(.2126, .7152, .0722));
  float radius = length((vUv - .5) * uScale - uOrigin);
  float front = mix(.22, .82, smoothstep(.12, 1.0, uSettlement));
  float saturation = smoothstep(.12, .24, uSettlement) * (1.0 - smoothstep(front - .08, front + .08, radius));
  gl_FragColor.rgb = mix(vec3(luma), gl_FragColor.rgb, saturation);
}`, []);
  const uniforms = useMemo(() => ({
    uScale: { value: new Vector2(1, 1) }, uOrigin: { value: new Vector2(0, 0) },
    uTime: { value: 0 }, uPointer: { value: new Vector2(0, 0) },
    uPointerStrength: { value: 0 }, uChromatic: { value: 1 },
    uCssPixel: { value: .001 }, uPaletteWeights: { value: new Vector3(0, 1, 0) },
    uSettlement: { value: 0 }
  }), []);
  useFrame(({ size }, delta) => {
    if (!material.current) return;
    const step = Math.min(delta, .05);
    const frame = getWarpFrame(progress.get());
    const diameter = .7 * Math.min(size.width, size.height) * frame.ringScale;
    const colorThreshold = Math.min(.6 * size.width, .7 * Math.min(size.width, size.height) * backdropTokens.heroScale);
    const colorSettlement = diameter >= colorThreshold ? MathUtils.clamp(settlement.get(), 0, 1) : 0;
    // Reverse freezes immediately; release ramps speed without resetting phase.
    motionSpeed.current = colorSettlement >= 1 ? MathUtils.damp(motionSpeed.current, 1, 3, step) : 0;
    elapsed.current += step * motionSpeed.current;
    const corona = coronaProgress?.get() ?? 0;
    const side = Math.min(size.width, size.height) * frame.ringScale * (1 + corona * backdropTokens.scrollZoom);
    const current = material.current.uniforms;
    current.uScale.value.set(size.width / side, size.height / side);
    // Match Scene's downward CSS travel in the shader's upward-positive space.
    current.uOrigin.value.set(0, -size.height * (corona * backdropTokens.scrollY / 100) / side);
    current.uCssPixel.value = 1 / side;
    current.uTime.value = elapsed.current;
    current.uSettlement.value = colorSettlement;
  });
  return <mesh frustumCulled={false} renderOrder={0}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader}
      fragmentShader={fragment} depthWrite={false} depthTest={false} toneMapped={false} />
  </mesh>;
}

function FieldFallback({ onReady }: Pick<Props, "onReady">) {
  useEffect(onReady, [onReady]);
  return <p role="status" className="absolute inset-x-6 bottom-28 text-center text-xs text-white/60">
    The light study needs WebGL. Text and the next section remain available.
  </p>;
}

class FieldBoundary extends Component<{ children: ReactNode; onReady: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error("[warp-study] Light field unavailable", error); }
  render() { return this.state.failed ? <FieldFallback onReady={this.props.onReady} /> : this.props.children; }
}

export default function WarpField({ progress, opening, coronaProgress, settlement, active, onReady }: Props) {
  return (
    <FieldBoundary onReady={onReady}>
      <Canvas dpr={[1, 1.5]} frameloop={active ? "always" : "never"}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        fallback={<FieldFallback onReady={onReady} />}>
        <Ring progress={progress} coronaProgress={coronaProgress} settlement={settlement} />
        <Filaments progress={progress} opening={opening} settlement={settlement} onReady={onReady} />
      </Canvas>
    </FieldBoundary>
  );
}
