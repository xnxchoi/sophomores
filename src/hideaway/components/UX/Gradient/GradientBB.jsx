"use client";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
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
import gsap from "gsap/dist/gsap";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hideaway/providers/Theme";
import * as m from "motion/react-m";

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

export function Gradient() {
  return (
    <VisibilityProvider>
      <GradientWrapper>
        <GradientInner />
      </GradientWrapper>
    </VisibilityProvider>
  );
}

function GradientWrapper(props) {
  const { setVisible } = useVisibility();
  const { inView, ref } = useInView();
  useEffect(() => {
    setVisible(inView);
  }, [inView, setVisible]);
  return (
    <div className="absolute inset-0 z-[240] h-screen w-screen" ref={ref}>
      <Canvas
        className="preview__gradient"
        style={{ zIndex: 5 }}
        frameloop={inView ? "always" : "never"}
      >
        <PerspectiveCamera
          near={0.01}
          far={1000}
          position={[0, 0, 0.2]}
          fov={35}
          aspect={2}
          makeDefault={true}
        />
        {props.children}
      </Canvas>
    </div>
  );
}

export const PerformanceRegress = () => {
  const navIsTransitioning = useRPStore((l) => l.navIsTransitioning);
  const sidebarOpen = useRPStore((l) => l.sidebarOpen);

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

function VGradientWrapper(props) {
  const navIsOpen = useRPStore((l) => l.navIsOpen);

  return (
    <View
      className="absolute inset-0 z-[200]"
      visible={navIsOpen}
      data-active={navIsOpen}
    >
      <PerspectiveCamera
        near={0.01}
        far={1000}
        position={[0, 0, 0.2]}
        fov={35}
        aspect={2}
        makeDefault={navIsOpen}
      />
      <GradientInner />
    </View>
  );
}

export function VGradient() {
  return <VGradientWrapper />;
}

export function VGradientModule() {
  return (
    <VGradientModuleOuter>
      <VGradientModuleInner />
    </VGradientModuleOuter>
  );
}

export function GradientModule() {
  return (
    <VisibilityProvider>
      <GradientModuleOuter>
        <GradientModuleInner />
      </GradientModuleOuter>
    </VisibilityProvider>
  );
}

const GradientModuleOuter = (props) => {
  const { setVisible } = useVisibility();
  const { inView, ref } = useInView();
  useEffect(() => {
    setVisible(inView);
  }, [inView]);
  return (
    <div
      className={cn("absolute inset-0 h-full w-full", props.className)}
      ref={ref}
    >
      <Canvas className="preview__gradient">
        <PerspectiveCamera
          near={0.01}
          far={1000}
          position={[0, 0, 0.2]}
          fov={35}
          aspect={2}
          makeDefault={true}
        />
        {props.children}
      </Canvas>
    </div>
  );
};
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

    (gradientt.current &&
      (gsap.to(gradientt.current.u_color[0], {
        r: colours[0].r,
        g: colours[0].g,
        b: colours[0].b,
        duration: 0.3,

        ease: "power4.inOut"
      }),
      gsap.to(gradientt.current.u_color[1], {
        r: colours[1].r,
        g: colours[1].g,
        b: colours[1].b,
        duration: 0.3,

        ease: "power4.inOut"
      })),
      gsap.to(gradientt.current.u_color[2], {
        r: colours[2].r,
        g: colours[2].g,
        b: colours[2].b,
        duration: 0.3,
        ease: "power4.inOut"
      }),
      gsap.to(gradientt.current.u_color[3], {
        r: colours[3].r,
        g: colours[3].g,
        b: colours[3].b,
        duration: 0.3,
        ease: "power4.inOut"
      }));
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
const GradientModuleInner = () => {
  const { visible } = useVisibility();
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
  const { gl, set, scene, camera } = useThree();
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
      new Color(colorSchemes[0][0]),
      new Color(colorSchemes[0][1]),
      new Color(colorSchemes[0][2]),
      new Color(colorSchemes[0][3])
    ],
    [colorSchemes]
  );
  const uOffset = useMemo(() => new Vector2(0.42, 0.6), []);
  const u_pixels = useMemo(() => new Vector2(1, 1), []);
  const u_resolution = useMemo(() => new Vector2(1, 1), []);
  const uAdditionalOffset = useMemo(() => new Vector2(0), []);
  const u_color = useMemo(
    () => [
      new Color(colorSchemes[0][0]),
      new Color(colorSchemes[0][1]),
      new Color(colorSchemes[0][2]),
      new Color(colorSchemes[0][3])
    ],
    [colorSchemes]
  );
  const uOpacity = useRef(1.0);
  const colore = useMemo(() => new Color("rgb(122,122,122)"), []);
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

  const [dpr, setDpr] = useState(0);
  useEffect(() => {
    let devicePixelRatio = window.devicePixelRatio || 2;
    setDpr(devicePixelRatio);
    let pe = gl.domElement.parentElement;
    gl.domElement.width = pe.offsetWidth;
    gl.domElement.height = pe.offsetHeight;
  }, []);

  useEffect(() => {
    gl.setPixelRatio(dpr);
  }, [dpr]);
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

    (gradientt.current &&
      (gsap.to(gradientt.current.u_color[0], {
        r: colours[0].r,
        g: colours[0].g,
        b: colours[0].b,
        duration: 0.3,

        ease: "power4.inOut"
      }),
      gsap.to(gradientt.current.u_color[1], {
        r: colours[1].r,
        g: colours[1].g,
        b: colours[1].b,
        duration: 0.3,

        ease: "power4.inOut"
      })),
      gsap.to(gradientt.current.u_color[2], {
        r: colours[2].r,
        g: colours[2].g,
        b: colours[2].b,
        duration: 0.3,
        ease: "power4.inOut"
      }),
      gsap.to(gradientt.current.u_color[3], {
        r: colours[3].r,
        g: colours[3].g,
        b: colours[3].b,
        duration: 0.3,
        ease: "power4.inOut"
      }));
  }, [theme]);
  return (
    <>
      <ambientLight args={[colore]} intensity={1} />
      <directionalLight
        color={colore.setRGB(122, 122, 122)}
        intensity={1}
        position={vecc}
      />
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

function GradientInner() {
  useTexture.preload("/assets/seamless.png");
  const navIsOpen = useRPStore((l) => l.navIsOpen);
  const noiseTexture = useTexture(
    {
      map: "/assets/seamless.png"
    },
    (texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
    }
  );
  const gradientt = useRef();
  const { gl, set, scene, camera } = useThree();
  const colorSchemes = useMemo(
    () => [
      [parseInt("d40000", 16), parseInt("9ecbd9", 16)],
      [parseInt("AA3422", 16), parseInt("77A6A6", 16)],
      [parseInt("9ecbd9", 16), parseInt("e7d5ba", 16)],
      [parseInt("f6b08a", 16), parseInt("fdf1e8", 16)],

      [parseInt("fdf1e8", 16), parseInt("9ecbd9", 16)],
      [parseInt("d40000", 16), parseInt("ffb400", 16)],
      [parseInt("d40000", 16), parseInt("9eff00", 16)],
      [parseInt("F57B66", 16), parseInt("C3EAD2", 16)],
      [parseInt("4D8593", 16), parseInt("F38B2B", 16)],
      [parseInt("AAE935", 16), parseInt("ADE9FF", 16)],
      [parseInt("F5C78E", 16), parseInt("E74B58", 16)],
      [parseInt("C67006", 16), parseInt("9CE8E3", 16)],
      [parseInt("F57B66", 16), parseInt("C3EAD2", 16)],
      [parseInt("d40000", 16), parseInt("f6b08a", 16)],
      [parseInt("d40000", 16), parseInt("9aa989", 16)]
    ],
    []
  );
  const colours = useMemo(
    () => [new Color(colorSchemes[0][0]), new Color(colorSchemes[0][1])],
    [colorSchemes]
  );
  const uOffset = useMemo(() => new Vector2(0.42, 0.6), []);
  const u_pixels = useMemo(() => new Vector2(1, 1), []);
  const u_resolution = useMemo(() => new Vector2(1, 1), []);
  const uAdditionalOffset = useMemo(() => new Vector2(0), []);
  const u_color = useMemo(
    () => [
      new Color(colorSchemes[0][0]),
      new Color(colorSchemes[0][1]),
      new Color().setHex(0x353c45),
      new Color().setHex(0x0f0a0a)
    ],
    [colorSchemes]
  );
  const colore = useMemo(() => new Color().setRGB(122, 122, 122), []);
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
  const GradientShader = shaderMaterial(uniforms, vertexShader, fragmentShader);
  extend({ GradientShader });

  const navItemSelected = useRPStore((l) => l.navigationPageItemSelected);
  const navItemHovered = useRPStore((l) => l.navigationPageItemHovered);
  const menuMediaPreviewKeyValue = useRPStore(
    (l) => l.navigationPreviewMediaByKey
  );
  /**
   *
   * @type {React.RefObject<{[x:string]:number}>}
   */
  const mapped = useRef({});
  const menuPreviewKeys = useRef([]);
  useEffect(() => {
    if (menuPreviewKeys.current.length < 1 && menuMediaPreviewKeyValue) {
      const kv = Object.keys(menuMediaPreviewKeyValue);
      menuPreviewKeys.current = kv;
      kv.forEach((k, v) => {
        mapped.current[k] = v;
      });
    }
  }, []);

  const [dpr, setDpr] = useState(0);
  useEffect(() => {
    let devicePixelRatio = window.devicePixelRatio || 2;
    setDpr(devicePixelRatio);
    let pe = gl.domElement.parentElement;
    gl.domElement.width = pe.offsetWidth;
    gl.domElement.height = pe.offsetHeight;
  }, []);

  useEffect(() => {
    gl.setPixelRatio(dpr);
  }, [dpr]);
  useEffect(() => {
    if (navIsOpen) {
      let selIndex =
        navItemSelected === -1
          ? navItemHovered === -1
            ? 0
            : mapped.current[navItemHovered]
          : mapped.current[navItemSelected];
      let target = colorSchemes[selIndex] || colorSchemes[0];
      colours[0].setHex(target[0]);
      colours[1].setHex(target[1]);

      gradientt.current &&
        (gsap.to(gradientt.current.u_color[0], {
          r: colours[0].r,
          g: colours[0].g,
          b: colours[0].b,
          duration: 1.1,
          delay: 0.3,
          ease: "power4.inOut"
        }),
        gsap.to(gradientt.current.u_color[1], {
          r: colours[1].r,
          g: colours[1].g,
          b: colours[1].b,
          duration: 1.1,
          delay: 0.3,
          ease: "power4.inOut"
        }));
    }
  }, [navItemSelected, navItemHovered]);
  useFrame((state, delta, frame) => {
    gradientt.current.uniforms.u_time.value += delta * 0.02;
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
        <planeGeometry args={[1.5, 1.5, 300, 300]} />
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
