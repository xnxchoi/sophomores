"use client";

import { useCursorHandlers } from "@/hideaway/components/core/cursorWrapper";
import { FONTFACES } from "@/constants/api";
import type { Flatten } from "@/hideaway/utilities/typeUtilities";
import {
  Center,
  Text3D,
  useGLTF,
  useTexture,
  type OnCenterCallbackProps,
  type ScreenSizerProps
} from "@react-three/drei";
import {
  extend,
  useFrame,
  useThree,
  type ThreeElements,
  type ThreeEvent
} from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  RapierRigidBody,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RigidBodyAutoCollider,
  type RigidBodyTypeString
} from "@react-three/rapier";
import { upperCase } from "lodash-es";
import { easing } from "maath";
import { cubic } from "maath/easing";
import {
  MeshLineGeometry,
  MeshLineMaterial,
  raycast
} from "@/components/three/meshline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box3,
  CatmullRomCurve3,
  Color,
  Euler,
  LinearFilter,
  LinearMipmapLinearFilter,
  MathUtils,
  NoColorSpace,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type MeshPhysicalMaterial,
  type MeshStandardMaterial,
  type PointLight
} from "three";
const ASSETS_BASE_PATH = "/assets/three";
const OBJ_BASE_PATH = `${ASSETS_BASE_PATH}/badge`;
const materialTexturesPath = `${ASSETS_BASE_PATH}/materials`;

extend({ MeshLineGeometry, MeshLineMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLine: Mesh &
      MeshLineGeometry &
      MeshLineMaterial & {
        raycast: ReturnType<typeof raycast>;
      };
    meshLineMaterial: Partial<MeshLineMaterial>;
    meshLineGeometry: Partial<MeshLineGeometry>;
    screenSizer: Partial<ScreenSizerProps> & Partial<ThreeElements["object3D"]>;
  }
}
extend({ MeshLineGeometry, MeshLineMaterial });

type ReturnedGLB = Flatten<ReturnType<typeof useGLTF>>;
type RLNode = ReturnedGLB["nodes"][number];
type RLMaterial = ReturnedGLB["materials"][number];
type NodeProps =
  | "clip"
  | "clamp"
  | "details"
  | "name"
  | "pic"
  | "engraving_from"
  | "engraving_lost"
  | "engraving_sign"
  | "engraving_with"
  | "a_restored"
  | "h_bevel"
  | "h_face"
  | "card_corner"
  | "frame"
  | "engraving_star"
  | "card";

type MatProps =
  | "clip_m"
  | "transparent_m"
  | "engraving_from_m"
  | "engraving_lost_m"
  | "engraving_with_m"
  | "engraving_sign_m"
  | "a_restored_m"
  | "h_bevel_m"
  | "h_face_m"
  | "card_corner_m"
  | "frame_m"
  | "card_m"
  | "engraving_sign_m.001";
