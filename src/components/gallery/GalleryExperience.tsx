"use client";

/* eslint-disable @next/next/no-img-element */

import { useProgress } from "@react-three/drei";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { fetchPublishedArtworks, type PublicArtwork } from "@/lib/artworks";
import { ambientMusic } from "@/lib/ambientMusic";
import { categoryLabel } from "@/lib/categories";
import { Joystick } from "./Joystick";
import { AREA_STOPS } from "./layout";
import { goTo, nav } from "./navStore";

const GalleryScene = dynamic(() => import("./GalleryScene"), { ssr: false });

const GUIDE_KEY = "csg-guide-seen";

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const set = () => setTouch(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  return touch;
}

export function GalleryExperience({ onExit }: { onExit: () => void }) {
  const [artworks, setArtworks] = useState<PublicArtwork[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState<PublicArtwork | null>(null);
  const [guide, setGuide] = useState(false);
  const [menu, setMenu] = useState(false);
  const isTouch = useIsTouch();
  const { active, progress } = useProgress();
  const [sceneReady, setSceneReady] = useState(false);
  const [fading, setFading] = useState(false);
  const [musicOn, setMusicOn] = useState(ambientMusic.playing);
  useEffect(() => ambientMusic.subscribe(setMusicOn), []);

  // Area jumps: a short fade, then the visitor is placed in the new area (never walks through walls)
  const jumpTo = useCallback((x: number, z: number, yaw: number) => {
    setFading(true);
    setTimeout(() => goTo({ x, z, yaw, pitch: -0.04, instant: true }), 260);
    setTimeout(() => setFading(false), 420);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedArtworks()
      .then((a) => !cancelled && setArtworks(a))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!active && progress === 100) {
      const t = setTimeout(() => setSceneReady(true), 350);
      return () => clearTimeout(t);
    }
  }, [active, progress]);

  useEffect(() => {
    if (!sceneReady) return;
    let seen = false;
    try {
      seen = localStorage.getItem(GUIDE_KEY) === "1";
    } catch {}
    if (!seen) setGuide(true);
  }, [sceneReady]);

  useEffect(() => {
    nav.paused = !!open || guide;
  }, [open, guide]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMenu(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeGuide = useCallback(() => {
    setGuide(false);
    try {
      localStorage.setItem(GUIDE_KEY, "1");
    } catch {}
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#e9efef]">
      <div className="absolute inset-0">
        <GalleryScene artworks={artworks} onOpen={setOpen} lowPower={isTouch} />
      </div>

      <div className={`pointer-events-none absolute inset-0 z-30 bg-white transition-opacity duration-300 ${fading ? "opacity-100" : "opacity-0"}`} aria-hidden />

      {/* Loading overlay */}
      <div
        className={`absolute inset-0 z-40 flex flex-col items-center justify-center bg-white transition-opacity duration-700 ${
          sceneReady ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-hidden={sceneReady}
      >
        <div className="digital-pattern absolute inset-0 opacity-60" />
        <img src="/brand/logo.png" alt="" className="relative h-auto w-56" />
        <p className="relative mt-8 text-sm font-semibold tracking-[0.3em] text-teal">PREPARING THE GALLERY</p>
        <div className="relative mt-4 h-1 w-56 overflow-hidden rounded-full bg-teal/10">
          <div className="h-full origin-left bg-green transition-transform duration-300" style={{ transform: `scaleX(${Math.max(0.08, progress / 100)})` }} />
        </div>
      </div>

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={onExit}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-teal shadow-md backdrop-blur transition hover:bg-white"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
            <path d="M3 9.5 10 3l7 6.5M5 8v8.5h10V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">Welcome screen</span>
        </button>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              className="flex items-center gap-2 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-teal-dark"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
                <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="10" cy="8" r="2" fill="currentColor" />
              </svg>
              Go to area
            </button>
            {menu && (
              <nav className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-teal/10">
                {AREA_STOPS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      jumpTo(a.position[0], a.position[1], a.yaw);
                      setMenu(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#1f4547] transition hover:bg-teal-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal">{a.short}</span>
                    <span className="font-medium">{a.label}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>
          <button
            type="button"
            onClick={() => ambientMusic.toggle()}
            aria-label={musicOn ? "Turn music off" : "Turn music on"}
            aria-pressed={musicOn}
            title={musicOn ? "Music on" : "Music off"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-teal shadow-md backdrop-blur transition hover:bg-white"
          >
            {musicOn ? (
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
                <path d="M3 8v4h3l4 3.5v-11L6 8H3Z" fill="currentColor" />
                <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.2 5.3a6.5 6.5 0 0 1 0 9.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
                <path d="M3 8v4h3l4 3.5v-11L6 8H3Z" fill="currentColor" />
                <path d="m13 8 4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => setGuide(true)}
            aria-label="How to explore"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-base font-bold text-teal shadow-md backdrop-blur transition hover:bg-white"
          >
            ?
          </button>
        </div>
      </header>

      {loadError && (
        <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs text-coral shadow">
          Artwork could not be loaded right now. Please refresh in a moment.
        </div>
      )}

      {/* Touch controls */}
      {isTouch && sceneReady && !open && (
        <div className="pointer-events-none absolute bottom-6 left-5 z-20">
          <Joystick />
        </div>
      )}

      {/* Persistent school watermark */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex select-none items-center gap-2 rounded-xl bg-white/70 px-3 py-2 opacity-80 shadow-sm backdrop-blur-sm sm:bottom-4 sm:right-4">
        <img src="/brand/logo.png" alt="" className="h-6 w-auto sm:h-7" />
        <span className="hidden border-l border-teal/20 pl-2 text-[11px] font-medium leading-tight text-teal sm:block">
          The Riyadh Schools – Al Malqa
          <span className="block text-[10px] font-normal text-teal/70">Cyber Safety Gallery</span>
        </span>
      </div>

      {guide && <Guide isTouch={isTouch} onClose={closeGuide} />}
      {open && <ArtworkViewer artwork={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Guide({ isTouch, onClose }: { isTouch: boolean; onClose: () => void }) {
  const rows = isTouch
    ? [
        ["Look around", "Drag one finger across the screen"],
        ["Walk", "Use the joystick in the bottom-left corner"],
        ["Go somewhere", "Tap a spot on the floor"],
        ["See an artwork", "Tap any artwork to view it up close"],
        ["Jump to a section", "Use “Go to area” at the top"],
      ]
    : [
        ["Look around", "Click and drag with the mouse"],
        ["Walk", "W A S D or the arrow keys"],
        ["Go somewhere", "Click a spot on the floor"],
        ["See an artwork", "Click any artwork to view it up close"],
        ["Jump to a section", "Use “Go to area” at the top"],
      ];
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-teal-dark/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-green">Visitor guide</p>
        <h2 id="guide-title" className="mt-1 text-2xl font-bold text-teal">
          How to explore
        </h2>
        <ul className="mt-5 space-y-3">
          {rows.map(([a, b]) => (
            <li key={a} className="flex gap-3 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-green" />
              <span>
                <span className="font-semibold text-[#1f4547]">{a}: </span>
                <span className="text-[#4a6b6d]">{b}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-xl bg-teal-50 px-4 py-3 text-xs leading-relaxed text-[#2c5254]">
          The gallery has five areas: Welcome Entrance, Digital Privacy, Think Before You Post, Cyber Heroes and the Closing area.
        </p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-6 w-full rounded-full bg-teal py-3 text-sm font-semibold tracking-[0.12em] text-white transition hover:bg-teal-dark"
        >
          START EXPLORING
        </button>
      </div>
    </div>
  );
}

function ArtworkViewer({ artwork, onClose }: { artwork: PublicArtwork; onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#0b2a2c]/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="artwork-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f4f7f7] p-4 sm:p-8">
          <img
            src={artwork.fullUrl}
            alt={artwork.title}
            className="max-h-[62dvh] w-auto max-w-full rounded-sm object-contain shadow-lg ring-8 ring-white md:max-h-[78dvh]"
          />
        </div>
        <aside className="flex shrink-0 flex-col gap-3 border-t border-teal/10 p-5 sm:p-7 md:w-72 md:border-l md:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green">{categoryLabel(artwork.category)}</p>
          <h2 id="artwork-title" className="text-xl font-bold leading-snug text-teal sm:text-2xl">
            {artwork.title}
          </h2>
          {artwork.student_first_name && <p className="text-sm text-[#4a6b6d]">Artist: {artwork.student_first_name}</p>}
          <p className="text-xs text-[#5b7a7c]">Cyber Safety Gallery · The Riyadh Schools – Al Malqa</p>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="mt-auto rounded-full bg-teal px-6 py-3 text-sm font-semibold tracking-[0.12em] text-white transition hover:bg-teal-dark"
          >
            BACK TO GALLERY
          </button>
        </aside>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-xl text-teal shadow-md transition hover:bg-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}
