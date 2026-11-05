"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { PublicArtwork } from "@/lib/artworks";
import { CATEGORIES } from "@/lib/categories";
import { ArtworkFrame } from "./ArtworkFrame";
import { COLORS, Closing, Entrance, HangingSign, Room, WallTitle } from "./Architecture";
import { HALF_W, SLOTS } from "./layout";
import { VisitorControls } from "./VisitorControls";

/** Keep a comfortable horizontal field of view on tall phone screens. */
function FovAdapter() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useEffect(() => {
    const aspect = size.width / size.height;
    const baseV = 68;
    const minH = 78; // degrees of horizontal view we want at least
    const hFromBase = (2 * Math.atan(Math.tan((baseV * Math.PI) / 360) * aspect) * 180) / Math.PI;
    const fov = hFromBase >= minH ? baseV : Math.min(100, (2 * Math.atan(Math.tan((minH * Math.PI) / 360) / aspect) * 180) / Math.PI);
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Lights({ lowPower }: { lowPower: boolean }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#ffffff", "#cfe6e7", 0.55]} />
      {/* soft key light from above, casting the room's shadows */}
      <directionalLight
        position={[6, 14, 8]}
        intensity={0.9}
        castShadow
        shadow-mapSize={lowPower ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-8, 10, -12]} intensity={0.35} />
      {/* general ceiling fill so corridors are never dark */}
      {[
        [-6, 6],
        [6, 6],
        [-6, -4],
        [6, -4],
        [0, 11],
        [0, -12],
      ].map(([x, z]) => (
        <pointLight key={`${x}${z}`} position={[x, 6.2, z]} intensity={9} distance={16} decay={1.6} color="#ffffff" />
      ))}
    </>
  );
}

/** Place published artwork into the slots of its exhibition area, in order. */
function assign(artworks: PublicArtwork[]) {
  const map = new Map<string, PublicArtwork>();
  for (const cat of CATEGORIES) {
    const slots = SLOTS.filter((s) => s.category === cat.key);
    const items = artworks.filter((a) => a.category === cat.key);
    slots.forEach((s, i) => {
      if (items[i]) map.set(s.id, items[i]);
    });
  }
  return map;
}

export default function GalleryScene({
  artworks,
  onOpen,
  lowPower,
}: {
  artworks: PublicArtwork[];
  onOpen: (a: PublicArtwork) => void;
  lowPower: boolean;
}) {
  const placed = useMemo(() => assign(artworks), [artworks]);

  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={lowPower ? [1, 1.5] : [1, 2]}
      camera={{ fov: 68, near: 0.05, far: 80, position: [0, 1.65, 14.2] }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        powerPreference: "high-performance",
      }}
      style={{ touchAction: "none" }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color("#e9efef");
      }}
    >
      <Suspense fallback={null}>
        <Lights lowPower={lowPower} />
        <Room />
        <Entrance />

        {/* Wayfinding signs visible from the entrance */}
        <HangingSign position={[-6, 5.3, 7.2]} number="02" title="Digital Privacy" theme="Protect Your Personal Information" accent={COLORS.sky} />
        <HangingSign position={[6, 5.3, 7.2]} number="03" title="Think Before You Post" theme="Be Responsible Online" accent={COLORS.coral} />
        <HangingSign position={[0, 5.5, -6.2]} number="04" title="Cyber Heroes" theme="Featured Student Artwork" accent={COLORS.sun} />

        {/* Section titles on the walls */}
        <WallTitle position={[-HALF_W + 0.05, 4.75, 1.2]} rotationY={Math.PI / 2} number="02" title="Digital Privacy" theme="Protect Your Personal Information" />
        <WallTitle position={[HALF_W - 0.05, 4.75, 1.2]} rotationY={-Math.PI / 2} number="03" title="Think Before You Post" theme="Be Responsible Online" />
        <WallTitle position={[-HALF_W + 0.05, 4.75, -9.3]} rotationY={Math.PI / 2} number="04" title="Cyber Heroes" theme="Featured Student Artwork" />
        <WallTitle position={[HALF_W - 0.05, 4.75, -9.3]} rotationY={-Math.PI / 2} number="04" title="Cyber Heroes" theme="Featured Student Artwork" />

        {SLOTS.map((slot) => (
          <ArtworkFrame key={slot.id} slot={slot} artwork={placed.get(slot.id)} onOpen={onOpen} lowPower={lowPower} />
        ))}

        <Closing />
      </Suspense>
      <VisitorControls />
      <FovAdapter />
    </Canvas>
  );
}
