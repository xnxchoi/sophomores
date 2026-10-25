"use client";

import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { NoToneMapping, type ShaderMaterial, type WebGLRenderer } from "three";
import { createFragmentShader } from "../flame-backdrop/shaders";
import {
  advanceLightTime,
  createLightUniforms,
  lightPixelRatio,
  studyLightConfig
} from "@/lib/invitation/light";
import { subscribeVisibility as subscribePage } from "../../utils/browser/visibility";

const vertex = `
varying vec2 vUv;
void main() {
  vUv = position.xy * .5 + .5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const fragment = createFragmentShader(studyLightConfig);
const fill = { width: "100%", height: "100%", background: "#000" } as const;
const subscribeClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const pageSnapshot = () => typeof document !== "undefined" && !document.hidden;

/** Three's imperative diagnostic callback belongs to the renderer, not React state. */
function monitorRenderer(
  renderer: WebGLRenderer,
  onFailure: (error: Error) => void
) {
  const canvas = renderer.domElement;
  const lost = () => onFailure(new Error("The study WebGL context was lost."));
  const previousShaderError = renderer.debug.onShaderError;
  renderer.debug.onShaderError = () =>
    onFailure(
      new Error(
        "The existing flame shader failed to compile in the study renderer."
      )
    );
  canvas.addEventListener("webglcontextlost", lost);
  return () => {
    canvas.removeEventListener("webglcontextlost", lost);
    renderer.debug.onShaderError = previousShaderError;
  };
}

class LightBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error(
      "[StudyLight] WebGL unavailable; using neutral fallback.",
      error
    );
  }
  render() {
    return this.state.failed ? (
      <div style={fill} data-light-status="unavailable" />
    ) : (
      this.props.children
    );
  }
}

function FlamePlane({
  running,
  onFailure,
  onReady
}: {
  running: boolean;
  onFailure: (error: Error) => void;
  onReady: () => void;
}) {
  const material = useRef<ShaderMaterial>(null);
  const elapsed = useRef(0);
  const frameBudget = useRef(0);
  const needsPaint = useRef(true);
  const ready = useRef(false);
  const size = useThree((state) => state.size);
  const initialDpr = useThree((state) => state.viewport.initialDpr);
  const setDpr = useThree((state) => state.setDpr);
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const uniforms = useMemo(
    () => createLightUniforms(size.width, size.height),
    [size.width, size.height]
  );

  useEffect(() => {
    setDpr(lightPixelRatio(size.width, size.height, initialDpr));
    needsPaint.current = true;
    invalidate();
  }, [size.width, size.height, initialDpr, setDpr, invalidate, running]);

  useEffect(() => monitorRenderer(gl, onFailure), [gl, onFailure]);

  // R3F owns scheduling. Positive priority caps actual GPU draws to the approved quality FPS.
  useFrame((state, delta) => {
    if (!material.current) return;
    elapsed.current = advanceLightTime(elapsed.current, delta, running);
    frameBudget.current += Math.min(0.1, Math.max(0, delta));
    if (
      running &&
      !needsPaint.current &&
      frameBudget.current < 1 / studyLightConfig.quality.fps
    )
      return;
    frameBudget.current = 0;
    needsPaint.current = false;
    material.current.uniforms.uTime.value = elapsed.current;
    try {
      state.gl.render(state.scene, state.camera);
      if (!ready.current) {
        ready.current = true;
        onReady();
      }
    } catch (error) {
      onFailure(error instanceof Error ? error : new Error(String(error)));
    }
  }, 1);

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Same approved flame equations and palette, with R3F as the only WebGL lifecycle/loop owner. */
export function StudyLight({
  paused = false,
  visible = true
}: {
  paused?: boolean;
  visible?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const didFail = useRef(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const mounted = useSyncExternalStore(
    subscribeClient,
    clientSnapshot,
    serverSnapshot
  );
  const pageVisible = useSyncExternalStore(
    subscribePage,
    pageSnapshot,
    serverSnapshot
  );
  const running = !paused && mounted && visible && inView && pageVisible;
  const reportFailure = useCallback((error: Error) => {
    if (didFail.current) return;
    didFail.current = true;
    console.error("[StudyLight] Using neutral fallback.", error);
    setFailed(true);
  }, []);
  const reportReady = useCallback(() => {
    if (!didFail.current) setReady(true);
  }, []);

  useEffect(() => {
    if (!host.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting)
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      style={{ ...fill, pointerEvents: "none" }}
      data-light-status={
        failed
          ? "unavailable"
          : ready
            ? "ready"
            : mounted
              ? "pending"
              : "static"
      }
    >
      {mounted && !failed && (
        <LightBoundary>
          <Canvas
            frameloop={running ? "always" : "demand"}
            dpr={[1, 1.5]}
            gl={{
              alpha: false,
              antialias: false,
              depth: false,
              powerPreference: "low-power",
              toneMapping: NoToneMapping
            }}
            fallback={<div style={fill} data-light-status="unavailable" />}
          >
            <FlamePlane
              running={running}
              onFailure={reportFailure}
              onReady={reportReady}
            />
          </Canvas>
        </LightBoundary>
      )}
    </div>
  );
}
