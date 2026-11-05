import type { CategoryKey } from "@/lib/categories";

/** Main gallery room, in metres. */
export const ROOM = { width: 24, length: 30, height: 7 } as const;
export const HALF_W = ROOM.width / 2; // 12
export const HALF_L = ROOM.length / 2; // 15

export const EYE_HEIGHT = 1.65;
export const ART_CENTER_Y = 2.05;

export const PARTITION = { x: 0, zMin: -5.4, zMax: 5.4, thickness: 0.4, height: 4.2 } as const;

export type Slot = {
  id: string;
  category: CategoryKey;
  /** Centre of the artwork on the wall surface. */
  position: [number, number, number];
  /** Rotation around Y so that the artwork faces into the room. */
  rotationY: number;
  maxW: number;
  maxH: number;
  featured?: boolean;
  /** Base slots show an empty frame while waiting for artwork; extra slots appear only when filled. */
  base?: boolean;
};

const FACE_POS_X = Math.PI / 2; // faces +x
const FACE_NEG_X = -Math.PI / 2; // faces -x
const FACE_POS_Z = 0;

const WALL_INSET = 0.06; // distance the display panel sits from the wall surface

function wallSlots(
  category: CategoryKey,
  prefix: string,
  x: number,
  zs: number[],
  rotationY: number,
  size = 1.8,
  y = ART_CENTER_Y,
  base = false,
): Slot[] {
  return zs.map((z, i) => ({
    id: `${prefix}-${i + 1}`,
    category,
    position: [x, y, z],
    rotationY,
    maxW: size,
    maxH: size,
    base,
  }));
}

/** Freestanding feature walls for Cyber Heroes (centre + two angled wings). */
export const HERO_WALLS = [
  { position: [0, 0, -9.3] as [number, number, number], rotationY: 0 },
  { position: [-3.7, 0, -8.35] as [number, number, number], rotationY: Math.PI / 6 },
  { position: [3.7, 0, -8.35] as [number, number, number], rotationY: -Math.PI / 6 },
];
export const HERO_WALL_SIZE = { width: 3.0, height: 3.9, thickness: 0.3 } as const;

/** Freestanding double-sided walls in the middle of Areas 02 and 03 (more hanging space). */
export const MID_WALLS = [
  { x: -6, zMin: -4.2, zMax: 4.2 },
  { x: 6, zMin: -4.2, zMax: 4.2 },
];
export const MID_WALL_SIZE = { thickness: 0.3, height: 3.6 } as const;

const sideWallZ = [6.9, 4.5, 2.1, -0.3, -2.7, -5.1];
const partitionZ = [4.3, 2.15, 0, -2.15, -4.3];
const midWallZ = [3.15, 1.05, -1.05, -3.15];
const pFace = PARTITION.thickness / 2 + WALL_INSET;
const mFace = MID_WALL_SIZE.thickness / 2 + WALL_INSET;
const UPPER_Y = 4.05;

/**
 * Hanging order within each area: frames are filled from the first slot to the last.
 * Digital Privacy / Think Before You Post: 25 frames each. Cyber Heroes: 13 frames.
 */
function sideArea(category: CategoryKey, p: string, side: -1 | 1): Slot[] {
  const outerX = side * (HALF_W - WALL_INSET);
  const outerFace = side === -1 ? FACE_POS_X : FACE_NEG_X;
  const midX = side * 6;
  return [
    ...wallSlots(category, `${p}-wall`, outerX, sideWallZ, outerFace, 1.8, ART_CENTER_Y, true),
    ...wallSlots(category, `${p}-part`, PARTITION.x + side * pFace, partitionZ, side === -1 ? FACE_NEG_X : FACE_POS_X, 1.7, ART_CENTER_Y, true),
    // middle wall: face toward the centre partition, then face toward the outer wall
    ...wallSlots(category, `${p}-mid-in`, midX - side * mFace, midWallZ, side === -1 ? FACE_POS_X : FACE_NEG_X, 1.6),
    ...wallSlots(category, `${p}-mid-out`, midX + side * mFace, midWallZ, outerFace === FACE_POS_X ? FACE_NEG_X : FACE_POS_X, 1.6),
    // upper row on the long outer wall (salon hang), used only when an area is very full
    ...wallSlots(category, `${p}-upper`, outerX, sideWallZ, outerFace, 1.25, UPPER_Y),
  ];
}

