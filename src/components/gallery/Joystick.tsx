"use client";

import { useRef, useState } from "react";
import { nav } from "./navStore";

/** Touch joystick for phones and tablets: push to walk, sideways to step left/right. */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const R = 46;

  const update = (clientX: number, clientY: number) => {
    const rect = base.current!.getBoundingClientRect();
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    setKnob({ x: dx, y: dy });
    nav.joystick.x = dx / R;
    nav.joystick.y = -dy / R;
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    nav.joystick.x = 0;
    nav.joystick.y = 0;
  };

  return (
    <div
      ref={base}
      role="application"
      aria-label="Movement joystick: drag to walk"
      className="pointer-events-auto relative h-32 w-32 touch-none select-none rounded-full border border-white/60 bg-teal/35 shadow-lg backdrop-blur-sm"
      onPointerDown={(e) => {
        e.stopPropagation();
        active.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (active.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-semibold text-white/90">▲</span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white/90">▼</span>
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-white bg-green shadow-md"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
