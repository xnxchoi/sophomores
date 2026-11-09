"use client";
import fragmentShader from "@/hideaway/components/UX/Gradient/shaders/fragment.glsl";
import vertexShader from "@/hideaway/components/UX/Gradient/shaders/vertex.glsl";
import { TE } from "@/hideaway/constants/animations";
import { cn } from "@/lib/utils";
import { useRPStore } from "@/hideaway/providers/RP_Pro";
import { useTheme } from "@/hideaway/providers/Theme";
import {
  meshBounds,
  PerspectiveCamera,
  shaderMaterial,
  useTexture,
  View
} from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { AnimationSequence, Segment } from "motion";
import { animate } from "motion/react";
import * as m from "motion/react-m";
import {
  ComponentProps,
  ReactNode,
  Ref,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef
} from "react";
import { useInView } from "react-intersection-observer";
import {
  Color as ThreeColor,
  DoubleSide,
  IUniform,
  RepeatWrapping,
  ShaderMaterial,
  Texture,
  TextureDataType,
  Vector2,
  Vector3
} from "three";
import { useShallow } from "zustand/shallow";

export const PerformanceRegress = () => {
  const navIsTransitioning = useRPStore(
    useShallow((l) => l.navIsTransitioning)
  );
  const sidebarOpen = useRPStore(useShallow((l) => l.sidebarOpen));

  const hasLoadedOnce = useRef(false);
  useFrame((state) => {
    if (navIsTransitioning && !hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
    } else {
      if (navIsTransitioning || sidebarOpen) {
        state.performance.regress();
      }
    }
  });
  return <></>;
};

export function VGradientModule() {
  return (
    <VGradientModuleOuter>
      <VGradientModuleInner />
    </VGradientModuleOuter>
  );
}

