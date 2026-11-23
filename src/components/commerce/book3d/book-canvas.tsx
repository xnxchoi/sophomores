"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef, type ReactNode, type RefObject } from "react";
import { MathUtils, type Group, type SpotLight } from "three";
import { Book, type BookSignals, type BookTextures } from "./book";

const easeInOutQuad = (x: number) => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;

/** Intro dolly (map §C1 #10): the camera starts 120 units further back and eases in over 2 s; the book rises into place. */
function Intro({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null), clock = useRef(0);
  useFrame((state, delta) => {
    if (clock.current >= 2) return;
    clock.current = Math.min(clock.current + Math.min(delta, 0.05), 2);
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

/** The book's canvas, loaded lazily by BookStage (three, R3F and drei stay out of the page's first load). */
export default function BookCanvas({ eventSource, signals, textures, frameloop, dark, onOpen, onClose, storageKey, pageTextures }: {
  eventSource: RefObject<HTMLElement | null>;
  signals: RefObject<BookSignals>;
  textures: BookTextures;
  frameloop: "always" | "never";
  dark: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  storageKey?: string;
  pageTextures?: string[];
}) {
  const small = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return <Canvas frameloop={frameloop} dpr={[1, small ? 1.5 : 2]} shadows={dark} eventSource={eventSource as RefObject<HTMLElement>} eventPrefix="client"
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
    {dark && <mesh position={[0, 0, -4]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <shadowMaterial opacity={0.855 * 0.4} />
    </mesh>}
  </Canvas>;
}
