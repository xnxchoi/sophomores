"use client";

import { Environment, Lightformer, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  makeTicketBackTexture,
  makeTicketRoughness,
  makeTicketTexture,
  type TicketTextureInput
} from "./makeTicketTexture";

export interface TicketMeshProps extends TicketTextureInput {
  pointer: { x: number; y: number };
  pointerActive: boolean;
  /** When false, all input-driven motion is suppressed and the mesh idles. */
  interactive: boolean;
  /** True → ticket rotates 180° around Y to present the back face. */
  flipped: boolean;
  cameraActive: boolean;
}

const TICKET_W = 4.6;
const TICKET_H = 2.3;
const TICKET_D = 0.06;
const STUB_OFFSET = 0.6;
const NOTCH_R = 0.07;
const BEVEL_THICKNESS = 0.008;
// Front/back planes must clear the body's BEVEL extrusion (which extends
// the geometry past ±D/2 by bevelThickness). With offset > bevelThickness,
// the planes sit in front of the bevelled cap and aren't occluded.
const PLANE_OFFSET = BEVEL_THICKNESS + 0.006;

/**
 * Counter-clockwise outer perimeter for the ticket silhouette: a
 * rectangle with two inward semicircular notches at the perforation x.
 * Used both for the ExtrudeGeometry body and the flat ShapeGeometry
 * planes that carry the front/back textures.
 */
function buildTicketShape(): THREE.Shape {
  const w2 = TICKET_W / 2;
  const h2 = TICKET_H / 2;
  const px = STUB_OFFSET;

  const shape = new THREE.Shape();
  shape.moveTo(-w2, h2);
  shape.lineTo(-w2, -h2);
  shape.lineTo(px - NOTCH_R, -h2);
  shape.absarc(px, -h2, NOTCH_R, Math.PI, 0, true);
  shape.lineTo(w2, -h2);
  shape.lineTo(w2, h2);
  shape.lineTo(px + NOTCH_R, h2);
  shape.absarc(px, h2, NOTCH_R, 0, Math.PI, true);
  shape.lineTo(-w2, h2);
  return shape;
}

/**
 * Remap a flat ShapeGeometry's UVs so the texture maps [0, 1] across the
 * shape's bounding box. ShapeGeometry's default UVs use world coordinates
 * — we want bbox-normalised so the canvas texture lines up regardless of
 * the shape's actual position.
 */
function remapShapeUVs(geom: THREE.ShapeGeometry): void {
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const sx = bb.max.x - bb.min.x;
  const sy = bb.max.y - bb.min.y;
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv.setXY(i, (x - bb.min.x) / sx, (y - bb.min.y) / sy);
  }
  uv.needsUpdate = true;
}

