"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Lightformer,
  PresentationControls,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import type { ReceiptSummary } from "@/lib/summary";
import { paintReceipt } from "./receipt-texture";

export type PrinterState = "idle" | "working" | "printing" | "printed";

const PAPER_W = 1.42;
const PAPER_H = 2.84;
const SLOT_Y = 1.18; // where paper exits the printer

interface Props {
  summary: ReceiptSummary | null;
  state: PrinterState;
  /** bump to re-run the print animation */
  printKey: number;
  onPrinted?: () => void;
}

function Paper({ summary, state, printKey, onPrinted }: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const feed = useRef(0); // 0 = inside printer, 1 = fully out
  const target = useRef(1);
  const done = useRef(false);

  const canvas = useMemo(() => (typeof document !== "undefined" ? document.createElement("canvas") : null), []);
  const texture = useMemo(() => {
    if (!canvas) return null;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);

  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(PAPER_W, PAPER_H, 18, 90);
    // anchor top edge at y = 0 so the strip hangs down from the slot
    g.translate(0, -PAPER_H / 2, 0);
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geom.attributes.position.array as Float32Array), [geom]);

  // repaint when data changes (after fonts are ready so the mono face is used)
  useEffect(() => {
    if (!canvas || !texture) return;
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      paintReceipt(canvas, summary);
      texture.needsUpdate = true;
    };
    draw();
    document.fonts?.ready.then(draw);
    return () => {
      cancelled = true;
    };
  }, [summary, canvas, texture]);

  // drive the feed target from the state machine
  useEffect(() => {
    if (state === "working") {
      target.current = 0.06; // pull paper back in while the printer works
    } else if (state === "printing" || state === "printed" || state === "idle") {
      if (state === "printing") {
        feed.current = Math.min(feed.current, 0.06);
        done.current = false;
      }
      target.current = 1;
    }
  }, [state, printKey]);

  useFrame((s, dt) => {
    const m = mesh.current;
    if (!m) return;
    const t = s.clock.elapsedTime;

    // thermal printers feed in small steps, quantise the motion
    const speed = state === "working" ? 2.4 : 0.62;
    feed.current += Math.sign(target.current - feed.current) * Math.min(Math.abs(target.current - feed.current), dt * speed);
    const stepped = state === "printing" ? Math.round(feed.current * 34) / 34 : feed.current;
    if (state === "printing" && !done.current && feed.current >= 0.999) {
      done.current = true;
      onPrinted?.();
    }

    // working: tiny jitter like a motor chugging
    m.position.x = state === "working" ? Math.sin(t * 60) * 0.004 : 0;

    // Feed: only the last `stepped` share of the strip is out of the slot.
    // Unprinted vertices collapse onto the slot line (zero-area, invisible),
    // so the paper genuinely emerges from the printer.
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const out = Math.max(stepped, 0.0001);
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i];
      const along = -base[i + 1] / PAPER_H; // 0 = top of receipt … 1 = bottom
      const hang = Math.max(0, along - (1 - out)); // 0 at slot … out at free end
      const yNew = -hang * PAPER_H;
      let z = Math.sin(yNew * 2.1 + t * 1.1) * 0.045 * (hang / out);
      z += x * Math.sin(t * 0.6) * 0.05 * (hang / out);
      const curlStart = Math.max(0, out - 0.22);
      if (hang > curlStart) z += Math.pow((hang - curlStart) / 0.22, 2) * 0.3 * out;
      arr[i + 1] = yNew;
      arr[i + 2] = z;
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
  });

  return (
    <mesh ref={mesh} geometry={geom} position={[0, SLOT_Y, 0.06]} castShadow>
      <meshStandardMaterial map={texture ?? undefined} color="#ffffff" roughness={0.92} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Printer({ state }: { state: PrinterState }) {
  const led = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => {
    if (!led.current) return;
    const t = s.clock.elapsedTime;
    const on = state === "working" ? (Math.sin(t * 18) > 0 ? 1 : 0.15) : state === "printing" ? 1 : 0.55 + Math.sin(t * 2) * 0.25;
    led.current.emissiveIntensity = on * 3;
  });
  return (
    <group position={[0, SLOT_Y + 0.34, 0]}>
      {/* body */}
      <RoundedBox args={[2.05, 0.68, 1.0]} radius={0.14} smoothness={6} castShadow>
        <meshStandardMaterial color="#141414" roughness={0.38} metalness={0.55} />
      </RoundedBox>
      {/* top plate */}
      <RoundedBox args={[1.86, 0.06, 0.82]} radius={0.03} position={[0, 0.35, 0]}>
        <meshStandardMaterial color="#1e1e1e" roughness={0.25} metalness={0.7} />
      </RoundedBox>
      {/* paper slot */}
      <mesh position={[0, -0.335, 0.06]}>
        <boxGeometry args={[1.6, 0.03, 0.14]} />
        <meshStandardMaterial color="#000000" roughness={1} />
      </mesh>
      {/* status LED */}
      <mesh position={[0.82, 0.12, 0.505]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial ref={led} color="#3ddc97" emissive="#3ddc97" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* engraved grille */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-0.78 + i * 0.07, 0.12, 0.502]}>
          <boxGeometry args={[0.02, 0.16, 0.01]} />
          <meshStandardMaterial color="#0a0a0a" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export default function PrinterScene(props: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.05, 6.4], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 5]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-4, 3, -3]} intensity={18} angle={0.5} penumbra={1} color="#ffffff" />

      <PresentationControls
        global
        cursor
        snap
        speed={1.4}
        rotation={[0.04, -0.28, 0]}
        polar={[-0.25, 0.25]}
        azimuth={[-0.7, 0.7]}
      >
        <Float speed={1.3} rotationIntensity={0.12} floatIntensity={0.35} floatingRange={[-0.04, 0.04]}>
          <group position={[0, -0.1, 0]}>
            <Printer state={props.state} />
            <Paper {...props} />
          </group>
        </Float>
      </PresentationControls>

      <ContactShadows position={[0, -1.95, 0]} opacity={0.55} scale={7} blur={2.6} far={4} />

      {/* studio lighting without any network HDRI */}
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 4, 3]} scale={[8, 2, 1]} />
        <Lightformer intensity={1.2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer intensity={0.8} position={[5, 0, 1]} rotation-y={-Math.PI / 2} scale={[4, 6, 1]} />
      </Environment>
    </Canvas>
  );
}
