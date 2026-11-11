import type { Pulse, PulseState } from "@/lib/types";
import type { RepoData } from "./collectors/repo";

export function computePulse(repo: RepoData | null): Pulse {
  if (!repo || !repo.found || repo.weeks.length === 0) {
    return { state: "unknown", activeWeeks: 0, totalWeeks: 0, weeks: [], burstFlag: false };
  }
  const weeks = repo.weeks;
  const totalWeeks = weeks.length;
  const activeWeeks = weeks.filter((w) => w.active).length;

  // Did a release land recently? Weigh it heavily, releases are hard to fake.
  const recentRelease = repo.latestRelease
    ? Date.now() - new Date(repo.latestRelease.at).getTime() < 1000 * 60 * 60 * 24 * 14
    : false;

  let state: PulseState;
  const ratio = activeWeeks / totalWeeks;
  if (recentRelease || ratio >= 0.75) state = "shipping";
  else if (ratio >= 0.45) state = "steady";
  else if (ratio >= 0.17) state = "slowing";
  else state = "quiet";

  return { state, activeWeeks, totalWeeks, weeks, burstFlag: repo.burstFlag };
}

export const PULSE_LABEL: Record<PulseState, string> = {
  shipping: "Shipping",
  steady: "Steady",
  slowing: "Slowing",
  quiet: "Quiet",
  unknown: "Unknown",
};
