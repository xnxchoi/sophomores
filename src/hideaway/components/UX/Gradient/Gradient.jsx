"use client";
import { extend, useFrame, useThree } from "@react-three/fiber";
import {
  meshBounds,
  PerspectiveCamera,
  shaderMaterial,
  useTexture,
  View
} from "@react-three/drei";
import {
  Color as ThreeColor,
  DoubleSide,
  RepeatWrapping,
  Vector2,
  Vector3
} from "three";
import vertexShader from "@/hideaway/components/UX/Gradient/shaders/vertex.glsl";
import fragmentShader from "@/hideaway/components/UX/Gradient/shaders/fragment.glsl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import { useRPStore } from "@/hideaway/providers/RP_Pro.tsx";
import gsap from "gsap";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hideaway/providers/Theme";
import * as m from "motion/react-m";
import { useShallow } from "zustand/shallow";
import { animate } from "motion/react";
import { TE } from "@/hideaway/constants/animations.ts";

const VisibilityContext = createContext(undefined);
const VisibilityProvider = ({ children }) => {
  const visibilityRef = useRef();
  const [visible, hv] = useState(false);
  const setVisible = useCallback(
    (visibil) => {
      hv(visibil);
    },
    [hv]
  );
  if (!visibilityRef.current) {
    visibilityRef.current = { visible, setVisible };
  }
  return (
    <VisibilityContext.Provider value={visibilityRef.current}>
      {children}
    </VisibilityContext.Provider>
  );
};
const useVisibility = () => {
  const haC = useContext(VisibilityContext);
  if (!haC) {
    throw new Error("useVisibility must be used within VisibilityProvider");
  }
  return haC;
};

export const PerformanceRegress = () => {
  const navIsTransitioning = useRPStore(
    useShallow((l) => l.navIsTransitioning)
  );
  const sidebarOpen = useRPStore(useShallow((l) => l.sidebarOpen));

  const hasLoadedOnce = useRef(false);
  useFrame((state) => {
    if (navIsTransitioning && !hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
    } else if (navIsTransitioning || sidebarOpen) {
      state.performance.regress();
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

export const MotionView = m.create(View);
const VGradientModuleOuter = (props) => {
  const { inView, ref } = useInView();

  return (
    <MotionView
      className={cn("absolute inset-0 z-0 h-full w-full", props.className)}
      ref={ref}
    >
      <PerspectiveCamera
        near={0.01}
        far={1000}
        position={[0, 0, 0.2]}
        fov={35}
        aspect={2}
        makeDefault={inView}
      />
      {props.children}
    </MotionView>
  );
};
const VGradientModuleInner = () => {
  const noiseTexture = useTexture(
    {
      map: "/assets/seamless.png"
    },
    (texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
    }
  );
  const gradientt = useRef();
  const theme = useTheme((r) => r.theme);
  const { gl } = useThree();
  const colorSchemes = useMemo(
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
  const colours = useMemo(
    () => [
      new ThreeColor(colorSchemes[0][0]),
      new ThreeColor(colorSchemes[0][1]),
      new ThreeColor(colorSchemes[0][2]),
      new ThreeColor(colorSchemes[0][3])
    ],
    [colorSchemes]
  );
  const uOffset = useMemo(() => new Vector2(0.42, 0.6), []);
  const u_pixels = useMemo(() => new Vector2(1, 1), []);
  const u_resolution = useMemo(() => new Vector2(1, 1), []);
  const uAdditionalOffset = useMemo(() => new Vector2(0), []);
  const u_color = useMemo(
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
      uColorMixer: 0,
      uAdditionalZoom: 0,
      uAdditionalOffset: uAdditionalOffset,
      uSize: 0.2,
      uOffset: uOffset,
      uSpeed: 0.02,
      u_pixels: u_pixels,
      u_resolution: u_resolution,
      u_time: 1.0,
      u_noiseTexture: noiseTexture,
      u_opacity: 1.0
    }),
    [uOffset, u_pixels, uAdditionalOffset, u_resolution, noiseTexture, u_color]
  );
  const setPR = useEffectEvent(() => {
    let devicePixelRatio = window.devicePixelRatio || 2;
    let pe = gl.domElement.parentElement;
    gl.domElement.width = pe.offsetWidth;
    gl.domElement.height = pe.offsetHeight;
    gl.setPixelRatio(devicePixelRatio);
  });

  useEffect(() => {
    setPR();
  }, []);

  const GradientShader = shaderMaterial(uniforms, vertexShader, fragmentShader);
  extend({ GradientShader });
  useFrame((state, delta, frame) => {
    gradientt.current.uniforms.u_time.value += delta * 0.01;
  });
  useEffect(() => {
    let selIndex = theme === "dark" ? 0 : 1;
    let target = colorSchemes[selIndex];
    colours[0].setHex(target[0]);
    colours[1].setHex(target[1]);
    colours[2].setHex(target[2]);
    colours[3].setHex(target[3]);
    const seq = [];
    (gradientt.current &&
      seq.push(
        ...[
          [
            gradientt.current.u_color[0],
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
            gradientt.current.u_color[1],
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
            gradientt.current.u_color[2],
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
            gradientt.current.u_color[3],
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
        ]
      ),
      animate(seq));
  }, [colorSchemes, colours, theme]);
  return (
    <>
      <ambientLight args={[colore]} intensity={1} />
      <directionalLight color={colore} intensity={1} position={vecc} />
      <mesh raycast={meshBounds}>
        <planeGeometry args={[1.5, 1.5, 300, 300]} />
        <gradientShader
          ref={gradientt}
          opacity={uOpacity.current}
          extensions={{
            derivatives: "#extension GL_OES_standard_derivatives: enable"
          }}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
};
