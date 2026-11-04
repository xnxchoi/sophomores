"use client";

import { useCanvasClaim } from "@/components/gl/canvas-frameloop";
import {
  Environment,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  RenderTexture,
  Text,
  useGLTF,
  useTexture,
  View
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLenis } from "lenis/react";
import { animate, useInView } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UVMapping,
  Vector2,
  Vector3,
  type Object3D,
  type Texture
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

/** Cassette body. Metal normal, glass, and the song line on the display. */
export const TAPE_MODEL_URL = "/assets/three/tape/player.gltf";
const HDR_URL = "/assets/three/tape/urban_alley_01_1k.hdr";
const FONT_URL = "/assets/fonts/Workbench.ttf";
const METAL_TEXTURE = "/assets/three/materials/brushed_metal/normal.jpg";
const HOME = new Vector3(-8, -3, 15);
const TARGET = new Vector3(0, 0, 0);
const DISPLAY_HALF_HEIGHT = 1.5;
const FONT_SIZE = DISPLAY_HALF_HEIGHT * 2 * 0.33;
/** Idle disk speed from Hideaway's TapeModel. Scroll velocity is added on top. */
const BASE_DISK_SPEED = -0.005;
const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Hideaway `TWEEN_EASE.back.out`. Overshoot 1.7 is the cassette key. */
function backOut(overshoot = 1.7) {
  return (progress: number) => {
    if (progress === 0) return 0;
    const next = progress - 1;
    return next * next * ((overshoot + 1) * next + overshoot) + 1;
  };
}

function SongLine({ text }: { text: string }) {
  const first = useRef<Object3D>(null);
  const second = useRef<Object3D>(null);
  const width = useRef(8);
  const offset = useRef(0);
  const line = `   ${text}   `;

  useFrame((_, delta) => {
    offset.current += (delta * 5) / 10;
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
        anchorX="left"
        onSync={(troika) => {
          troika.geometry.computeBoundingBox();
          const box = troika.geometry.boundingBox;
          if (box) width.current = box.max.x - box.min.x;
        }}
      >
        {line}
      </Text>
      <Text
        ref={second}
        font={FONT_URL}
        color="#c5dcdc"
        fontSize={FONT_SIZE}
        fillOpacity={0.6}
        anchorX="left"
      >
        {line}
      </Text>
    </group>
  );
}

function TapeMesh({ playing, label }: { playing: boolean; label: string }) {
  const { scene } = useGLTF(TAPE_MODEL_URL);
  const metal = useTexture(METAL_TEXTURE, (texture) => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.colorSpace = NoColorSpace;
    texture.mapping = UVMapping;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.repeat.set(5, 5);
    texture.offset.set(0, -4);
    texture.needsUpdate = true;
  });
  const disk = useRef<Object3D | null>(null);
  const playButton = useRef<Object3D | null>(null);
  const pauseButton = useRef<Object3D | null>(null);
  const displayMat = useRef<MeshStandardMaterial | null>(null);
  const screenTex = useRef<Texture | null>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const playingRef = useRef(playing);
  const velocity = useRef(0);
  const smoothed = useRef(0);
  const resetting = useRef(false);
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

  useEffect(() => {
    const play = playButton.current;
    const pause = pauseButton.current;
    if (!play && !pause) return;
    const press = playing ? play : pause;
    const release = playing ? pause : play;
    if (release) {
      animate(release.rotation, { y: 0 }, { type: "tween", duration: 0.25, ease: EXPO_OUT });
    }
    if (press) {
      animate(press.rotation, { y: 0.1 }, { type: "tween", duration: 0.3, delay: 0.05, ease: backOut(1.7) });
    }
  }, [playing]);

  useLenis((lenis) => {
    velocity.current = -(lenis.velocity ?? 0) * 0.005;
  });

  useEffect(() => {
    disk.current = scene.getObjectByName("Disk") ?? null;
    playButton.current = scene.getObjectByName("PLAY") ?? null;
    pauseButton.current = scene.getObjectByName("PAUSE") ?? null;
    if (pauseButton.current) pauseButton.current.rotation.y = playingRef.current ? 0 : 0.1;
    if (playButton.current) playButton.current.rotation.y = playingRef.current ? 0.1 : 0;
    let metalMaterial: MeshStandardMaterial | null = null;
    scene.traverse((object) => {
      if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
      const name = object.material.name;
      if (name === "Display") {
        const display = object.material as MeshStandardMaterial;
        display.emissive = new Color(0x96f7ff);
        display.emissiveIntensity = 300;
        displayMat.current = display;
      }
      if (name === "black_glass") {
        object.material = new MeshPhysicalMaterial({
          color: "#111111",
          metalness: 0,
          roughness: 0,
          transmission: 1,
          ior: 1.3,
          thickness: 0.3
        });
      }
      if (name === "Black") {
        object.material = new MeshStandardMaterial({
          color: "#1c1c1c",
          metalness: 0,
          roughness: 1
        });
      }
      if (name.startsWith("Metal")) {
        if (!metalMaterial) {
          metalMaterial = new MeshStandardMaterial({
            color: "#EBEFF4",
            metalness: 0.85,
            roughness: 0.2,
            envMapIntensity: 0.156,
            normalMap: metal,
            normalScale: new Vector2(0.5, 0.5)
          });
        }
        object.material = metalMaterial;
      }
    });
  }, [metal, scene]);

  useFrame(({ camera }, delta) => {
    if (displayMat.current && screenTex.current && displayMat.current.emissiveMap !== screenTex.current) {
      displayMat.current.emissiveMap = screenTex.current;
      displayMat.current.emissiveIntensity = 300;
      displayMat.current.needsUpdate = true;
    }
    smoothed.current += (velocity.current - smoothed.current) * (playingRef.current ? 0.17 : 0.1);
    if (disk.current) disk.current.rotation.y += BASE_DISK_SPEED + smoothed.current;
    if (resetting.current && controls.current) {
      camera.position.lerp(HOME, delta * 5);
      controls.current.target.lerp(TARGET, delta * 5);
      controls.current.update();
      if (camera.position.distanceTo(HOME) < 0.05) resetting.current = false;
    }
  });

  const screenWidth = Math.round(256 * DISPLAY_HALF_HEIGHT * aspect * 0.33);

  return (
    <group rotation={[0.1, 0, 0]}>
      <PerspectiveCamera makeDefault fov={10} position={[-8, -3, 15]} />
      <OrbitControls
        ref={controls}
        enableZoom={false}
        enablePan={false}
        onChange={() => {
          resetting.current = false;
        }}
        onEnd={() => {
          resetting.current = true;
        }}
      />
      <Environment files={HDR_URL} background={false} />
      <pointLight color="#ff7829" intensity={50} distance={3.5} decay={3.6} position={[-2, -1.3, 2]} />
      <group rotation={[0, -0.6, 0]} position={[0, -0.2, 0]} scale={0.6}>
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

/** The cassette. Drag it to orbit. Releasing springs the camera home. */
export function TapeModel({ playing, label }: { playing: boolean; label: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { margin: "200px 0px" });
  useCanvasClaim(inView);

  return (
    <div ref={frame} className="relative h-[70vh] min-h-[520px] w-full overflow-hidden">
      <View className="absolute inset-0">
        <TapeMesh playing={playing} label={label} />
      </View>
    </div>
  );
}

useGLTF.preload(TAPE_MODEL_URL);
useTexture.preload(METAL_TEXTURE);
