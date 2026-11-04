"use client";
import { useWindowResize } from "@/utilities/use_window_resize";
import {
  meshBounds,
  PerspectiveCamera,
  shaderMaterial,
  useTexture,
  View
} from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { animate, useMotionValueEvent } from "motion/react";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import {
  Color as ThreeColor,
  DoubleSide,
  IUniform,
  RepeatWrapping,
  ShaderMaterial,
  Vector2,
  Vector3
} from "three";
import { useShallow } from "zustand/shallow";
import { TWEEN_EASE } from "@/constants/animations";
import { useFrameFactor, useRPStore } from "@/providers/RP_Pro";
import { useCanvasClaim } from "@/stores/CanvasFrameloop";
import fragmentShader from "./shaders/fragment.glsl";
import vertexShader from "./shaders/vertex.glsl";

export function VGradient() {
  const navIsOpen = useRPStore((l) => l.navIsOpen);
  useCanvasClaim(navIsOpen);

  return (
    <View
      className="absolute inset-0 z-200"
      visible={navIsOpen}
      data-active={navIsOpen}
    >
      <PerspectiveCamera
        near={0.01}
        far={1000}
        position={[0, 0, 1]}
        fov={45}
        aspect={2}
        makeDefault={navIsOpen}
      />
      <GradientInner />
    </View>
  );
}
type UpdateColorProps =
  | undefined
  | (
      | { selected: string | -1 }
      | { focused: string | -1 }
      | { focused: string | -1; selected: string | -1 }
    );
