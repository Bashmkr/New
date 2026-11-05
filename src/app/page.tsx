"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";

const GalleryExperience = dynamic(
  () => import("@/components/gallery/GalleryExperience").then((m) => m.GalleryExperience),
  { ssr: false },
);

type Stage = "welcome" | "leaving" | "gallery";

export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");

  // Start downloading the 3D code while the visitor reads the welcome screen.
  useEffect(() => {
    void import("@/components/gallery/GalleryExperience");
  }, []);

  // Browser back button returns to the welcome screen instead of leaving the site.
  useEffect(() => {
    const onPop = () => setStage("welcome");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const enter = () => {
    setStage("leaving");
    window.history.pushState({ gallery: true }, "", "#gallery");
    setTimeout(() => setStage("gallery"), 650);
  };

  const exit = () => {
    if (window.location.hash === "#gallery") window.history.back();
    else setStage("welcome");
  };

  if (stage === "gallery") return <GalleryExperience onExit={exit} />;
  return <WelcomeScreen onEnter={enter} leaving={stage === "leaving"} />;
}