export function TicketMesh({
  eventName,
  ticketNumber,
  date,
  location,
  pointer,
  pointerActive,
  interactive,
  flipped,
  cameraActive
}: TicketMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  // ── Geometry ───────────────────────────────────────────────────────────
  const { bodyGeom, faceGeom } = useMemo(() => {
    const shape = buildTicketShape();
    const body = new THREE.ExtrudeGeometry(shape, {
      depth: TICKET_D,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.012,
      bevelThickness: BEVEL_THICKNESS,
      curveSegments: 16
    });
    body.translate(0, 0, -TICKET_D / 2);
    body.computeVertexNormals();

    const face = new THREE.ShapeGeometry(shape, 16);
    remapShapeUVs(face);
    return { bodyGeom: body, faceGeom: face };
  }, []);

  useEffect(() => {
    return () => {
      bodyGeom.dispose();
      faceGeom.dispose();
    };
  }, [bodyGeom, faceGeom]);

  // ── Textures ───────────────────────────────────────────────────────────
  const frontTexture = useMemo(
    () => makeTicketTexture({ eventName, ticketNumber, date, location }),
    [eventName, ticketNumber, date, location]
  );
  const backTexture = useMemo(
    () => makeTicketBackTexture({ eventName, ticketNumber, date, location }),
    [eventName, ticketNumber, date, location]
  );
  const roughnessMap = useMemo(() => makeTicketRoughness(), []);

  useEffect(() => {
    return () => {
      frontTexture.dispose();
      backTexture.dispose();
      roughnessMap.dispose();
    };
  }, [frontTexture, backTexture, roughnessMap]);

  // ── Animation ──────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    // Idle wobble — quieter when not interactive (multi-instance views).
    const idleScale = interactive ? 1 : 0.4;
    const wobbleX = Math.sin(t * 0.45) * 0.035 * idleScale;
    const wobbleY = Math.sin(t * 0.6) * 0.06 * idleScale;

    const tiltScale = interactive && pointerActive ? 1 : 0;
    const tiltX = -pointer.y * 0.25 * tiltScale;
    const tiltY = pointer.x * 0.45 * tiltScale;

    const flipBase = flipped ? Math.PI : 0;

    g.rotation.x = THREE.MathUtils.damp(
      g.rotation.x,
      wobbleX + tiltX,
      6,
      delta
    );
    g.rotation.y = THREE.MathUtils.damp(
      g.rotation.y,
      wobbleY + tiltY + flipBase,
      4.8,
      delta
    );
  });

  return (
    <>
      {/* Each <View> needs its own camera — the project's shared Canvas
          uses an OrthographicCamera with the default −1..1 frustum, which
          would clip the ticket entirely. Pulled back to z=4.8 with fov=30
          so the wobble + tilt extremes never push the ticket off-screen. */}
      <PerspectiveCamera
        makeDefault={cameraActive}
        fov={30}
        position={[0, 0, 4.8]}
        near={0.1}
        far={50}
      />

      {/* Image-based lighting — drives the iridescent shimmer. */}
      <Environment resolution={512} background={false}>
        <Lightformer
          intensity={2.6}
          color="#ffffff"
          position={[0, 5, -6]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[10, 10, 1]}
        />
        <Lightformer
          intensity={1.8}
          color="#b8a8ff"
          position={[-5, 1, 1]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[12, 1, 1]}
        />
        <Lightformer
          intensity={1.8}
          color="#a0e0ff"
          position={[5, -1, 1]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[12, 1, 1]}
        />
        <Lightformer
          intensity={1.0}
          color="#ffe0d8"
          position={[0, -5, 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[8, 8, 1]}
        />
      </Environment>

      <ambientLight intensity={0.32} />

      <group ref={groupRef}>
        {/*
          Body — extruded silhouette providing thickness, sides, and the
          bevelled edges that catch light. No texture map; the front/back
          planes carry the printed surface. The slight z-offset of those
          planes prevents z-fighting with this body's caps.
        */}
        <mesh geometry={bodyGeom}>
          <meshPhysicalMaterial
            roughnessMap={roughnessMap}
            color="#f4ece0"
            roughness={0.55}
            metalness={0.05}
            clearcoat={0.55}
            clearcoatRoughness={0.32}
            iridescence={0.85}
            iridescenceIOR={1.45}
            iridescenceThicknessRange={[200, 1400]}
            envMapIntensity={0.95}
          />
        </mesh>

        {/* Front face — ShapeGeometry plane with the front canvas texture. */}
        <mesh
          geometry={faceGeom}
          position={[0, 0, TICKET_D / 2 + PLANE_OFFSET]}
        >
          <meshPhysicalMaterial
            map={frontTexture}
            roughnessMap={roughnessMap}
            color="#ffffff"
            roughness={0.55}
            metalness={0.05}
            clearcoat={0.55}
            clearcoatRoughness={0.32}
            iridescence={0.85}
            iridescenceIOR={1.45}
            iridescenceThicknessRange={[200, 1400]}
            envMapIntensity={0.95}
            side={THREE.FrontSide}
          />
        </mesh>

        {/*
          Back face — same ShapeGeometry, rotated 180° around Y so its
          normal points -Z. It renders only when the camera is looking at
          the back (i.e. after the user flips the ticket).
        */}
        <mesh
          geometry={faceGeom}
          position={[0, 0, -TICKET_D / 2 - PLANE_OFFSET]}
          rotation={[0, Math.PI, 0]}
        >
          <meshPhysicalMaterial
            map={backTexture}
            roughnessMap={roughnessMap}
            color="#ffffff"
            roughness={0.55}
            metalness={0.05}
            clearcoat={0.55}
            clearcoatRoughness={0.32}
            iridescence={0.85}
            iridescenceIOR={1.45}
            iridescenceThicknessRange={[200, 1400]}
            envMapIntensity={0.95}
            side={THREE.FrontSide}
          />
        </mesh>
      </group>
    </>
  );
}
