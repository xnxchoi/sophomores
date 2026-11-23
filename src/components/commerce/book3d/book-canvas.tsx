"use client";

import { Environment, Lightformer, useFBO } from "@react-three/drei";
import { Canvas, events as createPointerEvents, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { MathUtils, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, type Group, type SpotLight } from "three";
import { Book, type BookSignals, type BookTextures } from "./book";

const easeInOutQuad = (x: number) => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;

/** Intro dolly (map §C1 #10): the camera starts 120 units further back and eases in over 2 s; the book rises into place. */
function Intro({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null), clock = useRef(0);
  useFrame((state, delta) => {
    if (clock.current >= 2) return;
    clock.current = Math.min(clock.current + Math.min(delta, 0.05), 2);
    state.invalidate(); // on demand, the intro still plays to its end
    const e = easeInOutQuad(clock.current / 2);
    state.camera.position.z = 54 + 120 * (1 - e);
    if (group.current) group.current.position.y = -6 * (1 - e);
  });
  return <group ref={group} position={[0, -6, 0]}>{children}</group>;
}

/** Mouse spotlight (#12): follows the pointer at 0.06 per frame; it casts the book's shadow in the dark theme only. */
function PointerSpot({ dark }: { dark: boolean }) {
  const light = useRef<SpotLight>(null);
  useFrame((state, delta) => {
    if (!light.current) return;
    const k = 1 - (1 - 0.06) ** (Math.min(delta, 0.05) * 60);
    light.current.position.x = MathUtils.lerp(light.current.position.x, 36 * Math.sin(state.pointer.x * 0.35 * Math.PI), k);
    light.current.position.y = MathUtils.lerp(light.current.position.y, 36 * Math.sin(state.pointer.y * 0.3 * Math.PI), k);
  });
  return <spotLight ref={light} position={[0, 0, 50]} angle={0.5} penumbra={0.94} intensity={900} decay={2}
    castShadow={dark} shadow-mapSize={[2048, 2048]} shadow-radius={3.2} shadow-bias={-0.0004} />;
}

/**
 * Magnifier (#29): a lens over the scene. Magnification 0.308, radius 0.31 of the height, barrel −0.57, a ring at the
 * edge. It follows the pointer at 22/s; on touch it stays where it was put and moves only while a finger drags.
 * Mounted only while it's on: it renders the scene itself (into a target for the lens, then to the screen).
 */
function Magnifier({ touch }: { touch: boolean }) {
  const target = useFBO();
  const source = useThree((state) => state.events.connected) as HTMLElement | undefined;
  const lens = useMemo(() => {
    const material = new ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uMap: { value: null }, uCenter: { value: new Vector2(0.5, 0.5) }, uAspect: { value: 1 }, uRadius: { value: 0.31 }, uMag: { value: 0.308 }, uBarrel: { value: -0.57 } },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: `
        uniform sampler2D uMap; uniform vec2 uCenter; uniform float uAspect, uRadius, uMag, uBarrel; varying vec2 vUv;
        void main() {
          vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0); float n = length(d) / uRadius;
          if (n > 1.0) discard;
          vec2 sampleUv = uCenter + (vUv - uCenter) * (1.0 - uMag) * (1.0 + uBarrel * (1.0 - n * n) * 0.5);
          vec4 color = texture2D(uMap, sampleUv);
          float ring = smoothstep(0.955, 0.985, n);
          gl_FragColor = vec4(mix(color.rgb, vec3(0.0), ring * 0.45), max(color.a, ring * 0.45 + 0.9 * (1.0 - ring)));
        }`
    });
    const scene = new Scene(); scene.add(new Mesh(new PlaneGeometry(2, 2), material));
    return { material, scene, camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, []);
  useEffect(() => () => { lens.material.dispose(); lens.scene.traverse((o) => { if (o instanceof Mesh) o.geometry.dispose(); }); }, [lens]);
  const pressed = useRef(false);
  useEffect(() => {
    // The stage (the canvas's event source) takes the pointer, not the canvas. Releases arrive there too: a press on
    // the book captures the pointer to the stage, so no window listener is needed.
    if (!source) return;
    const down = (event: Event) => { if (!(event.target as Element | null)?.closest?.("[data-book-ui]")) pressed.current = true; };
    const up = () => { pressed.current = false; };
    source.addEventListener("pointerdown", down);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) source.addEventListener(type, up);
    return () => { source.removeEventListener("pointerdown", down); for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) source.removeEventListener(type, up); };
  }, [source]);
  // The lens uniforms are live GPU state, not React state.
  /* eslint-disable react-hooks/immutability */
  useFrame((state, delta) => {
    const u = lens.material.uniforms, center = u.uCenter.value as Vector2;
    if (!touch || pressed.current) {
      const k = 1 - Math.exp(-22 * Math.min(delta, 0.05));
      center.x += ((state.pointer.x + 1) / 2 - center.x) * k; center.y += ((state.pointer.y + 1) / 2 - center.y) * k;
    }
    u.uAspect.value = state.size.width / Math.max(state.size.height, 1);
    u.uMap.value = target.texture;
    state.gl.setRenderTarget(target); state.gl.render(state.scene, state.camera); state.gl.setRenderTarget(null);
    state.gl.render(state.scene, state.camera);
    state.gl.autoClear = false; state.gl.render(lens.scene, lens.camera); state.gl.autoClear = true;
  }, 1);
  /* eslint-enable react-hooks/immutability */
  return null;
}

