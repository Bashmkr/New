"use client";

import { Text } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { PublicArtwork } from "@/lib/artworks";
import { COLORS, FONT_MED, FONT_SEMI } from "./Architecture";
import type { Slot } from "./layout";
import { ROOM } from "./layout";

const MAT = 0.09; // white passe-partout around the drawing
const FRAME = 0.06; // frame moulding width
const FRAME_DEPTH = 0.05;

/** Load a remote artwork texture without suspending, so one bad file never breaks the gallery. */
function useArtworkTexture(url: string | undefined) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (t) => {
        if (cancelled) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        loaded = t;
        setTex(t);
      },
      undefined,
      () => {
        if (!cancelled) setTex(null);
      },
    );
    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, [url]);
  return tex;
}

/** Fit artwork inside the slot without cropping or stretching. */
function fitSize(slot: Slot, w: number, h: number) {
  const innerMaxW = slot.maxW - 2 * (MAT + FRAME);
  const innerMaxH = slot.maxH - 2 * (MAT + FRAME);
  const scale = Math.min(innerMaxW / w, innerMaxH / h);
  return { w: w * scale, h: h * scale };
}

export function ArtworkFrame({
  slot,
  artwork,
  onOpen,
  lowPower,
}: {
  slot: Slot;
  artwork?: PublicArtwork;
  onOpen: (a: PublicArtwork) => void;
  lowPower: boolean;
}) {
  const tex = useArtworkTexture(artwork?.displayUrl);
  const [hover, setHover] = useState(false);

  const size = artwork ? fitSize(slot, artwork.width, artwork.height) : { w: slot.maxW * 0.62, h: slot.maxH * 0.62 };
  const outerW = size.w + 2 * (MAT + FRAME);
  const outerH = size.h + 2 * (MAT + FRAME);
  const frameColor = slot.featured ? "#2a2a2a" : COLORS.tealDark;

  const spotTarget = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!hover) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || !artwork) return;
    e.stopPropagation();
    onOpen(artwork);
  };

  // White display panel behind each artwork so drawings stand out against the teal wall
  const panelW = slot.maxW + 0.5;
  const panelH = slot.maxH + 0.7;

  return (
    <group position={slot.position} rotation-y={slot.rotationY}>
      {/* display panel (on wall slots only; feature walls are already white) */}
      {!slot.id.startsWith("ch-arc") && (
        <mesh position={[0, -0.05, -0.03]} receiveShadow>
          <boxGeometry args={[panelW, panelH, 0.03]} />
          <meshStandardMaterial color={COLORS.white} roughness={0.8} />
        </mesh>
      )}

      <group
        onClick={click}
        onPointerOver={(e) => {
          if (!artwork) return;
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        scale={hover ? 1.015 : 1}
      >
        {/* frame moulding */}
        <mesh position-z={FRAME_DEPTH / 2} castShadow>
          <boxGeometry args={[outerW, outerH, FRAME_DEPTH]} />
          <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.25} />
        </mesh>
        {/* gold inner fillet on featured Cyber Heroes frames */}
        {slot.featured && (
          <mesh position-z={FRAME_DEPTH + 0.001}>
            <planeGeometry args={[outerW - 2 * FRAME + 0.03, outerH - 2 * FRAME + 0.03]} />
            <meshStandardMaterial color={COLORS.sun} roughness={0.3} metalness={0.5} />
          </mesh>
        )}
        {/* passe-partout */}
        <mesh position-z={FRAME_DEPTH + 0.002}>
          <planeGeometry args={[outerW - 2 * FRAME, outerH - 2 * FRAME]} />
          <meshStandardMaterial color="#fbfbf8" roughness={0.95} />
        </mesh>
        {/* the student's original image, or an empty canvas */}
        <mesh position-z={FRAME_DEPTH + 0.004}>
          <planeGeometry args={[size.w, size.h]} />
          {tex ? (
            // Unlit material: the student's colours are shown exactly as drawn, never darkened or tinted by scene lighting
            <meshBasicMaterial map={tex} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#eef2f2" roughness={1} />
          )}
        </mesh>
        {!artwork && (
          <Text font={FONT_MED} position={[0, 0, FRAME_DEPTH + 0.006]} fontSize={0.085} letterSpacing={0.12} color="#8aa6a7" anchorX="center" anchorY="middle">
            AWAITING ARTWORK
          </Text>
        )}
      </group>

      {/* caption label */}
      {artwork && (
        <group position={[0, -outerH / 2 - 0.24, 0.005]}>
          <Text font={FONT_SEMI} fontSize={0.09} color={COLORS.teal} anchorX="center" anchorY="middle" maxWidth={slot.maxW}>
            {artwork.title}
          </Text>
          {artwork.student_first_name && (
            <Text font={FONT_MED} position-y={-0.13} fontSize={0.07} color="#5b7a7c" anchorX="center" anchorY="middle">
              {`by ${artwork.student_first_name}`}
            </Text>
          )}
        </group>
      )}

      {/* ceiling spotlight fixture + light aimed at the artwork */}
      <group position={[0, ROOM.height - 0.62 - slot.position[1], 2.0]}>
        <mesh rotation-x={-0.75}>
          <cylinderGeometry args={[0.07, 0.1, 0.24, 16]} />
          <meshStandardMaterial color="#2b2f30" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, -0.09, -0.08]} rotation-x={-0.75 + Math.PI / 2}>
          <circleGeometry args={[0.065, 16]} />
          <meshBasicMaterial color="#fff6dc" toneMapped={false} />
        </mesh>
      </group>
      <primitive object={spotTarget} position={[0, 0, 0]} />
      <spotLight
        position={[0, ROOM.height - 0.75 - slot.position[1], 1.9]}
        target={spotTarget}
        angle={slot.featured ? 0.36 : 0.33}
        penumbra={0.65}
        intensity={slot.featured ? 70 : 55}
        distance={12}
        decay={2}
        color="#fff3dc"
        castShadow={slot.featured && !lowPower}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0004}
      />
    </group>
  );
}
