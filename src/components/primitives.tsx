import { clsx } from "clsx";
import type { LineStatus, EvidenceLevel, Pulse } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { PULSE_LABEL } from "@/lib/engine/pulse";

const STATUS_COLOR: Record<LineStatus, string> = {
  verified: "#3ddc97",
  found: "#ededed",
  not_found: "#6b6b6b",
  disputed: "#f5a524",
};

/** Status on dark UI surfaces. */
export function StatusPill({ status }: { status: LineStatus }) {
  return (
    <span className="pill" style={{ color: STATUS_COLOR[status] }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

const LEVEL_COLOR: Record<EvidenceLevel, string> = {
  strong: "#3ddc97",
  partial: "#f5a524",
  thin: "#ff5a4e",
};

/** Evidence level on dark UI surfaces. */
export function EvidenceBadge({ level, sourced, total }: { level: EvidenceLevel; sourced: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line-2)] px-3 py-1">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: LEVEL_COLOR[level] }} />
      <span className="mono text-[11px] uppercase tracking-[0.12em]" style={{ color: LEVEL_COLOR[level] }}>
        {level}
      </span>
      <span className="mono text-[11px] text-[var(--color-faint)]">
        {sourced}/{total}
      </span>
    </span>
  );
}

const STAMP_INK: Record<EvidenceLevel, string> = {
  strong: "#178a5c",
  partial: "#b8720b",
  thin: "#c8352b",
};

/** Rubber stamp printed on the paper receipt. */
export function Stamp({ level, sourced, total, animate = true }: { level: EvidenceLevel; sourced: number; total: number; animate?: boolean }) {
  const ink = STAMP_INK[level];
  return (
    <div
      className={clsx("pointer-events-none select-none", animate && "stamp-in")}
      style={{ transform: "rotate(-14deg)", color: ink }}
      aria-label={`Evidence level ${level}, ${sourced} of ${total} sourced`}
    >
      <svg width="172" height="96" viewBox="0 0 172 96">
        <defs>
          <filter id={`rough-${level}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
            <feDisplacementMap in="SourceGraphic" scale="2.2" />
          </filter>
        </defs>
        <g filter={`url(#rough-${level})`} fill="none" stroke="currentColor">
          <rect x="3" y="3" width="166" height="90" rx="10" strokeWidth="4" />
          <rect x="10" y="10" width="152" height="76" rx="6" strokeWidth="1.5" />
          <text
            x="86"
            y="54"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            style={{ font: "800 30px var(--font-geist-mono), monospace", letterSpacing: "4px" }}
          >
            {level.toUpperCase()}
          </text>
          <text
            x="86"
            y="74"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            style={{ font: "600 9.5px var(--font-geist-mono), monospace", letterSpacing: "3px" }}
          >
            EVIDENCE · {sourced}/{total}
          </text>
        </g>
      </svg>
    </div>
  );
}

export function PulseBars({ pulse, onPaper = false }: { pulse: Pulse; onPaper?: boolean }) {
  const weeks = pulse.weeks.length
    ? pulse.weeks
    : Array.from({ length: 12 }, (_, i) => ({ weekStart: String(i), commits: 0, contributors: 0, releases: 0, active: false }));
  const max = Math.max(1, ...weeks.map((w) => w.commits));
  const on = onPaper ? "#151515" : "#ededed";
  const off = onPaper ? "rgba(21,21,21,0.14)" : "rgba(255,255,255,0.1)";
  return (
    <div>
      <div className="flex h-14 items-end gap-[3px]">
        {weeks.map((w, i) => (
          <div
            key={i}
            className="flex-1 rounded-[2px]"
            style={{
              height: `${w.active ? Math.max(14, (w.commits / max) * 100) : 6}%`,
              background: w.active ? on : off,
            }}
            title={`${w.commits} commits`}
          />
        ))}
      </div>
      <div className={clsx("mt-2 flex justify-between text-[10.5px] uppercase tracking-[0.12em]", onPaper ? "text-[var(--color-paper-faint)]" : "text-[var(--color-faint)]")}>
        <span>12 wks ago</span>
        <span>{PULSE_LABEL[pulse.state]}</span>
        <span>now</span>
      </div>
    </div>
  );
}
