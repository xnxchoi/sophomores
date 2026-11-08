"use client";
import {
  Box3,
  Vector3,
  Group,
  Mesh,
  Object3D,
  Texture,
  Vector2,
  MeshPhysicalMaterial
} from "three";
import { animated, Globals, useSpring } from "@react-spring/three";
import {
  ReactNode,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Center,
  Environment,
  Lightformer,
  Loader,
  Text3D,
  useFont,
  useGLTF,
  useTexture
} from "@react-three/drei";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { upperCase } from "lodash-es";
import { FONTFACES } from "@/constants/api";
import { gsap } from "gsap/all";
import { Physics } from "@react-three/rapier";
import { useRPStore } from "@/providers/RP_Pro";
import { useIsMobile } from "@/providers/MiddleMan";
import { useKinetics } from "@/components/layouts/Registration/KineticProvider";
import { useShallow } from "zustand/shallow";

const glbPath = "/assets/three/plate/mai.glb";
/**
 * TODO: port over files in the paths below to the new directory (/assets/three/...)
 */
const color = {
    pc: "/assets/plate/pl/col540.png",
    mobile: "/assets/plate/pl/col540.png"
  },
  normal = {
    pc: "/assets/plate/pl/nml.png",
    mobile: "/assets/plate/pl/nml54.png"
  },
  rough = {
    pc: "/assets/plate/pl/roughness.png",
    mobile: "/assets/plate/pl/roughness_mobile.png"
  },
  ext = {
    pc: "/assets/plate/pl/ext.png",
    mobile: "/assets/plate/pl/ext.png"
  };
useGLTF.preload(glbPath);
useTexture.preload(color.pc);
useTexture.preload(color.mobile);
useTexture.preload(normal.mobile);
useTexture.preload(normal.pc);
useTexture.preload(rough.mobile);
useTexture.preload(rough.pc);
useTexture.preload(ext.pc);
useFont.preload(FONTFACES.COPPERPLATE.HEAVY);

const DEFAULT_XU = 1 / 24; // Default X-unit
const DEFAULT_YU = 1 / 11; // Default Y-unit
const FOURTY_FIVE_DEG = Math.PI / 8; // 45 degrees in radians
const MULT_X = 11,
  MULT_Y = 1.5;