useTexture.preload("/assets/seamless.png");
function GradientInner() {
  const navIsOpen = useRPStore(useShallow((l) => l.navIsOpen));
  const noiseTexture = useTexture("/assets/seamless.png", (texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  const { gl, set, scene, camera } = useThree();
  const colorSchemes = useMemo(
    () => [
      [0xd40000, 0x9ecbd9],
      [0xaa3422, 0x77a6a6],
      [0x9ecbd9, 0xe7d5ba],
      [0xf6b08a, 0xfdf1e8],
      [0xfdf1e8, 0x9ecbd9],
      [0xd40000, 0xffb400],
      [0xd40000, 0x9eff00],
      [0xf57b66, 0xc3ead2],
      [0x4d8593, 0xf38b2b],
      [0xaae935, 0xade9ff],
      [0xf5c78e, 0xe74b58],
      [0xc67006, 0x9ce8e3],
      [0xf57b66, 0xc3ead2],
      [0xd40000, 0xf6b08a],
      [0xd40000, 0x9aa989]
    ],
    []
  );
  const colours = useMemo(
    () => [
      new ThreeColor().setHex(colorSchemes[0][0]),
      new ThreeColor().setHex(colorSchemes[0][1])
    ],
    [colorSchemes]
  );
  const u_offset = useMemo(() => new Vector2(0.42, 0.6), []);
  const u_pixels = useMemo(() => new Vector2(1, 1), []);
  const u_resolution = useMemo(() => new Vector2(1, 1), []);
  const u_additionalOffset = useMemo(() => new Vector2(0), []);
  const u_color = useMemo(
    () => [
      new ThreeColor().setHex(colorSchemes[0][0]),
      new ThreeColor().setHex(colorSchemes[0][1]),
      new ThreeColor().setHex(0x353c45),
      new ThreeColor().setHex(0x0f0a0a)
    ],
    [colorSchemes]
  );
  const colore = useMemo(() => new ThreeColor().setRGB(122, 122, 122), []);
  const vecc = useMemo(() => new Vector3(0, 0, 0.46), []);
  const uniforms = useMemo(
    () => ({
      u_color: u_color,
      u_colorMixer: 0,
      u_additionalZoom: 0,
      u_additionalOffset: u_additionalOffset,
      u_size: 0.2,
      u_offset: u_offset,
      u_speed: 0.02,
      u_pixels: u_pixels,
      u_resolution: u_resolution,
      u_time: 1.0,
      u_noiseTexture: noiseTexture,
      u_opacity: 1.0
    }),
    [
      u_offset,
      u_pixels,
      u_additionalOffset,
      u_resolution,
      noiseTexture,
      u_color
    ]
  );
  const GradientShader = shaderMaterial(uniforms, vertexShader, fragmentShader);
  extend({ GradientShader });
  const gradientt = useRef<
    Omit<ShaderMaterial, "uniforms"> & {
      uniforms: {
        [X in keyof typeof uniforms]: IUniform<(typeof uniforms)[X]>;
      };
    }
  >(null);

  const navItemSelected = useFrameFactor((r) => r.activeKey);
  const navItemHovered = useFrameFactor((r) => r.focusedKey);
  const menuMediaPreviewKeyValue = useRPStore(
    useShallow((l) => l.navigationPreviewMediaByKey)
  );
  /**
   *
   * @type {React.RefObject<{[x:string]:number}>}
   */
  const mapped = useRef(new Map<string, number>());
  const menuPreviewKeys = useRef<Array<string>>([]);
  useEffect(() => {
    if (menuPreviewKeys.current.length < 1 && menuMediaPreviewKeyValue) {
      Object.keys(menuMediaPreviewKeyValue).forEach((k, i) => {
        mapped.current.set(k, i);
        menuPreviewKeys.current.push(k);
      });
    }
  }, [menuMediaPreviewKeyValue]);
  const initializeRenderer = useEffectEvent(() => {
    const devicePixelRatio = window.devicePixelRatio || 2;
    const pe = gl.domElement.parentElement;
    if (pe) {
      gl.domElement.width = pe.offsetWidth;
      gl.domElement.height = pe.offsetHeight;
    }
    gl.setPixelRatio(devicePixelRatio);
  });
  const onResize = useEffectEvent(() => {
    gl.setSize(gl.domElement.offsetWidth, gl.domElement.offsetHeight);
    const devicePixelRatio = window.devicePixelRatio || 2;

    gl.setPixelRatio(devicePixelRatio);
    gradientt.current &&
      ((gradientt.current.uniforms.u_resolution.value = new Vector2(
        window.innerWidth,
        window.innerHeight
      )),
      gradientt.current.uniforms.u_pixels.value.set(
        window.innerWidth / devicePixelRatio,
        window.innerHeight / devicePixelRatio
      ));
  });
  const lastResize = useWindowResize({ debounce: 100 });

  useEffect(() => {
    initializeRenderer();
    onResize();
  }, []);
  useEffect(() => {
    onResize();
  }, [lastResize]);

  const updateColor = useCallback(
    (props?: UpdateColorProps) => {
      const ai =
          (props && "selected" in props && props.selected) ||
          navItemSelected.get(),
        hi =
          (props && "focused" in props && props.focused && props.focused) ||
          navItemHovered.get();
      const selIndex =
        (ai === -1
          ? hi === -1
            ? 0
            : mapped.current.get(hi)
          : mapped.current.get(ai)) || 0;
      const target = colorSchemes[selIndex];
      colours[0].setHex(target[0]);
      colours[1].setHex(target[1]);

      gradientt.current &&
        animate([
          [
            gradientt.current.uniforms.u_color.value[0],
            {
              r: colours[0].r,
              g: colours[0].g,
              b: colours[0].b
            },
            {
              duration: 1.1,
              delay: 0.3,
              ease: TWEEN_EASE.power4.inOut,
              at: 0,
              type: "tween"
            }
          ],
          [
            gradientt.current.uniforms.u_color.value[1],
            {
              r: colours[1].r,
              g: colours[1].g,
              b: colours[1].b
            },
            {
              duration: 1.1,
              delay: 0.3,
              ease: TWEEN_EASE.power4.inOut,
              at: 0,
              type: "tween"
            }
          ]
        ]);
    },
    [navItemSelected, navItemHovered, colorSchemes, colours]
  );
  const toRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    toRef.current && clearTimeout(toRef.current);
    if (navIsOpen) {
      toRef.current = setTimeout(updateColor, 50);
    }
  }, [navIsOpen, colorSchemes, colours, updateColor]);
  useMotionValueEvent(navItemSelected, "change", () => {
    toRef.current && clearTimeout(toRef.current);
    toRef.current = setTimeout(updateColor, 50);
  });
  useMotionValueEvent(navItemHovered, "change", () => {
    toRef.current && clearTimeout(toRef.current);
    toRef.current = setTimeout(updateColor, 50);
  });
  useFrame((state, delta, frame) => {
    gradientt.current &&
      (gradientt.current.uniforms.u_time.value += delta * 0.02);
  });
  return (
    <>
      <ambientLight args={[colore]} intensity={1} />
      <directionalLight
        color={colore.setRGB(164, 164, 164)}
        intensity={1}
        position={vecc}
      />
      <mesh raycast={meshBounds} visible={navIsOpen}>
        <planeGeometry args={[10, 10, 192, 192]} />
        {/** @ts-ignore */}
        <gradientShader
          ref={gradientt}
          extensions={{
            derivatives: "#extension GL_OES_standard_derivatives: enable"
          }}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
}