type Uniformify<T> = {
  [K in keyof T]: IUniform<T[K]>;
};
export const MotionView = m.create(View);
type MiewProps = Omit<ComponentProps<typeof MotionView>, "children"> & {
  children?: ReactNode;
};
const VGradientModuleOuter = ({ className, children }: MiewProps) => {
  const { inView, ref } = useInView();

  return (
    <MotionView
      className={cn("absolute inset-0 z-0 h-full w-full", className)}
      ref={ref as Ref<HTMLDivElement>}
    >
      <PerspectiveCamera
        near={0.01}
        far={1000}
        position={[0, 0, 0.2]}
        fov={35}
        aspect={2}
        makeDefault={inView}
      />
      {children}
    </MotionView>
  );
};
export type GradientUniformMap = {
  u_color: [ThreeColor, ThreeColor, ThreeColor, ThreeColor];
  u_colorMixer: number;
  u_additionalZoom: number;
  u_additionalOffset: Vector2;
  u_size: number;
  u_offset: Vector2;
  u_speed: number;
  u_pixels: Vector2;
  u_resolution: Vector2;
  u_time: number;
  u_noiseTexture: Texture<TextureDataType>;
  u_opacity: number;
};
const VGradientModuleInner = () => {
  const noiseTexture = useTexture("/assets/seamless.png", (texture) => {
    if ("wrapS" in texture) {
      texture.wrapS = texture.wrapT = RepeatWrapping;
    }
  });

  const gradientt = useRef<
    Omit<ShaderMaterial, "uniforms"> & {
      uniforms: {
        [X in keyof GradientUniformMap]: IUniform<GradientUniformMap[X]>;
      };
    }
  >(null!);
  const theme = useTheme((r) => r.theme);
  const { gl } = useThree();
  const colorSchemes: [
    [number, number, number, number],
    [number, number, number, number]
  ] = useMemo(
    () => [
      [
        parseInt("3B1E1D", 16),
        parseInt("603230", 16),
        parseInt("85504D", 16),
        parseInt("A5716E", 16)
      ],
      [
        parseInt("F9E2E0", 16),
        parseInt("EAC0BD", 16),
        parseInt("D89B95", 16),
        parseInt("C07D78", 16)
      ]
    ],
    []
  );
  const colours = useMemo<[ThreeColor, ThreeColor, ThreeColor, ThreeColor]>(
    () => [
      new ThreeColor(colorSchemes[0][0]),
      new ThreeColor(colorSchemes[0][1]),
      new ThreeColor(colorSchemes[0][2]),
      new ThreeColor(colorSchemes[0][3])
    ],
    [colorSchemes]
  );
  const u_offset = useMemo(() => new Vector2(0.42, 0.6), []);
  const u_pixels = useMemo(() => new Vector2(1, 1), []);
  const u_resolution = useMemo(() => new Vector2(1, 1), []);
  const u_additionalOffset = useMemo(() => new Vector2(0), []);
  const u_color = useMemo<[ThreeColor, ThreeColor, ThreeColor, ThreeColor]>(
    () => [
      new ThreeColor(colorSchemes[0][0]),
      new ThreeColor(colorSchemes[0][1]),
      new ThreeColor(colorSchemes[0][2]),
      new ThreeColor(colorSchemes[0][3])
    ],
    [colorSchemes]
  );
  const uOpacity = useRef(1.0);
  const colore = useMemo(() => new ThreeColor("rgb(122,122,122)"), []);
  const vecc = useMemo(() => new Vector3(0, 0, 0.46), []);
  const uniforms = useMemo(
    () => ({
      u_color: u_color,
      u_colorMixer: 0,
      u_additionalZoom: 0,
      u_additionalOffset: u_additionalOffset,
      u_size: 0.2,
      u_offset: u_offset,
      uSpeed: 0.02,
      u_pixels: u_pixels,
      u_resolution: u_resolution,
      u_time: 1.0,
      u_noiseTexture: noiseTexture,
      u_opacity: uOpacity.current
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
  const setPR = useEffectEvent(() => {
    const devicePixelRatio = window.devicePixelRatio || 2;
    const pe = gl.domElement.parentElement;
    if (pe) {
      gl.domElement.width = pe.offsetWidth;
      gl.domElement.height = pe.offsetHeight;
    }
    gl.setPixelRatio(devicePixelRatio);
  });

  useEffect(() => {
    setPR();
  }, []);

  useFrame((state, delta, frame) => {
    gradientt.current.uniforms.u_time.value += delta * 0.01;
  });
  useEffect(() => {
    const selIndex = theme === "dark" ? 0 : 1;
    const target = colorSchemes[selIndex];
    const colours = [
      new ThreeColor(target[0]),
      new ThreeColor(target[1]),
      new ThreeColor(target[2]),
      new ThreeColor(target[3])
    ];
    const seq: AnimationSequence = [];
    (gradientt.current &&
      seq.push(
        ...([
          [
            gradientt.current.uniforms.u_color.value[0],
            {
              r: colours[0].r,
              g: colours[0].g,
              b: colours[0].b
            },
            {
              duration: 0.3,
              type: "tween",
              at: 0,
              ease: TE.power4.inOut
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
              duration: 0.3,
              type: "tween",
              at: 0,
              ease: TE.power4.inOut
            }
          ],
          [
            gradientt.current.uniforms.u_color.value[2],
            {
              r: colours[2].r,
              g: colours[2].g,
              b: colours[2].b
            },
            {
              duration: 0.3,
              type: "tween",
              at: 0,
              ease: TE.power4.inOut
            }
          ],
          [
            gradientt.current.uniforms.u_color.value[3],
            {
              r: colours[3].r,
              g: colours[3].g,
              b: colours[3].b
            },
            {
              duration: 0.3,
              type: "tween",
              at: 0,
              ease: TE.power4.inOut
            }
          ]
        ] as Segment[])
      ),
      animate(seq));
  }, [colorSchemes, colours, theme]);
  return (
    <>
      <ambientLight args={[colore]} intensity={1} />
      <directionalLight color={colore} intensity={1} position={vecc} />
      <mesh raycast={meshBounds}>
        <planeGeometry args={[1.5, 1.5, 300, 300]} />
        {/** @ts-ignore**/}
        <gradientShader
          ref={gradientt}
          opacity={uOpacity.current}
          u_offset={u_offset}
          uSpeed={0.02}
          extensions={{
            derivatives: "#extension GL_OES_standard_derivatives: enable"
          }}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
};
