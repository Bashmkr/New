/**
 * Small mutable store shared between the HTML controls (joystick, area menu)
 * and the 3D camera controller. Kept outside React state so per-frame input
 * never causes re-renders.
 */
export type NavTarget = { x: number; z: number; yaw?: number; instant?: boolean; pitch?: number };

export const nav = {
  /** Joystick input, -1..1. y = forward, x = strafe right. */
  joystick: { x: 0, y: 0 },
  /** Pending walk/jump target set by UI or floor taps. */
  target: null as NavTarget | null,
  /** Look drag deltas accumulated from HTML-side gestures. */
  lookDelta: { x: 0, y: 0 },
  /** Set while a modal is open so keys don't move the camera. */
  paused: false,
  /** Current camera position (written by the controller, read by the UI). */
  position: { x: 0, z: 13 },
};

export function goTo(target: NavTarget) {
  nav.target = target;
}

// Handy for automated visual checks (e.g. Playwright) in development only.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __csgNav: unknown }).__csgNav = { nav, goTo };
}
