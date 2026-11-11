"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Full-bleed RECEIPTS wordmark. SVG + textLength makes it fill the width exactly
 * at every screen size; the bottom is cropped on purpose. A spotlight follows
 * the pointer across the letters.
 */
export function FooterWordmark() {
  const ref = useRef<SVGSVGElement>(null);
  const [spot, setSpot] = useState({ x: 500, y: 60, on: false });

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setSpot({ x: ((e.clientX - r.left) / r.width) * 1000, y: ((e.clientY - r.top) / r.height) * 172, on: true });
  }

  const word = (
    <text
      x="0"
      y="190"
      textLength="1000"
      lengthAdjust="spacing"
      style={{ font: "600 204px var(--font-geist), ui-sans-serif, system-ui", letterSpacing: "-0.02em" }}
    >
      RECEIPTS
    </text>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
      className="mx-auto max-w-[1600px] px-3 pt-10 sm:px-6"
    >
      <svg
        ref={ref}
        viewBox="0 0 1000 172"
        className="block h-auto w-full select-none"
        role="img"
        aria-label="Receipts"
        onPointerMove={move}
        onPointerLeave={() => setSpot((s) => ({ ...s, on: false }))}
      >
        <defs>
          <linearGradient id="wm-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bdbab3" />
            <stop offset="45%" stopColor="#8f8c86" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          <radialGradient id="wm-spot" gradientUnits="userSpaceOnUse" cx={spot.x} cy={spot.y} r="230">
            <stop offset="0%" stopColor="#f2efe7" stopOpacity="1" />
            <stop offset="100%" stopColor="#f2efe7" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g fill="url(#wm-fade)">{word}</g>
        <g fill="url(#wm-spot)" style={{ opacity: spot.on ? 1 : 0, transition: "opacity 0.4s ease" }}>
          {word}
        </g>
      </svg>
    </motion.div>
  );
}
