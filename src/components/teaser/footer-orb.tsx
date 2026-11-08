"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Group, MathUtils, type ShaderMaterial } from "three";
import type { SceneProps } from "./scene-loader";

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocal;

  void main() {
    vLocal = position;
    float wave = sin(position.y * 2.4 + uTime * 0.21)
      * sin(position.x * 1.7 - uTime * 0.13);
    vec3 sculpted = position + normal * wave * 0.045;
    vec4 view = modelViewMatrix * vec4(sculpted, 1.0);
    vPosition = view.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * view;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocal;

  vec3 spectrum(float t) {
    return 0.5 + 0.5 * cos(6.283185 * (vec3(0.03, 0.34, 0.68) + t));
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 eye = normalize(-vPosition);
    float facing = max(dot(n, eye), 0.0);
    float fresnel = 1.0 - facing;
    float angle = atan(vLocal.y, vLocal.x);
    // Integer angular harmonics keep the coating continuous across atan's seam.
    float flow = sin(angle + 0.4) * 0.30 + cos(angle * 2.0 - 0.7) * 0.08 + vLocal.z * 0.11 + uTime * 0.017;

    // Broad optical coating, a fine luminous lip, and a dark glass interior.
    float coat = pow(fresnel, 2.8);
    float lip = pow(fresnel, 12.0);
    float fold = sin(fresnel * 43.0 + sin(angle * 3.0 + uTime * 0.09) * 1.3);
    float fineFold = pow(0.5 + 0.5 * fold, 5.0);
    float coatingBands = smoothstep(0.33, 0.91, fresnel) * fineFold;
    vec3 cool = mix(vec3(0.07, 0.12, 0.55), vec3(0.37, 0.15, 0.69),
      0.5 + 0.5 * sin(angle * 2.0 + 0.9));
    vec3 oil = spectrum(flow + fresnel * 0.52);
    float warmSide = pow(max(0.0, cos(angle + 0.85)), 8.0);
    vec3 coating = mix(cool, oil, 0.45);
    coating = mix(coating, vec3(0.98, 0.25, 0.045), warmSide * 0.82);

    float keyLight = pow(max(dot(n, normalize(vec3(-0.7, 0.9, 0.4))), 0.0), 9.0);
    float glint = pow(max(dot(reflect(-eye, n), normalize(vec3(-0.65, 0.6, 0.7))), 0.0), 38.0);
    vec3 color = vec3(0.002, 0.003, 0.008);
    color += coating * (coat * 1.15 + coatingBands * 0.19);
    color += vec3(0.40, 0.58, 1.0) * keyLight * coat * 0.65;
    color += mix(vec3(0.33, 0.43, 0.94), vec3(1.0, 0.67, 0.30), warmSide) * lip * 0.7;
    color += vec3(0.35, 0.47, 0.8) * glint * 0.18;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function StillOrb({ footer = false }: { footer?: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#020204",
        backgroundImage: "url('/teaser/orb-blue.webp')",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        ...(footer
          ? {
              backgroundImage:
                "linear-gradient(to bottom, #020204 45%, transparent 85%), url('/teaser/orb-blue.webp')",
              backgroundPosition: "center, center bottom",
              backgroundSize: "100% 100%, 100% auto"
            }
          : {})
      }}
    />
  );
}

class SceneBoundary extends Component<
  { children: ReactNode; footer?: boolean },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(
      "Sophomores 3D backdrop unavailable; displaying static artwork.",
      error,
      info.componentStack
    );
  }

  render() {
    return this.state.failed ? (
      <StillOrb footer={this.props.footer} />
    ) : (
      this.props.children
    );
  }
}

export function getSceneOffsetY(
  viewportHeight: number,
  progress: number,
  footer = false
) {
  // Move geometry, never its canvas: a translated canvas clips the orb's rim.
  return (
    -viewportHeight *
    (footer ? 0.85 : 0.035 + progress * 0.17)
  );
}

function Lens({
  progress,
  active,
  footer = false,
  entryScale
}: SceneProps) {
  const group = useRef<Group>(null);
  const material = useRef<ShaderMaterial>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const elapsed = useRef(0);
  const { viewport, invalidate } = useThree();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const radius = Math.max(viewport.height * 0.57, viewport.width * 0.39);

  useEffect(() => {
    invalidate();
  }, [active, footer, invalidate]);

  useEffect(() => {
    if (!active) return;
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.current = {
        x: MathUtils.clamp(
          (event.clientX / window.innerWidth - 0.5) * 2,
          -1,
          1
        ),
        y: MathUtils.clamp(
          (event.clientY / window.innerHeight - 0.5) * 2,
          -1,
          1
        )
      };
    };
    const resetPointer = () => {
      pointer.current = { x: 0, y: 0 };
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("blur", resetPointer);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("blur", resetPointer);
    };
  }, [active]);

  useFrame((_, delta) => {
    if (!group.current || !material.current) return;
    const step = Math.min(delta, 0.05);
    const travel = footer ? 0 : MathUtils.clamp(progress.get(), 0, 1);
    if (active) elapsed.current += step;
    material.current.uniforms.uTime.value = elapsed.current;

    const p = pointer.current;
    const targetX = -0.14 + p.y * 0.09 + travel * 0.18;
    const targetY = -0.22 + p.x * 0.14 + travel * 0.3;
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, targetX, 3, step);
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, targetY, 3, step);
    group.current.rotation.z =
      0.16 + Math.sin(elapsed.current * 0.07) * 0.035;
    const zoom = 1 + travel * 0.58;
    // Scale geometry, not the canvas ancestor: R3F measures its layout bounds.
    const entrance = footer ? 1 : (entryScale?.get() ?? 1);
    group.current.scale.setScalar((radius / 2.5) * zoom * entrance);
    group.current.position.y = getSceneOffsetY(
      viewport.height,
      travel,
      footer
    );
  });

  return (
    <group ref={group} rotation={[-0.14, -0.22, 0.16]}>
      <mesh scale={[1.04, 1, 0.69]}>
        <sphereGeometry args={[2.5, 112, 72]} />
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
}

function ContextGuard({ onLost }: { onLost: () => void }) {
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [canvas, onLost]);
  return null;
}

export default function Scene(props: SceneProps) {
  const [visible, setVisible] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const onLost = useCallback(() => setContextLost(true), []);

  useEffect(() => {
    const updateVisibility = () =>
      setVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () =>
      document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  const running = props.active && visible;
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <SceneBoundary footer={props.footer}>
        {contextLost ? (
          <StillOrb footer={props.footer} />
        ) : (
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 7], fov: 42, near: 0.1, far: 30 }}
            gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
            frameloop={running ? "always" : "demand"}
            fallback={<StillOrb footer={props.footer} />}
            style={{ pointerEvents: "none" }}
          >
            <color attach="background" args={["#020204"]} />
            <Lens {...props} active={running} />
            <ContextGuard onLost={onLost} />
          </Canvas>
        )}
      </SceneBoundary>
    </div>
  );
}
