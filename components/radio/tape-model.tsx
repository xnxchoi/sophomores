"use client";

import { useCanvasClaim } from "@/components/gl/canvas-frameloop";
import {
  Environment,
  OrthographicCamera,
  PerspectiveCamera,
  RenderTexture,
  Text,
  useGLTF,
  View
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useInView } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  RGBAFormat,
  SRGBColorSpace,
  type Object3D,
  type Texture
} from "three";

/** Cassette body. The display is a render of the song line, lit by the alley HDR. */
export const TAPE_MODEL_URL = "/assets/three/tape/player.gltf";
const HDR_URL = "/assets/three/tape/urban_alley_01_1k.hdr";
const FONT_URL = "/assets/fonts/Workbench.ttf";
const DISPLAY_HALF_HEIGHT = 1.5;
const FONT_SIZE = DISPLAY_HALF_HEIGHT * 2 * 0.33;

function SongLine({ text }: { text: string }) {
  const first = useRef<Object3D>(null);
  const second = useRef<Object3D>(null);
  const width = useRef(8);
  const offset = useRef(0);
  const line = `   ${text}   `;

  useFrame((_, delta) => {
    offset.current += delta * 0.5;
    const span = width.current || 8;
    const x = offset.current % span;
    if (first.current) first.current.position.x = x;
    if (second.current) second.current.position.x = x - span;
  });

  return (
    <group rotation={[Math.PI, 0, 0]}>
      <Text
        ref={first}
        font={FONT_URL}
        color="#c5dcdc"
        fontSize={FONT_SIZE}
        fillOpacity={0.6}
        onSync={(troika) => {
          troika.geometry.computeBoundingBox();
          const box = troika.geometry.boundingBox;
          if (box) width.current = box.max.x - box.min.x;
        }}
      >
        {line}
      </Text>
      <Text ref={second} font={FONT_URL} color="#c5dcdc" fontSize={FONT_SIZE} fillOpacity={0.6}>
        {line}
      </Text>
    </group>
  );
}

function TapeMesh({ playing, label }: { playing: boolean; label: string }) {
  const { scene } = useGLTF(TAPE_MODEL_URL);
  const disk = useRef<Object3D | null>(null);
  const diskB = useRef<Object3D | null>(null);
  const playButton = useRef<Object3D | null>(null);
  const pauseButton = useRef<Object3D | null>(null);
  const displayMat = useRef<MeshStandardMaterial | null>(null);
  const screenTex = useRef<Texture | null>(null);
  const playingRef = useRef(playing);
  const prepared = useRef(false);
  const aspect = useMemo(() => {
    let value = 8;
    scene.traverse((object) => {
      if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
      if (object.material.name !== "Display") return;
      object.geometry.computeBoundingBox();
      const box = object.geometry.boundingBox;
      if (!box) return;
      const height = box.max.y - box.min.y;
      if (height > 0) value = (box.max.x - box.min.x) / height;
    });
    return value;
  }, [scene]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useFrame(() => {
    if (!prepared.current) {
      prepared.current = true;
      disk.current = scene.getObjectByName("Disk") ?? null;
      diskB.current = scene.getObjectByName("Disk.001") ?? null;
      playButton.current = scene.getObjectByName("PLAY") ?? null;
      pauseButton.current = scene.getObjectByName("PAUSE") ?? null;
      scene.traverse((object) => {
        if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
        if (object.material.name !== "Display") return;
        const material = object.material as MeshStandardMaterial;
        material.emissive = new Color("#96f7ff");
        displayMat.current = material;
      });
    }
    if (displayMat.current && screenTex.current && displayMat.current.emissiveMap !== screenTex.current) {
      displayMat.current.emissiveMap = screenTex.current;
      displayMat.current.emissiveIntensity = 200;
      displayMat.current.needsUpdate = true;
    }
    const speed = playingRef.current ? -0.005 : 0;
    if (disk.current) disk.current.rotation.y += speed;
    if (diskB.current) diskB.current.rotation.y -= speed;
    if (playButton.current) playButton.current.rotation.z = playingRef.current ? 0.07 : 0;
    if (pauseButton.current) pauseButton.current.rotation.z = playingRef.current ? 0 : 0.07;
  });

  const screenWidth = Math.round(256 * DISPLAY_HALF_HEIGHT * aspect * 0.33);

  return (
    <group rotation={[0.1, 0, 0]}>
      <Environment files={HDR_URL} background={false} />
      <pointLight color="#ff7829" intensity={50} distance={3.5} decay={3.6} position={[-2, -1.3, 2]} />
      <group rotation={[0, -0.6, 0]} position={[0, -0.2, 0]}>
        <primitive object={scene} />
      </group>
      <mesh position={[0, -1000, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial emissiveIntensity={300}>
          <RenderTexture
            ref={screenTex}
            attach="emissiveMap"
            width={Math.max(screenWidth, 64)}
            height={256}
            format={RGBAFormat}
            flipY={false}
            colorSpace={SRGBColorSpace}
            magFilter={LinearFilter}
            minFilter={LinearFilter}
          >
            <OrthographicCamera
              makeDefault
              position={[0, 0, 10]}
              left={-DISPLAY_HALF_HEIGHT * aspect}
              right={DISPLAY_HALF_HEIGHT * aspect}
              top={DISPLAY_HALF_HEIGHT * aspect}
              bottom={-DISPLAY_HALF_HEIGHT * aspect}
              near={0.1}
              far={10}
            />
            <SongLine text={label} />
          </RenderTexture>
        </meshStandardMaterial>
      </mesh>
    </group>
  );
}

/** The cassette, framed the way the radio camera frames it. */
export function TapeModel({ playing, label }: { playing: boolean; label: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { margin: "200px 0px" });
  useCanvasClaim(inView);

  return (
    <div ref={frame} className="relative aspect-video w-full overflow-hidden rounded-[10px]">
      <View className="absolute inset-0">
        <PerspectiveCamera makeDefault position={[-8, -3, 15]} fov={10} />
        <TapeMesh playing={playing} label={label} />
      </View>
    </div>
  );
}

useGLTF.preload(TAPE_MODEL_URL);
