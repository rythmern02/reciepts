"use client";

import dynamic from "next/dynamic";

// Load the Three.js scene only on the client, never evaluated during SSR/prerender.
const BackdropScene = dynamic(() => import("./backdrop-scene"), { ssr: false });

export function Backdrop() {
  return <BackdropScene />;
}