/** The book's canvas, loaded lazily by BookStage (three, R3F and drei stay out of the page's first load). */
export default function BookCanvas({ eventSource, signals, textures, frameloop, dark, onOpen, onClose, storageKey, pageTextures, magnifier = false }: {
  eventSource: RefObject<HTMLElement | null>;
  signals: RefObject<BookSignals>;
  textures: BookTextures;
  frameloop: "always" | "demand" | "never";
  dark: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  storageKey?: string;
  pageTextures?: string[];
  magnifier?: boolean;
}) {
  const small = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return <Canvas frameloop={frameloop} dpr={[1, small ? 1.5 : 2]} shadows={dark} eventSource={eventSource as RefObject<HTMLElement>}
    // The pointer from client coordinates against the stage's own rect (R3F's client prefix doesn't subtract the offset).
    // Moves over the stage's own controls never get here (book-stage.tsx); their presses and clicks do, and keep the last
    // book pointer, so a tap on a control doesn't move the lens, light or tilt.
    events={(store) => ({ ...createPointerEvents(store), compute(event, state) {
      const stage = state.events.connected as HTMLElement | undefined;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (!(event.target as Element | null)?.closest?.("[data-book-ui]")) state.pointer.set(((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1, -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1);
      state.raycaster.setFromCamera(state.pointer, state.camera);
    } })}
    camera={{ fov: 18, position: [0, 0, 174], near: 1, far: 400 }} gl={{ antialias: true, alpha: true }}
    // A click on empty canvas closes Look inside (#25), unless it was on the stage's own controls.
    onPointerMissed={(event) => { if (signals.current.look && !(event.target as Element | null)?.closest?.("[data-book-ui]")) onClose?.(); }}>
    <ambientLight intensity={0.6} />
    <directionalLight position={[10, 14, 30]} intensity={1.1} />
    <PointerSpot dark={dark} />
    {/* Reflections for the foil and gloss, made from light panels (no environment file). */}
    <Environment resolution={128}>
      <Lightformer form="rect" intensity={2} position={[0, 6, 20]} scale={[30, 8, 1]} />
      <Lightformer form="rect" intensity={1} position={[-20, -4, 10]} rotation-y={Math.PI / 3} scale={[20, 6, 1]} />
    </Environment>
    <Suspense fallback={null}>
      <Intro><Book textures={textures} signals={signals} onOpen={onOpen} onClose={onClose} small={small} storageKey={storageKey} pageTextures={pageTextures} /></Intro>
    </Suspense>
    {magnifier && <Magnifier touch={small} />}
    {dark && <mesh position={[0, 0, -4]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <shadowMaterial opacity={0.855 * 0.4} />
    </mesh>}
  </Canvas>;
}
