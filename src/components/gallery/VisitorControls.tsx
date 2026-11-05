"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { EYE_HEIGHT, HALF_L, HALF_W, OBSTACLES, VISITOR_RADIUS } from "./layout";
import { nav } from "./navStore";

const WALK_SPEED = 2.6; // m/s
const TURN_SPEED = 1.8; // rad/s for arrow keys
const LOOK_SENSITIVITY = 0.0042;
const MAX_PITCH = 0.9;

function blocked(x: number, z: number): boolean {
  const r = VISITOR_RADIUS;
  if (x < -HALF_W + r || x > HALF_W - r || z < -HALF_L + r || z > HALF_L - r) return true;
  for (const [minX, maxX, minZ, maxZ] of OBSTACLES) {
    if (x > minX - r && x < maxX + r && z > minZ - r && z < maxZ + r) return true;
  }
  return false;
}

/**
 * First-person visitor controls:
 *  - drag (mouse or finger) to look around
 *  - WASD / arrow keys to walk and turn
 *  - on-screen joystick on touch devices (via nav store)
 *  - click/tap the floor or use the area menu to walk to a spot (via nav store)
 */
export function VisitorControls() {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-0.04);
  const keys = useRef<Record<string, boolean>>({});
  const targetYaw = useRef<number | null>(null);

  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, 14.2);
    camera.rotation.order = "YXZ";
  }, [camera]);

  // Drag to look
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pointerId: number | null = null;

    const down = (e: PointerEvent) => {
      if (pointerId !== null) return;
      dragging = true;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      nav.lookDelta.x += dx;
      nav.lookDelta.y += dy;
      if (Math.abs(dx) + Math.abs(dy) > 0) el.style.cursor = "grabbing";
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      el.style.cursor = "";
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  // Keyboard
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "e"].includes(k)) {
        keys.current[k] = true;
        nav.target = null;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    const blur = () => (keys.current = {});
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const k = keys.current;

    // Look
    if (nav.lookDelta.x || nav.lookDelta.y) {
      yaw.current += nav.lookDelta.x * LOOK_SENSITIVITY;
      pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current + nav.lookDelta.y * LOOK_SENSITIVITY));
      nav.lookDelta.x = 0;
      nav.lookDelta.y = 0;
      targetYaw.current = null;
    }

    let forward = 0;
    let strafe = 0;
    let turn = 0;
    if (!nav.paused) {
      if (k["w"] || k["arrowup"]) forward += 1;
      if (k["s"] || k["arrowdown"]) forward -= 1;
      if (k["d"]) strafe += 1;
      if (k["a"]) strafe -= 1;
      if (k["arrowleft"] || k["q"]) turn += 1;
      if (k["arrowright"] || k["e"]) turn -= 1;
      forward += nav.joystick.y;
      strafe += nav.joystick.x;
    }
    if (turn) {
      yaw.current += turn * TURN_SPEED * delta;
      targetYaw.current = null;
    }

    const pos = camera.position;
    if (nav.target?.instant) {
      pos.x = nav.target.x;
      pos.z = nav.target.z;
      if (nav.target.yaw !== undefined) yaw.current = nav.target.yaw;
      if (nav.target.pitch !== undefined) pitch.current = nav.target.pitch;
      nav.target = null;
      targetYaw.current = null;
    }
    let dx = 0;
    let dz = 0;

    if (forward || strafe) {
      nav.target = null;
      const len = Math.min(1, Math.hypot(forward, strafe));
      const a = Math.atan2(strafe, forward);
      const dir = yaw.current + -a;
      // yaw 0 looks toward -z
      dx = -Math.sin(dir) * WALK_SPEED * len * delta;
      dz = -Math.cos(dir) * WALK_SPEED * len * delta;
    } else if (nav.target) {
      const tx = nav.target.x - pos.x;
      const tz = nav.target.z - pos.z;
      const dist = Math.hypot(tx, tz);
      if (nav.target.yaw !== undefined) targetYaw.current = nav.target.yaw;
      if (dist < 0.05) {
        nav.target = null;
      } else {
        const step = Math.min(dist, Math.max(0.6, Math.min(dist * 2.2, WALK_SPEED * 2.2)) * delta);
        dx = (tx / dist) * step;
        dz = (tz / dist) * step;
      }
    }

    if (targetYaw.current !== null) {
      // shortest rotation toward the requested heading
      let diff = targetYaw.current - yaw.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      yaw.current += diff * Math.min(1, delta * 3.5);
      pitch.current += (-0.04 - pitch.current) * Math.min(1, delta * 3.5);
      if (Math.abs(diff) < 0.002) targetYaw.current = null;
    }

    // Collision with walls and obstacles, sliding along each axis
    if (dx || dz) {
      const jumping = nav.target && nav.target.yaw !== undefined;
      if (jumping) {
        // area jumps travel freely (they always end at a clear spot)
        pos.x += dx;
        pos.z += dz;
      } else {
        if (!blocked(pos.x + dx, pos.z)) pos.x += dx;
        if (!blocked(pos.x, pos.z + dz)) pos.z += dz;
        if (nav.target && blocked(pos.x + dx, pos.z + dz)) nav.target = null;
      }
    }

    pos.y = EYE_HEIGHT;
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    nav.position.x = pos.x;
    nav.position.z = pos.z;
  });

  return null;
}

export function isWalkable(x: number, z: number) {
  return !blocked(x, z);
}
