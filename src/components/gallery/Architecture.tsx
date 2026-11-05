"use client";

import { Text, useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import {
  HALF_L,
  HALF_W,
  HERO_WALLS,
  HERO_WALL_SIZE,
  MID_WALLS,
  MID_WALL_SIZE,
  PARTITION,
  ROOM,
} from "./layout";
import { goTo } from "./navStore";
import { makeConcreteTexture, makeWallTexture } from "./textures";
import { isWalkable } from "./VisitorControls";

export const COLORS = {
  teal: "#03656B",
  tealDark: "#024a4f",
  green: "#02D576",
  sky: "#00CEFA",
  sun: "#FECC56",
  coral: "#FF7449",
  purple: "#844FC7",
  white: "#FFFFFF",
};

export const FONT_BOLD = "/fonts/poppins-latin-700-normal.woff";
export const FONT_SEMI = "/fonts/poppins-latin-600-normal.woff";
export const FONT_MED = "/fonts/poppins-latin-500-normal.woff";

const LOGO_ASPECT = 2907 / 879;

function useWallMaterial() {
  return useMemo(() => {
    const bump = makeWallTexture();
    bump.repeat.set(6, 2);
    return new THREE.MeshStandardMaterial({
      color: COLORS.teal,
      roughness: 0.88,
      metalness: 0,
      bumpMap: bump,
      bumpScale: 0.6,
    });
  }, []);
}

export function Room() {
  const floorTex = useTexture("/brand/floor-texture.png", (t) => {
    const tex = t as THREE.Texture;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    // texture image is 1213 x 564 px: one tile ≈ 6.45 m x 3 m (keeps the pattern proportions)
    tex.repeat.set(ROOM.width / 6.45, ROOM.length / 3);
  });
  const concrete = useMemo(() => {
    const t = makeConcreteTexture();
    t.repeat.set(ROOM.width / 6, ROOM.length / 6);
    return t;
  }, []);
  const wallMat = useWallMaterial();

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // it was a drag-to-look, not a tap
    e.stopPropagation();
    const { x, z } = e.point;
    if (isWalkable(x, z)) goTo({ x, z });
  };

  return (
    <group>
      {/* Floor — custom school pattern texture, white base colour so the texture shows true */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={onFloorClick}>
        <planeGeometry args={[ROOM.width, ROOM.length]} />
        <meshStandardMaterial map={floorTex} color={COLORS.white} roughness={0.42} metalness={0.05} envMapIntensity={0.6} />
      </mesh>

      {/* Ceiling — industrial concrete */}
      <mesh rotation-x={Math.PI / 2} position-y={ROOM.height}>
        <planeGeometry args={[ROOM.width, ROOM.length]} />
        <meshStandardMaterial map={concrete} roughness={0.95} color="#d7d7d2" />
      </mesh>
      <CeilingStructure />

      {/* Walls */}
      <mesh position={[0, ROOM.height / 2, -HALF_L]} material={wallMat} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
      </mesh>
      <mesh position={[0, ROOM.height / 2, HALF_L]} rotation-y={Math.PI} material={wallMat} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
      </mesh>
      <mesh position={[-HALF_W, ROOM.height / 2, 0]} rotation-y={Math.PI / 2} material={wallMat} receiveShadow>
        <planeGeometry args={[ROOM.length, ROOM.height]} />
      </mesh>
      <mesh position={[HALF_W, ROOM.height / 2, 0]} rotation-y={-Math.PI / 2} material={wallMat} receiveShadow>
        <planeGeometry args={[ROOM.length, ROOM.height]} />
      </mesh>

      <Baseboards />

      {/* Central double-sided partition between Areas 02 and 03 */}
      <mesh
        position={[PARTITION.x, PARTITION.height / 2, (PARTITION.zMin + PARTITION.zMax) / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[PARTITION.thickness, PARTITION.height, PARTITION.zMax - PARTITION.zMin]} />
      </mesh>
      {/* white cap on the partition */}
      <mesh position={[PARTITION.x, PARTITION.height + 0.02, (PARTITION.zMin + PARTITION.zMax) / 2]}>
        <boxGeometry args={[PARTITION.thickness + 0.04, 0.04, PARTITION.zMax - PARTITION.zMin + 0.04]} />
        <meshStandardMaterial color={COLORS.white} roughness={0.5} />
      </mesh>

      {/* Cyber Heroes feature walls */}
      {HERO_WALLS.map((w, i) => (
        <group key={i} position={w.position} rotation-y={w.rotationY}>
          <mesh position-y={HERO_WALL_SIZE.height / 2} castShadow receiveShadow>
            <boxGeometry args={[HERO_WALL_SIZE.width, HERO_WALL_SIZE.height, HERO_WALL_SIZE.thickness]} />
            <meshStandardMaterial color={COLORS.white} roughness={0.7} />
          </mesh>
          {/* accent stripe at the base */}
          <mesh position={[0, 0.06, HERO_WALL_SIZE.thickness / 2 + 0.002]}>
            <planeGeometry args={[HERO_WALL_SIZE.width, 0.12]} />
            <meshStandardMaterial color={COLORS.green} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.06, -HERO_WALL_SIZE.thickness / 2 - 0.002]} rotation-y={Math.PI}>
            <planeGeometry args={[HERO_WALL_SIZE.width, 0.12]} />
            <meshStandardMaterial color={COLORS.green} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* low platform under the heroes arc */}
      <mesh position={[0, 0.04, -9.8]} receiveShadow>
        <cylinderGeometry args={[4.4, 4.4, 0.08, 64, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#f4f7f7" roughness={0.55} />
      </mesh>
    </group>
  );
}

/** Freestanding double-sided teal walls in Areas 02 and 03. */
export function MidWalls() {
  const wallMat = useWallMaterial();
  return (
    <group>
      {MID_WALLS.map((w) => (
        <group key={w.x}>
          <mesh position={[w.x, MID_WALL_SIZE.height / 2, (w.zMin + w.zMax) / 2]} castShadow receiveShadow material={wallMat}>
            <boxGeometry args={[MID_WALL_SIZE.thickness, MID_WALL_SIZE.height, w.zMax - w.zMin]} />
          </mesh>
          <mesh position={[w.x, MID_WALL_SIZE.height + 0.02, (w.zMin + w.zMax) / 2]}>
            <boxGeometry args={[MID_WALL_SIZE.thickness + 0.04, 0.04, w.zMax - w.zMin + 0.04]} />
            <meshStandardMaterial color={COLORS.white} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Baseboards() {
  const h = 0.14;
  const t = 0.03;
  const mat = <meshStandardMaterial color={COLORS.white} roughness={0.5} />;
  return (
    <group>
      <mesh position={[0, h / 2, -HALF_L + t / 2]}>
        <boxGeometry args={[ROOM.width, h, t]} />
        {mat}
      </mesh>
      <mesh position={[0, h / 2, HALF_L - t / 2]}>
        <boxGeometry args={[ROOM.width, h, t]} />
        {mat}
      </mesh>
      <mesh position={[-HALF_W + t / 2, h / 2, 0]}>
        <boxGeometry args={[t, h, ROOM.length]} />
        {mat}
      </mesh>
      <mesh position={[HALF_W - t / 2, h / 2, 0]}>
        <boxGeometry args={[t, h, ROOM.length]} />
        {mat}
      </mesh>
    </group>
  );
}

/** Exposed concrete beams and lighting tracks — the "industrial" ceiling. */
function CeilingStructure() {
  const beams = [-10, -5, 0, 5, 10];
  const tracks = [-9.6, -2.4, 2.4, 9.6];
  return (
    <group>
      {beams.map((z) => (
        <mesh key={z} position={[0, ROOM.height - 0.25, z]} castShadow>
          <boxGeometry args={[ROOM.width, 0.5, 0.45]} />
          <meshStandardMaterial color="#b9b9b4" roughness={0.95} />
        </mesh>
      ))}
      {tracks.map((x) => (
        <mesh key={x} position={[x, ROOM.height - 0.55, 0]}>
          <boxGeometry args={[0.06, 0.05, ROOM.length - 0.4]} />
          <meshStandardMaterial color="#2b2f30" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function Logo({ width, position, rotationY = 0 }: { width: number; position: [number, number, number]; rotationY?: number }) {
  const tex = useTexture("/brand/logo.png", (t) => {
    const tx = t as THREE.Texture;
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
  });
  return (
    <mesh position={position} rotation-y={rotationY}>
      <planeGeometry args={[width, width / LOGO_ASPECT]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

/** A clean white wall panel with text, used for section titles and messages. */
function Panel({
  width,
  height,
  position,
  rotationY = 0,
  color = COLORS.white,
  depth = 0.05,
}: {
  width: number;
  height: number;
  position: [number, number, number];
  rotationY?: number;
  color?: string;
  depth?: number;
}) {
  return (
    <mesh position={position} rotation-y={rotationY} receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} roughness={0.75} emissive={color} emissiveIntensity={0.28} />
    </mesh>
  );
}

/** AREA 01 — Welcome entrance: an illuminated arch with the school logo and exhibition title. */
export function Entrance() {
  const archZ = 8.0;
  const pillarX = 5.1;
  return (
    <group>
      {/* pillars */}
      {[-pillarX, pillarX].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.875, archZ]} castShadow receiveShadow>
            <boxGeometry args={[1.0, 3.75, 0.8]} />
            <meshStandardMaterial color={COLORS.white} roughness={0.6} />
          </mesh>
          {/* green light line on the inner face */}
          <mesh position={[x - Math.sign(x) * 0.501, 1.875, archZ]} rotation-y={(Math.sign(x) * -Math.PI) / 2}>
            <planeGeometry args={[0.08, 3.5]} />
            <meshStandardMaterial color={COLORS.green} emissive={COLORS.green} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* header */}
      <mesh position={[0, 4.4, archZ]} castShadow>
        <boxGeometry args={[11.2, 1.3, 0.8]} />
        <meshStandardMaterial color={COLORS.white} roughness={0.6} />
      </mesh>
      <Text
        font={FONT_BOLD}
        position={[0, 4.55, archZ + 0.41]}
        fontSize={0.5}
        letterSpacing={0.08}
        color={COLORS.teal}
        anchorX="center"
        anchorY="middle"
      >
        CYBER SAFETY GALLERY
      </Text>
      <Text font={FONT_MED} position={[0, 4.03, archZ + 0.41]} fontSize={0.2} letterSpacing={0.18} color={COLORS.green} anchorX="center" anchorY="middle">
        AREA 01 · WELCOME ENTRANCE
      </Text>
      {/* back of header, readable when walking out */}
      <Text font={FONT_BOLD} position={[0, 4.4, archZ - 0.41]} rotation-y={Math.PI} fontSize={0.36} letterSpacing={0.08} color={COLORS.teal} anchorX="center" anchorY="middle">
        THANK YOU FOR VISITING
      </Text>

      {/* Left entrance wall: logo + welcome message */}
      <Panel width={6.2} height={3.6} position={[-HALF_W + 0.03, 2.9, 11.6]} rotationY={Math.PI / 2} />
      <Logo width={4.6} position={[-HALF_W + 0.06, 3.65, 11.6]} rotationY={Math.PI / 2} />
      <Text
        font={FONT_SEMI}
        position={[-HALF_W + 0.07, 2.2, 11.6]}
        rotation-y={Math.PI / 2}
        fontSize={0.24}
        maxWidth={5.2}
        lineHeight={1.35}
        textAlign="center"
        color={COLORS.teal}
        anchorX="center"
        anchorY="middle"
      >
        {"Welcome to the Cyber Safety Gallery —\nProtect your personal information"}
      </Text>
      <mesh position={[-HALF_W + 0.07, 1.45, 11.6]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.2, 0.05]} />
        <meshBasicMaterial color={COLORS.green} />
      </mesh>

      {/* Right entrance wall: about the exhibition */}
      <Panel width={6.2} height={3.6} position={[HALF_W - 0.03, 2.9, 11.6]} rotationY={-Math.PI / 2} />
      <Text font={FONT_MED} position={[HALF_W - 0.07, 4.15, 11.6]} rotation-y={-Math.PI / 2} fontSize={0.17} letterSpacing={0.2} color={COLORS.green} anchorX="center">
        CYBERSECURITY AWARENESS MONTH
      </Text>
      <Text font={FONT_BOLD} position={[HALF_W - 0.07, 3.55, 11.6]} rotation-y={-Math.PI / 2} fontSize={0.38} color={COLORS.teal} anchorX="center">
        About the Exhibition
      </Text>
      <Text
        font={FONT_MED}
        position={[HALF_W - 0.07, 2.35, 11.6]}
        rotation-y={-Math.PI / 2}
        fontSize={0.19}
        maxWidth={5.0}
        lineHeight={1.5}
        textAlign="center"
        color="#24494b"
        anchorX="center"
        anchorY="middle"
      >
        {
          "Original artwork by students of The Riyadh Schools – Al Malqa, exploring digital safety, online privacy and responsible digital behaviour. Walk through the gallery and click any artwork to see it up close."
        }
      </Text>

      {/* Wall behind the visitor at the start */}
      <Panel width={9} height={2.6} position={[0, 3.6, HALF_L - 0.03]} rotationY={Math.PI} />
      <Logo width={6.6} position={[0, 3.6, HALF_L - 0.06]} rotationY={Math.PI} />
    </group>
  );
}

/** Two-sided sign hanging from the ceiling, for wayfinding. */
export function HangingSign({
  position,
  rotationY = 0,
  number,
  title,
  theme,
  accent,
}: {
  position: [number, number, number];
  rotationY?: number;
  number: string;
  title: string;
  theme: string;
  accent: string;
}) {
  const w = 4.6;
  const h = 1.15;
  const face = (side: 1 | -1) => (
    <group rotation-y={side === 1 ? 0 : Math.PI} position-z={side * 0.031}>
      <mesh position={[-w / 2 + 0.06, 0, 0.001]}>
        <planeGeometry args={[0.12, h]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <Text font={FONT_MED} position={[-w / 2 + 0.35, 0.3, 0.002]} fontSize={0.15} letterSpacing={0.2} color={COLORS.green} anchorX="left" anchorY="middle">
        {`AREA ${number}`}
      </Text>
      <Text font={FONT_BOLD} position={[-w / 2 + 0.35, 0.0, 0.002]} fontSize={0.32} color={COLORS.teal} anchorX="left" anchorY="middle" maxWidth={w - 0.5}>
        {title.toUpperCase()}
      </Text>
      <Text font={FONT_MED} position={[-w / 2 + 0.35, -0.3, 0.002]} fontSize={0.14} color="#3d6466" anchorX="left" anchorY="middle">
        {theme}
      </Text>
    </group>
  );
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh>
        <boxGeometry args={[w, h, 0.06]} />
        <meshStandardMaterial color={COLORS.white} roughness={0.6} />
      </mesh>
      {face(1)}
      {face(-1)}
      {/* suspension cables */}
      {[-w / 2 + 0.3, w / 2 - 0.3].map((x) => (
        <mesh key={x} position={[x, (7 - position[1]) / 2 + h / 4, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 7 - position[1] - h / 2, 4]} />
          <meshBasicMaterial color="#2b2f30" />
        </mesh>
      ))}
    </group>
  );
}

/** Large section title painted on a wall above the artwork. */
export function WallTitle({
  position,
  rotationY,
  number,
  title,
  theme,
}: {
  position: [number, number, number];
  rotationY: number;
  number: string;
  title: string;
  theme: string;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Text font={FONT_MED} position={[0, 0.55, 0]} fontSize={0.2} letterSpacing={0.24} color={COLORS.green} anchorX="center">
        {`AREA ${number}`}
      </Text>
      <Text font={FONT_BOLD} position={[0, 0.05, 0]} fontSize={0.55} letterSpacing={0.04} color={COLORS.white} anchorX="center" anchorY="middle">
        {title.toUpperCase()}
      </Text>
      <Text font={FONT_MED} position={[0, -0.45, 0]} fontSize={0.2} color="#cfe6e7" anchorX="center">
        {theme}
      </Text>
    </group>
  );
}

/** AREA 05 — Closing wall with the closing message and school logo. */
export function Closing() {
  const z = -HALF_L + 0.03;
  return (
    <group>
      <Panel width={11.5} height={4.1} position={[0, 3.25, z]} />
      <Text font={FONT_MED} position={[0, 4.92, z + 0.04]} fontSize={0.17} letterSpacing={0.26} color={COLORS.green} anchorX="center" anchorY="middle">
        AREA 05 · CLOSING
      </Text>
      <Text font={FONT_BOLD} position={[0, 4.3, z + 0.04]} fontSize={0.5} color={COLORS.teal} anchorX="center" anchorY="middle" maxWidth={11}>
        Stay Safe. Stay Smart.
      </Text>
      <Text font={FONT_BOLD} position={[0, 3.66, z + 0.04]} fontSize={0.5} color={COLORS.green} anchorX="center" anchorY="middle" maxWidth={11}>
        Stay Cyber Aware.
      </Text>
      <mesh position={[0, 3.18, z + 0.04]}>
        <planeGeometry args={[1.2, 0.045]} />
        <meshBasicMaterial color={COLORS.sun} />
      </mesh>
      <Logo width={3.4} position={[0, 2.38, z + 0.05]} />
      {/* small accent squares, a nod to the floor pattern */}
      {[COLORS.sky, COLORS.green, COLORS.sun, COLORS.coral, COLORS.purple].map((c, i) => (
        <mesh key={c} position={[-0.64 + i * 0.32, 1.48, z + 0.04]} rotation-z={Math.PI / 4}>
          <planeGeometry args={[0.14, 0.14]} />
          <meshBasicMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}