export function Plate({
  firstName,
  lastName
}: {
  firstName: string;
  lastName: string;
}) {
  return (
    <PlateOuter>
      <ambientLight intensity={Math.PI} />
      <Physics debug={true} interpolate={true} gravity={[0, 0, 0]}>
        <RP_Plate name1={firstName} name2={lastName} />
      </Physics>
      <Environment background blur={0.75}>
        <color attach="background" args={["black"]} />
        <Lightformer
          intensity={11}
          color={"rgb(255, 255, 255)"}
          position={[-2, 7, 1]}
          rotation={[(3 * Math.PI) / 9, 0, (6 * Math.PI) / 8]}
          scale={[16, 0.1, 1]}
        />
        <Lightformer
          intensity={21}
          color={"rgb(255, 255, 255)"}
          position={[0, -1, 5]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[10, 0.1, 1]}
        />
        <Lightformer
          intensity={31}
          color={"rgb(255, 255, 255)"}
          position={[-1, -1, 1]}
          rotation={[0, 0, -Math.PI / 3]}
          scale={[10, 0.1, 1]}
        />
        <Lightformer
          intensity={11}
          color={"rgb(255, 255, 255)"}
          position={[1, 1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[10, 0.1, 1]}
        />
        <Lightformer
          intensity={39}
          color={"rgb(255, 255, 255)"}
          position={[-1, 0, 5]}
          rotation={[0, Math.PI / 33, Math.PI / 9]}
          scale={[19, 1, 1]}
        />
      </Environment>
    </PlateOuter>
  );
}

function PlateOuter({ children }: { children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { visible, setVisible, move } = useKinetics();

  return (
    <>
      <Canvas
        ref={canvas}
        style={{
          height: "100vh",
          width: "100vw",
          position: "fixed",
          left: "0"
        }}
        camera={{ position: [0, 0, 13], fov: 30 }}
        frameloop={move ? "always" : "demand"}
      >
        {children}
      </Canvas>
      <Loader />
    </>
  );
}

export function RP_Plate({
  maxSpeed,
  minSpeed,
  name1,
  name2
}: {
  maxSpeed?: number;
  minSpeed?: number;
  name1: string;
  name2: string;
}) {
  const card = useRef<Mesh>(null!);
  const signRef = useRef<Mesh>(null!);
  const centerRef = useRef<Group>(null!);
  const mp = useRef<MeshPhysicalMaterial>(null!);
  const boxSizer = new Box3(),
    boxSizeGetter = new Vector3();
  const [rotate, setRotate] = useState(0);
  const [scale, setScale] = useState(1);
  const [firstName, setFirst] = useState("R"),
    [lastName, setLast] = useState("P");
  useEffect(() => {
    (setFirst(name1 || "R"), setLast(name2 || "P"));
  }, [name1, name2]);
  const [smoothText, setSmoothText] = useState(`${firstName} ${lastName}`);
  const [opacity, setOpacity] = useState(1);

  const scaledVec = useMemo(() => new Vector3(scale, 0.8, scale), [scale]);
  const [cardSize, setCardSize] = useState({ width: 3.1, height: 2 });
  const [maxW, setMaxW] = useState(3.1 * MULT_X * DEFAULT_XU);
  const [maxH, setMaxH] = useState(2 * MULT_Y * DEFAULT_YU);
  const [curW, setCurW] = useState(0);
  const [curH, setCurH] = useState(0);
  const [springProps, setSpring] = useSpring(() => ({
    rotation: [FOURTY_FIVE_DEG * 4.25, 0, rotate],
    config: { mass: 1, tension: 160, friction: 20 }
  }));
  const { isMobile } = useIsMobile();

  const to = useRef<ReturnType<typeof setTimeout>>(null!);
  const duration = 350; // how long the to will wait before firing callback, in ms
  const { nodes } = useGLTF(glbPath);
  const roughnessMap = ConfigureTexture(
    rough[isMobile ? "mobile" : "pc"],
    // @ts-ignore
    nodes["plate"]["material"].map!
  );
  const colorMap = ConfigureTexture(
    color[isMobile ? "mobile" : "pc"],
    // @ts-ignore
    nodes["plate"]["material"].map
  );
  const normalMap = ConfigureTexture(
    normal[isMobile ? "mobile" : "pc"],
    // @ts-ignore
    nodes["plate"]["material"].map
  );
  useEffect(() => {
    if (nodes["plate"]) {
      const size = new Box3()
        .setFromObject(nodes["plate"])
        .getSize(new Vector3());
      setCardSize({
        width: size.x,
        height: size.z
      });
      setMaxW(MULT_X * size.x * DEFAULT_XU);
      setMaxH((MULT_Y * size.z * DEFAULT_YU) / 2);
    }
  }, []);

  const handleOnCentered = useMemo(
    () => (sm?: string) => {
      sm && setSmoothText(sm);
      if (signRef.current) {
        boxSizer.setFromObject(signRef.current as Object3D, false);
      }
      const size = boxSizer.getSize(boxSizeGetter);
      const currentW = size.x,
        currentH = size.z;
      const scaleW = maxW / currentW,
        scaleH = maxH / currentH;
      const to =
        currentW > maxW
          ? Math.min(scaleW, 1.0, scaleH)
          : Math.min(scaleH, Math.max(scaleW, 1.0, scaleH));
      setCurW(currentW);
      setCurH(currentH);
      setScale(to);
    },
    [boxSizer, boxSizeGetter, maxW, maxH]
  );
  const lastTime = useRef<number>(0);

  const tickF = useMemo<GSAPTickerCallback>(
    () =>
      function tickF(time, deltaTime, frame, elapsed) {
        lastTime.current += gsap.ticker.deltaRatio(60) * 16.7;
        const rat = lastTime.current / 300,
          opGoal = rat < 1 ? 1 - rat : rat - 1;
        setOpacity(opGoal);
        if (rat >= 2) {
          lastTime.current = 0;
          gsap.ticker.remove(tickF);
          return;
        }
        if (rat >= 1) {
          handleOnCentered(upperCase(firstName + " " + lastName));
        }
      },
    [firstName, lastName, lastTime, handleOnCentered, setOpacity]
  );
  useEffect(() => {
    to.current && clearTimeout(to.current);
    to.current = setTimeout(() => {
      gsap.ticker.add(tickF);
    }, duration);
    return () => {
      to.current && clearTimeout(to.current);
      gsap.ticker.remove(tickF);
    };
  }, [firstName, lastName, tickF]);

  const moveTO = useRef<ReturnType<typeof setTimeout>>(null!);

  const text3dProps = useMemo(
    () => ({
      bevelEnabled: true,
      bevelSegments: 15,
      depth: 26,
      bevelThickness: 0.1,
      bevelSize: 0.04,
      bevelOffset: 0.001,
      font: FONTFACES.COPPERPLATE.HEAVY,
      size: 1,
      height: 1,
      letterSpacing: 0.15
    }),
    []
  );
  const anMProps = useMemo(
    (): { [x: string]: (event: ThreeEvent<PointerEvent>) => void } => ({
      onPointerMove: (event) => {
        moveTO.current && clearTimeout(moveTO.current);
        const [x, y] = [event.point.x, event.point.y];
        const angleX = y / 4; // Tilt relative to pointer
        const angleZ = -x / 4 + rotate;

        setSpring({ rotation: [FOURTY_FIVE_DEG * 4, angleX, angleZ] });
      },
      onPointerLeave: (event) => {
        moveTO.current && clearTimeout(moveTO.current);
        setSpring({
          rotation: [FOURTY_FIVE_DEG * 4.25, 0, rotate],
          onRest: () => {}
        }); // Reset rotation
      },
      onPointerUp: (event) => {
        moveTO.current && clearTimeout(moveTO.current);
        const rr = rotate + Math.PI;
        const rrr = rr >= Math.PI * 2 ? rr - Math.PI * 2 : rr;
        setRotate(rrr);
      }
    }),
    [rotate, setSpring]
  );
  const physicalMeshProps = useMemo(
    () => ({
      roughness: 0.9,
      sheenColor: 0.5,
      bumpMap: normalMap,
      bumpScale: 1,
      sheen: 1,
      sheenColorMap: colorMap,
      metalness: 1,
      anisotropyRotation: 0.6,
      anisotropy: 1,
      anisotropyMap: colorMap,
      color: "rgb(76,76,76)",
      map: colorMap,
      roughnessMap: roughnessMap
    }),
    [normalMap, roughnessMap, colorMap]
  );
  const textPhysicalMeshProps = useMemo(
    () => ({
      transparent: true,
      anisotropy: 1,
      metalness: 1,
      opacity: opacity,
      sheenColor: "rgb(33,33,33)",
      sheen: 1,
      anisotropyRotation: 0.66,
      sheenRoughness: 1,
      roughness: 0.4,
      color: "rgb(44,44,44)"
    }),
    [opacity]
  );
  const topLayerTextProps = useMemo(
    () => ({
      transparent: true,
      opacity: opacity,
      sheenRoughness: 1,
      sheen: 1,
      color: "rgb(76,76,76)",
      roughness: 0.5,
      metalness: 1
    }),
    [opacity]
  );
  const centerProps = useMemo(
    () => ({
      position: new Vector3(
        (-cardSize.width / 24) * 9.75,
        0.03,
        -((3.5 - 2.25) * cardSize.height) / 18
      ),
      scale: scaledVec,
      height: cardSize.height,
      width: cardSize.width
    }),
    [cardSize, scaledVec]
  );
  const transitionOutType = useRPStore(useShallow((l) => l.transitionOutType)),
    pageIsTransitioning = useRPStore(useShallow((l) => l.pageIsTransitioning));
  const transOutCount = useRef(0);
  const transitionOut = useEffectEvent(() => {
    if (transOutCount.current < 2) {
      transOutCount.current++;
    } else {
      normalMap.dispose();
      roughnessMap.dispose();
      colorMap.dispose();
      transOutCount.current = 0;
    }
  });
  useEffect(() => {
    if (
      pageIsTransitioning &&
      (transitionOutType === "FROM_MENU" || transitionOutType === "FADE")
    ) {
      transitionOut();
    }
  }, [transitionOutType, pageIsTransitioning]);
  useEffect(() => {
    Globals.assign({ frameLoop: "always" });
    const a = console.warn;
  }, []);
  return (
    // @ts-ignore
    <animated.mesh
      geometry={(nodes["plate"] as Mesh).geometry!}
      position={[0, 0, 0]}
      scale={2}
      {...anMProps}
      {...springProps}
      ref={card}
    >
      <meshPhysicalMaterial {...physicalMeshProps} ref={mp} />
      <Center
        right
        {...centerProps}
        onCentered={() => handleOnCentered()}
        ref={centerRef}
      >
        <group
          rotation={[Math.PI / 2, Math.PI, Math.PI]}
          position={[0, 0, 1]}
          scale={[1, 1, 0.01]}
          ref={signRef}
        >
          <Text3D {...text3dProps}>
            <meshPhysicalMaterial
              {...(
                nodes["plate"] as Mesh & {
                  material: MeshPhysicalMaterial;
                }
              ).material}
              {...textPhysicalMeshProps}
            />
            {smoothText}
          </Text3D>
          <Text3D {...text3dProps} size={1} height={1.15} bevelEnabled={false}>
            <meshPhysicalMaterial {...topLayerTextProps} />
            {smoothText}
          </Text3D>
        </group>
      </Center>
      {/*@ts-ignore*/}
    </animated.mesh>
  );
}

function ConfigureTexture(path: string, map: Texture) {
  const textur = useTexture(path);
  const offset = path.includes("normal") ? [0, 0] : [0, 0];
  textur.flipY = false;
  textur.center = map.center as Vector2;
  textur.wrapT = map.wrapT!;
  textur.wrapS = map.wrapS!;
  textur.offset = new Vector2(offset[0], offset[1]);
  textur.mapping = map.mapping!;
  textur.userData = map.userData!;
  return textur;
}
