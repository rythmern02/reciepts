"use client";

import { useEffect, useRef, useState } from "react";

// A premium, dependency-free animated backdrop on a 2D canvas:
// slow-drifting gradient orbs + a parallax constellation field.
// Bulletproof across React/Next versions, no WebGL, no reconciler.

interface Orb {
  x: number;
  y: number;
  r: number;
  hue: string;
  dx: number;
  dy: number;
  phase: number;
}
interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number; // depth for parallax
}

export default function BackdropScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const orbs: Orb[] = [
      { x: 0.2, y: 0.15, r: 0.42, hue: "168,85,247", dx: 0.00004, dy: 0.00003, phase: 0 },
      { x: 0.82, y: 0.2, r: 0.33, hue: "34,211,238", dx: -0.00003, dy: 0.00004, phase: 2 },
      { x: 0.6, y: 0.95, r: 0.46, hue: "99,102,241", dx: 0.00002, dy: -0.00003, phase: 4 },
    ];

    let dots: Dot[] = [];
    function seedDots() {
      const count = Math.round((w * h) / 26000);
      dots = Array.from({ length: Math.min(160, count) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        z: 0.4 + Math.random() * 1.2,
      }));
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedDots();
    }
    resize();
    window.addEventListener("resize", resize);

    function onMove(e: MouseEvent) {
      mouse.tx = (e.clientX / w - 0.5) * 2;
      mouse.ty = (e.clientY / h - 0.5) * 2;
    }
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    let t = 0;
    function frame() {
      t += 1;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      ctx!.clearRect(0, 0, w, h);

      // Orbs
      ctx!.globalCompositeOperation = "lighter";
      for (const o of orbs) {
        o.x += o.dx + Math.sin(t * 0.002 + o.phase) * 0.00008;
        o.y += o.dy + Math.cos(t * 0.0018 + o.phase) * 0.00008;
        const cx = (o.x % 1.2) * w + mouse.x * 18 * (o.r);
        const cy = (o.y % 1.2) * h + mouse.y * 18 * (o.r);
        const rad = o.r * Math.min(w, h) * (1 + Math.sin(t * 0.004 + o.phase) * 0.06);
        const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `rgba(${o.hue},0.16)`);
        g.addColorStop(0.5, `rgba(${o.hue},0.05)`);
        g.addColorStop(1, `rgba(${o.hue},0)`);
        ctx!.fillStyle = g;
        ctx!.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      }

      // Constellation
      ctx!.globalCompositeOperation = "source-over";
      for (const d of dots) {
        d.x += d.vx * d.z;
        d.y += d.vy * d.z;
        if (d.x < 0) d.x = w;
        if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h;
        if (d.y > h) d.y = 0;
      }
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        const px = a.x + mouse.x * 14 * a.z;
        const py = a.y + mouse.y * 14 * a.z;
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = dx * dx + dy * dy;
          if (dist < 12000) {
            const bx = b.x + mouse.x * 14 * b.z;
            const by = b.y + mouse.y * 14 * b.z;
            ctx!.strokeStyle = `rgba(150,120,255,${0.12 * (1 - dist / 12000)})`;
            ctx!.lineWidth = 0.6;
            ctx!.beginPath();
            ctx!.moveTo(px, py);
            ctx!.lineTo(bx, by);
            ctx!.stroke();
          }
        }
        ctx!.fillStyle = `rgba(190,170,255,${0.5 * a.z})`;
        ctx!.beginPath();
        ctx!.arc(px, py, a.z * 0.9, 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(frame);
    } else {
      // Static single paint for reduced motion.
      frame();
      cancelAnimationFrame(raf);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", opacity: 0.9 }}
    />
  );
}
