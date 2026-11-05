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
  size = 1.9,
): Slot[] {
  return zs.map((z, i) => ({
    id: `${prefix}-${i + 1}`,
    category,
    position: [x, ART_CENTER_Y, z],
    rotationY,
    maxW: size,
    maxH: size,
  }));
}

/** Freestanding feature walls for Cyber Heroes (centre + two angled wings). */
export const HERO_WALLS = [
  { position: [0, 0, -9.3] as [number, number, number], rotationY: 0 },
  { position: [-3.7, 0, -8.35] as [number, number, number], rotationY: Math.PI / 6 },
  { position: [3.7, 0, -8.35] as [number, number, number], rotationY: -Math.PI / 6 },
];
export const HERO_WALL_SIZE = { width: 3.0, height: 3.9, thickness: 0.3 } as const;

const sideWallZ = [6.4, 3.8, 1.2, -1.4, -4.0];
const partitionZ = [4.05, 1.35, -1.35, -4.05];
const pFace = PARTITION.thickness / 2 + WALL_INSET;

export const SLOTS: Slot[] = [
  // AREA 02 — Digital Privacy (left side of the room)
  ...wallSlots("digital_privacy", "dp-wall", -HALF_W + WALL_INSET, sideWallZ, FACE_POS_X),
  ...wallSlots("digital_privacy", "dp-part", PARTITION.x - pFace, partitionZ, FACE_NEG_X),
  // AREA 03 — Think Before You Post (right side of the room)
  ...wallSlots("think_before_you_post", "tp-wall", HALF_W - WALL_INSET, sideWallZ, FACE_NEG_X),
  ...wallSlots("think_before_you_post", "tp-part", PARTITION.x + pFace, partitionZ, FACE_POS_X),
  // AREA 04 — Cyber Heroes: a featured arc of freestanding walls plus the rear side walls
  { id: "ch-arc-1", category: "cyber_heroes", position: [0, ART_CENTER_Y + 0.15, -9.3 + 0.16], rotationY: FACE_POS_Z, maxW: 2.2, maxH: 2.2, featured: true },
  ...arcSlot("ch-arc-2", -1),
  ...arcSlot("ch-arc-3", 1),
  ...wallSlots("cyber_heroes", "ch-wall-l", -HALF_W + WALL_INSET, [-7.9, -10.7], FACE_POS_X, 2.0).map((s) => ({ ...s, featured: true })),
  ...wallSlots("cyber_heroes", "ch-wall-r", HALF_W - WALL_INSET, [-7.9, -10.7], FACE_NEG_X, 2.0).map((s) => ({ ...s, featured: true })),
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
  { id: "a2", short: "02", label: "Digital Privacy", position: [-6, 1.2], yaw: Math.PI / 2 },
  { id: "a3", short: "03", label: "Think Before You Post", position: [6, 1.2], yaw: -Math.PI / 2 },
  { id: "a4", short: "04", label: "Cyber Heroes", position: [0, -6.1], yaw: 0 },
  { id: "a5", short: "05", label: "Closing", position: [0, -10.3], yaw: 0 },
];