type PlaqueChildren = Omit<ReturnedGLB, "nodes" | "materials"> & {
  nodes: {
    [x in NodeProps]: RLNode & Mesh;
  };
  materials: {
    [y in MatProps]: RLMaterial & MeshPhysicalMaterial;
  };
};
const TIMEOUT_FIRE_DELAY = 200;
const TRANSITION_DURATION = 0.15; // 150ms
const BATCH_DELAY = 50; // milliseconds
export function Plaque({
  minSpeed = 10,
  maxSpeed = 50,
  name1,
  name2
}: {
  minSpeed?: number;
  maxSpeed?: number;
  name1?: string;
  name2?: string;
}) {
  const { width, height } = useThree((state) => state.size);
  const plaq = useGLTF(`${OBJ_BASE_PATH}/badgeblend.glb`) as PlaqueChildren;
  const band = useRef<
      ThreeElements["mesh"] & {
        geometry: MeshLineGeometry;
        material: MeshLineMaterial;
      }
    >(null!),
    fixed = useRef<RapierRigidBody & { lerped: Vector3 }>(null!),
    j1 = useRef<RapierRigidBody & { lerped: Vector3 }>(null!),
    j2 = useRef<RapierRigidBody & { lerped: Vector3 }>(null!),
    j3 = useRef<RapierRigidBody & { lerped: Vector3 }>(null!),
    card = useRef<RapierRigidBody & Mesh>(null!);

  const vec = useRef(new Vector3()),
    ang = useRef(new Vector3()),
    rot = useRef(new Vector3()),
    dir = useRef(new Vector3());
  const eulerV = useRef(new Euler());
  const segmentProps: {
    type: RigidBodyTypeString;
    canSleep: boolean;
    colliders?: RigidBodyAutoCollider;
    angularDamping: number;
    linearDamping: number;
  } = {
    type: "dynamic",
    canSleep: true,
    colliders: false,
    angularDamping: 2,
    linearDamping: 2
  };
  const bandTexture = useTexture("/assets/three/materials/band/base.png");

  const handler = useCursorHandlers("three");
  const { onPointerOver, onPointerOut } = handler;
  const [curve] = useState(
    () =>
      new CatmullRomCurve3([
        new Vector3(),
        new Vector3(),
        new Vector3(),
        new Vector3()
      ])
  );
  const [dragged, drag] = useState<false | Vector3>(false);
  const [hovered, hover] = useState(false);
  const light = useRef<PointLight>(null!);
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]) // prettier-ignore
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]) // prettier-ignore
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]) // prettier-ignore
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]]) // prettier-ignore
  const spun = useRef(false);
  useEffect(() => {
    setTimeout(() => (spun.current = true), 3500);
  }, []);

  const timePast = useRef(0);
  useFrame((state, delta) => {
    easing.damp3(
      light.current.position,
      [state.pointer.x * 12, 0.1, 8 + state.pointer.y * 4],
      0.2,
      delta
    );

    if (dragged) {
      timePast.current += delta * 100;
      console.log(timePast.current);
      vec.current
        .set(state.pointer.x, state.pointer.y, 0.5)
        .unproject(state.camera);
      dir.current.copy(vec.current).sub(state.camera.position).normalize();
      vec.current.add(
        dir.current.multiplyScalar(state.camera.position.length())
      );
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.current.x - dragged.x,
        y: vec.current.y - dragged.y,
        z: vec.current.z - dragged.z
      });
    }
    if (fixed.current) {
      // Fix most of the jitter when over pulling the card
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped)
          ref.current.lerped = new Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(
          0.1,
          Math.min(1, ref.current.lerped.distanceTo(ref.current.translation()))
        );
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });
      // Calculate catmul curve
      curve?.points?.[0]?.copy(j3.current.translation());
      curve?.points?.[1]?.copy(j2.current.lerped);
      curve?.points?.[2]?.copy(j1.current.lerped);
      curve?.points?.[3]?.copy(fixed.current.translation());
      if (band.current.geometry && "setPoints" in band.current.geometry) {
        band.current.geometry.setPoints(curve.getPoints());
      }
      // Tilt it back towards the screen
      ang.current.copy(card.current.angvel());
      rot.current.copy(card.current.rotation());
      const rr = card.current.rotation();
      let currentYRotation = eulerV.current.setFromQuaternion(
        new Quaternion(rr.x, rr.y, rr.z, rr.w),
        "YXZ"
      ).y;

      // Wrap current rotation to be between -Math.PI and Math.PI
      currentYRotation =
        MathUtils.euclideanModulo(currentYRotation + Math.PI, Math.PI * 2) -
        Math.PI;

      // Determine the target rotation based on the "spun" state
      const targetYRotation =
        (spun.current ? Math.PI : 0) +
        (dragged || !hovered ? 0 : -state.pointer.x * (Math.PI / 3)); // 0 deg if not spun, 180 deg (Math.PI) if spun

      // Calculate the difference to the target rotation
      let angleDifference = targetYRotation - currentYRotation;

      // Wrap the angleDifference to be within -Math.PI to Math.PI for the shortest path
      angleDifference =
        MathUtils.euclideanModulo(angleDifference + Math.PI, Math.PI * 2) -
        Math.PI;

      // Clamp angular velocity for stability
      const maxAngularVelocity = 2; // Adjust for the desired max speed
      const velocityY = Math.max(
        -maxAngularVelocity,
        Math.min(maxAngularVelocity, angleDifference * 5)
      ); // "5" is the rotation speed factor

      card.current.setAngvel(
        { x: ang.current.x, y: velocityY, z: ang.current.z },
        true
      );
      // : card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, false)
    }
  });
  useEffect(() => {
    if (!dragged) {
      if (timePast.current > 20 && timePast.current < 100) {
        spun.current = !spun.current;
      }
      timePast.current = 0;
    }
  }, [dragged]);

  curve.curveType = "catmullrom";
  bandTexture.wrapS = bandTexture.wrapT = RepeatWrapping;

  return (
    <>
      <group
        position={[0, 4, 0]}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, -0.01]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, -0.01]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <Model
            scale={2.25}
            position={[0, -1.2, -0.01]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(
              e: Omit<ThreeEvent<PointerEvent>, "target"> & {
                target: Element;
              }
            ) => (e.target.releasePointerCapture(e.pointerId), drag(false))}
            onPointerDown={(
              e: Omit<ThreeEvent<PointerEvent>, "target"> & {
                target: Element;
              }
            ) => (
              e.target?.setPointerCapture(e.pointerId),
              drag(
                new Vector3()
                  .copy(e.point)
                  .sub(vec.current.copy(card.current.translation()))
              )
            )}
            plaq={plaq}
            name1={name1}
            name2={name2}
          />
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color={new Color().setRGB(144 / 255, 144 / 255, 144 / 255)}
          depthTest={false}
          useMap={1}
          map={bandTexture}
          repeat={new Vector2(-3, 1)}
          resolution={new Vector2(width, height)}
          lineWidth={1}
        />
      </mesh>
      <spotLight
        angle={0.5}
        penumbra={0.5}
        ref={light}
        castShadow={true}
        intensity={10}
        shadow-mapSize={1024}
        shadow-bias={-0.001}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-10, 10, -10, 10, 0.1, 50]}
        />
      </spotLight>
    </>
  );
}
function Model({
  plaq,
  name1,
  name2,
  ...props
}: ThreeElements["group"] & {
  plaq: PlaqueChildren;
  name1?: string;
  name2?: string;
}) {
  const { nodes, materials } = plaq;
  const [firstName, setFirstName] = useState(name1 || "");
  const [lastName, setLastName] = useState(name2 || "");
  useEffect(() => {
    name1 && setFirstName(name1);
    name2 && setLastName(name2);
  }, [name1, name2]);
  // card diffuse

  const textBottomMat = useRef<MeshStandardMaterial>(null!),
    textTopMat = useRef<MeshStandardMaterial>(null!);
  const centerRef = useRef<Group>(null!);
  const boxSizer = useRef(new Box3()),
    boxSizeGetter = useRef(new Vector3());
  const [maxW, setMaxW] = useState(1);
  const [maxH, setMaxH] = useState(1);

  const titaniumNormalMap = useTexture(
    `${materialTexturesPath}/titanium/normal.png`,
    (texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.colorSpace = NoColorSpace;
      texture.anisotropy = 1;
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter;
      const tileScale = 8;
      texture.repeat.set(tileScale, tileScale);
      return texture;
    }
  );
  const titaniumMap = useTexture(
    `${materialTexturesPath}/titanium/displacement.png`,
    (texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 1;
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter;
      const tileScale = 8;
      texture.repeat.set(tileScale, tileScale);
      return texture;
    }
  );
  const titaniumDisMap = useTexture(
    `${materialTexturesPath}/titanium/base.png`,
    (texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.colorSpace = NoColorSpace;
      texture.anisotropy = 1;
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter;
      const tileScale = 8;
      texture.repeat.set(tileScale, tileScale);
      return texture;
    }
  );
  const titaniumAnisoMap = useTexture(
    `${materialTexturesPath}/titanium/aniso.png`,
    (texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.colorSpace = NoColorSpace;
      texture.anisotropy = 1;
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter;
      const tileScale = 8;
      texture.repeat.set(tileScale, tileScale);
      return texture;
    }
  );
  const titaniumHeightMap = useTexture(
    `${materialTexturesPath}/titanium/height.png`,
    (texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.colorSpace = NoColorSpace;
      texture.anisotropy = 1;
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter;
      const tileScale = 8;
      texture.repeat.set(tileScale, tileScale);
      return texture;
    }
  );
  useEffect(() => {
    if (nodes) {
      console.log({ nodes, materials });

      if (nodes["name"]) {
        const size = boxSizer.current
          .setFromObject(nodes["name"])
          .getSize(boxSizeGetter.current);
        const currentW = size.x;
        const currentH = size.y;
        setMaxH(currentH);
        setMaxW(currentW);
      }
    }
  }, [materials, nodes]);

  const to = useRef<ReturnType<typeof setTimeout>>(null!);

  const currentValue = useRef(0); // Opacity or normalized value
  const targetDirection = useRef(false); // true = toward 0, false = toward 1
  const transitioning = useRef(false);
  const queuedDirection = useRef<boolean | null>(null);
  const elapsedTransitionTime = useRef(0);
  const batchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestTransition = useCallback((direction: boolean) => {
    if (batchTimeout.current) clearTimeout(batchTimeout.current);

    batchTimeout.current = setTimeout(() => {
      if (transitioning.current) {
        if (targetDirection.current !== direction) {
          queuedDirection.current = direction;
        }
      } else if (currentValue.current !== (direction ? 0 : 1)) {
        transitioning.current = true;
        elapsedTransitionTime.current = 0;
        targetDirection.current = direction;
      }
    }, BATCH_DELAY);
  }, []);

  const secondTO = useRef<ReturnType<typeof setTimeout>>(null!);
  useEffect(() => {
    if (to.current) {
      clearTimeout(to.current);
    }
    to.current = setTimeout(() => {
      requestTransition(true); // 👈 Trigger fade-out here
      if (secondTO.current) {
        clearTimeout(secondTO.current);
      }
      secondTO.current = setTimeout(() => {
        setSmoothText(upperCase(firstName + " " + lastName));
      }, 150);
    }, TIMEOUT_FIRE_DELAY);
  }, [firstName, lastName, requestTransition]);
  const [smoothText, setSmoothText] = useState(`${firstName} ${lastName}`);
  const textPhysicalMeshProps = useMemo(
    () => ({
      transparent: true,
      anisotropy: 1,
      metalness: 1,
      opacity: 1,
      color: "rgb(144,144,144)",
      sheen: 1,
      anisotropyRotation: 0.66,
      sheenRoughness: 0.4,
      roughness: 0.4
    }),
    []
  );

  const topLayerTextProps = useMemo(
    () => ({
      transparent: true,
      opacity: 1,
      sheenRoughness: 1,
      sheen: 1,
      color: "rgb(11, 11, 11)",
      roughness: 0.3,
      metalness: 1
    }),
    []
  );
  const text3dProps = useMemo(
    () => ({
      bevelEnabled: true,
      bevelSegments: 15,
      depth: 26,
      bevelThickness: 0.1,
      bevelSize: 0.04,
      bevelOffset: 0.001,
      font: FONTFACES.COPPERPLATE.HEAVY,
      size: 0.8,
      height: 1,
      letterSpacing: 0.15
    }),
    []
  );
  useFrame((state, delta) => {
    if (transitioning.current && textTopMat.current) {
      elapsedTransitionTime.current += delta;
      const progress = Math.min(
        elapsedTransitionTime.current / TRANSITION_DURATION,
        1
      );

      // CSS-like 'ease' interpolation
      const easedProgress = cubic.inOut(progress);

      const from = currentValue.current; // 👈 Use current opacity as starting point
      const to = targetDirection.current ? 0 : 1;

      textTopMat.current.opacity = from + (to - from) * easedProgress;
      textBottomMat.current.opacity = from + (to - from) * easedProgress;
      if (progress >= 1) {
        transitioning.current = false;
        elapsedTransitionTime.current = 0;
        currentValue.current = to; // 👈 Update currentValue on completion

        if (
          queuedDirection.current !== null &&
          queuedDirection.current !== targetDirection.current
        ) {
          targetDirection.current = queuedDirection.current;
          queuedDirection.current = null;
          transitioning.current = true;
        }
      }
    }
  });
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.details.geometry}>
        <meshStandardMaterial alphaMap={titaniumHeightMap} />
      </mesh>
      <mesh geometry={nodes.name.geometry}>
        <meshBasicMaterial opacity={0} transparent={true} />
        <Center
          scale={[1, 1, 0.1]}
          rotation={[0, Math.PI, 0]}
          position={[0, 0.37, -0.01]}
          ref={centerRef}
          onCentered={(props: OnCenterCallbackProps) => {
            const { width, height, container } = props;
            const scaleW = maxW / width,
              scaleH = maxH / height;
            const scaleto = Math.min(scaleW, scaleH);
            container.scale.setX(scaleto);
            container.scale.setY(scaleto);
            container.scale.setZ(0.01);
            secondTO.current = setTimeout(() => {
              requestTransition(false); // 👈 Trigger fade-in here
            }, 150);
          }}
        >
          <Text3D {...text3dProps}>
            <meshStandardMaterial
              {...textPhysicalMeshProps}
              color={new Color(144 / 255, 144 / 255, 144 / 255)}
              ref={textTopMat}
            />
            {smoothText}
          </Text3D>
          <Text3D {...text3dProps} height={1.15} bevelEnabled={false}>
            <meshStandardMaterial {...topLayerTextProps} ref={textBottomMat} />
            {smoothText}
          </Text3D>
        </Center>
      </mesh>
      <mesh geometry={nodes.pic.geometry}>
        <meshBasicMaterial opacity={0} transparent={true} />
      </mesh>
      <mesh geometry={nodes.clip.geometry}>
        <meshPhysicalMaterial
          {...(nodes.clip.material as MeshPhysicalMaterial)}
          roughness={0.2}
          metalness={1}
          iridescence={0.3}
          color={new Color(0.1, 0.1, 0.1)}
        />
      </mesh>
      <mesh geometry={nodes.clamp.geometry}>
        <meshPhysicalMaterial
          {...(nodes.clamp.material as MeshPhysicalMaterial)}
          roughness={0.2}
          metalness={1}
          iridescence={0.3}
          color={new Color(0.1, 0.1, 0.1)}
        />
      </mesh>
      <group>
        <mesh geometry={nodes.card.geometry}>
          <meshPhysicalMaterial
            // {...materials.card_m}
            {...(nodes.card.material as MeshPhysicalMaterial)}
            normalMap={titaniumNormalMap}
            // emissiveIntensity={0}
            normalScale={new Vector2(1, 1)}
            metalness={1}
            roughness={0.3}
            iridescence={0.3}
            iridescenceMap={titaniumDisMap}
            roughnessMap={titaniumAnisoMap}
            clearcoat={0}
            displacementMap={titaniumHeightMap}
            displacementScale={45}
            anisotropyMap={titaniumAnisoMap}
            map={titaniumMap}
            anisotropy={1}
            sheen={0.2}
            sheenColor={new Color(0.61, 0.57, 0.54)}
            sheenColorMap={titaniumAnisoMap}
            sheenRoughness={0.1}
            transmission={0}
            color={new Color(0.61, 0.57, 0.54)}
            // map={materials.card_m.map}

            // bumpMap={card_images.bump}
            // map={card_images.color}
          ></meshPhysicalMaterial>
        </mesh>
      </group>
      <mesh geometry={nodes.engraving_from.geometry}>
        <meshPhysicalMaterial {...materials.engraving_from_m} />
      </mesh>
      <mesh geometry={nodes.engraving_lost.geometry}>
        <meshPhysicalMaterial {...materials.engraving_lost_m} />
      </mesh>
      <mesh geometry={nodes.engraving_sign.geometry}>
        <meshPhysicalMaterial {...materials.engraving_sign_m} />
      </mesh>
      <mesh geometry={nodes.engraving_star.geometry}>
        <meshPhysicalMaterial {...materials["engraving_sign_m.001"]} />
      </mesh>
      <mesh geometry={nodes.engraving_with.geometry}>
        <meshPhysicalMaterial {...materials.engraving_with_m} />
      </mesh>
      <mesh geometry={nodes.a_restored.geometry}>
        <meshPhysicalMaterial
          {...materials.a_restored_m}
          normalMap={titaniumNormalMap}
          // emissiveIntensity={0}
          normalScale={new Vector2(1, 1)}
          metalness={1}
          roughness={0.4}
          clearcoat={0}
          anisotropyMap={titaniumAnisoMap}
          map={titaniumMap}
          anisotropy={1}
          transmission={0}
          // bumpMap={frame_images.bump}
          // map={frame_images.color}
        />
      </mesh>
      <mesh geometry={nodes.h_bevel.geometry}>
        <meshPhysicalMaterial
          {...materials.h_bevel_m}
          // bumpMap={frame_images.bump}
          // map={frame_images.color}
        />
      </mesh>
      <mesh geometry={nodes.h_face.geometry}>
        <meshPhysicalMaterial
          {...materials.h_face_m}
          // bumpMap={frame_images.bump}
          // map={frame_images.color}
        />
      </mesh>
      <mesh scale={[1, 0.994, 1]} geometry={nodes.card_corner.geometry}>
        <meshPhysicalMaterial
          {...materials.card_corner_m}
          normalMap={titaniumNormalMap}
          // emissiveIntensity={0}
          normalScale={new Vector2(1, 1)}
          roughness={0.9}
          metalness={1}
          color={new Color(144 / 255, 144 / 255, 144 / 255)}
          roughnessMap={titaniumAnisoMap}
          anisotropyRotation={0.7}
          clearcoat={0}
          displacementMap={titaniumHeightMap}
          displacementScale={100}
          iridescence={0.3}
          iridescenceMap={titaniumDisMap}
          anisotropyMap={titaniumAnisoMap}
          anisotropy={1}
          transmission={0}
        />
      </mesh>
      <mesh geometry={nodes.frame.geometry} scale={[1, 0.994, 1]}>
        <meshPhysicalMaterial
          {...(nodes.frame.material as MeshPhysicalMaterial)}

          // bumpMap={card_images.bump}
          // map={card_images.color}
        ></meshPhysicalMaterial>
      </mesh>
    </group>
  );
}

//frame bump
useTexture.preload(`${materialTexturesPath}/engraving/base.png`);
useTexture.preload(`${materialTexturesPath}/titanium/normal.png`);
useTexture.preload(`${materialTexturesPath}/titanium/roughness.png`);
useTexture.preload(`${materialTexturesPath}/titanium/base.png`);
useTexture.preload(`${materialTexturesPath}/titanium/displacement.png`);
useTexture.preload(`${materialTexturesPath}/titanium/height.png`);
useTexture.preload(`${materialTexturesPath}/titanium/aniso.png`);
useGLTF.preload(`${OBJ_BASE_PATH}/badgeblend.glb`);