export const SLOTS: Slot[] = [
  // AREA 02 — Digital Privacy (left side of the room)
  ...sideArea("digital_privacy", "dp", -1),
  // AREA 03 — Think Before You Post (right side of the room)
  ...sideArea("think_before_you_post", "tp", 1),
  // AREA 04 — Cyber Heroes: featured arc of freestanding walls, rear side walls, then back-wall flanks
  { id: "ch-arc-1", category: "cyber_heroes", position: [0, ART_CENTER_Y + 0.15, -9.3 + 0.16], rotationY: FACE_POS_Z, maxW: 2.2, maxH: 2.2, featured: true, base: true },
  ...arcSlot("ch-arc-2", -1),
  ...arcSlot("ch-arc-3", 1),
  ...wallSlots("cyber_heroes", "ch-wall-l", -HALF_W + WALL_INSET, [-7.2, -9.5, -11.8], FACE_POS_X, 1.8, ART_CENTER_Y, true).map((s) => ({ ...s, featured: true })),
  ...wallSlots("cyber_heroes", "ch-wall-r", HALF_W - WALL_INSET, [-7.2, -9.5, -11.8], FACE_NEG_X, 1.8, ART_CENTER_Y, true).map((s) => ({ ...s, featured: true })),
  ...[-10.1, -7.3, 7.3, 10.1].map((x, i) => ({
    id: `ch-back-${i + 1}`,
    category: "cyber_heroes" as CategoryKey,
    position: [x, ART_CENTER_Y, -HALF_L + WALL_INSET] as [number, number, number],
    rotationY: FACE_POS_Z,
    maxW: 1.8,
    maxH: 1.8,
    featured: true,
  })),
];

function arcSlot(id: string, side: -1 | 1): Slot[] {
  const w = HERO_WALLS[side === -1 ? 1 : 2];
  const offset = HERO_WALL_SIZE.thickness / 2 + 0.01;
  const rot = w.rotationY;
  return [
    {
      id,
      category: "cyber_heroes",
      position: [w.position[0] + Math.sin(rot) * offset, ART_CENTER_Y + 0.15, w.position[2] + Math.cos(rot) * offset],
      rotationY: rot,
      maxW: 2.0,
      maxH: 2.2,
      featured: true,
      base: true,
    },
  ];
}

export const SLOT_CAPACITY: Record<CategoryKey, number> = {
  digital_privacy: SLOTS.filter((s) => s.category === "digital_privacy").length,
  think_before_you_post: SLOTS.filter((s) => s.category === "think_before_you_post").length,
  cyber_heroes: SLOTS.filter((s) => s.category === "cyber_heroes").length,
};

/** Axis-aligned obstacles visitors cannot walk through: [minX, maxX, minZ, maxZ]. */
export const OBSTACLES: [number, number, number, number][] = [
  [PARTITION.x - PARTITION.thickness / 2, PARTITION.x + PARTITION.thickness / 2, PARTITION.zMin, PARTITION.zMax],
  ...MID_WALLS.map((w) => [w.x - MID_WALL_SIZE.thickness / 2, w.x + MID_WALL_SIZE.thickness / 2, w.zMin, w.zMax] as [number, number, number, number]),
  // entrance arch pillars
  [-5.6, -4.6, 7.6, 8.4],
  [4.6, 5.6, 7.6, 8.4],
  // hero walls (approximate boxes)
  [-1.5, 1.5, -9.45, -9.15],
  [-5.0, -2.4, -9.2, -7.5],
  [2.4, 5.0, -9.2, -7.5],
];

export const VISITOR_RADIUS = 0.45;

export type AreaStop = { id: string; label: string; short: string; position: [number, number]; yaw: number };

/** Positions the "Jump to area" menu moves the visitor to. yaw: 0 looks toward -z. */
export const AREA_STOPS: AreaStop[] = [
  { id: "a1", short: "01", label: "Welcome Entrance", position: [0, 14.2], yaw: 0 },
  { id: "a2", short: "02", label: "Digital Privacy", position: [-3.1, 0], yaw: Math.PI / 2 },
  { id: "a3", short: "03", label: "Think Before You Post", position: [3.1, 0], yaw: -Math.PI / 2 },
  { id: "a4", short: "04", label: "Cyber Heroes", position: [0, -6.1], yaw: 0 },
  { id: "a5", short: "05", label: "Closing", position: [0, -10.3], yaw: 0 },
];
