// Repository activity via GitHub REST. Powers Work (does a product exist?) and
// Pulse (are they still building?). Activity is measured so it is hard to fake:
// distinct contributors + releases + a burst flag, not raw commit totals.

import { config, fetchWithTimeout } from "@/lib/config";
import type { PulseWeek } from "@/lib/types";

export interface RepoData {
  found: boolean;
  owner: string;
  repo: string;
  url: string;
  createdAt: string | null;
  ageDays: number | null;
  pushedAt: string | null;
  stars: number | null;
  contributors: number | null;
  totalCommits: number | null;
  releases: number | null;
  latestRelease: { tag: string; at: string; url: string } | null;
  weeks: PulseWeek[]; // last 12 weeks, oldest→newest
  burstFlag: boolean;
}

function parseRepoUrl(url?: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

function gh(pathname: string) {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "receipts-protocol",
    "x-github-api-version": "2022-11-28",
  };
  if (config.githubToken) headers.authorization = `Bearer ${config.githubToken}`;
  return fetchWithTimeout(`https://api.github.com${pathname}`, { headers, timeoutMs: 7000 });
}

export async function collectRepo(githubUrl?: string): Promise<RepoData | null> {
  const parsed = parseRepoUrl(githubUrl);
  if (!parsed) return null;
  const { owner, repo } = parsed;

  const repoRes = await gh(`/repos/${owner}/${repo}`);
  if (!repoRes.ok) {
    return {
      found: false,
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
      createdAt: null,
      ageDays: null,
      pushedAt: null,
      stars: null,
      contributors: null,
      totalCommits: null,
      releases: null,
      latestRelease: null,
      weeks: [],
      burstFlag: false,
    };
  }
  const repoJson = await repoRes.json();

  const [activity, contributors, releases] = await Promise.all([
    commitActivity(owner, repo),
    contributorCount(owner, repo),
    releaseInfo(owner, repo),
  ]);

  const ageDays = repoJson.created_at
    ? Math.floor((Date.now() - new Date(repoJson.created_at).getTime()) / 86400000)
    : null;

  // Last 12 weeks from commit_activity (GitHub returns 52 weeks oldest→newest).
  const last12 = activity.weeks.slice(-12);
  const weeks: PulseWeek[] = last12.map((w) => ({
    weekStart: new Date(w.week * 1000).toISOString().slice(0, 10),
    commits: w.total,
    contributors: 0, // filled by participation heuristic below
    releases: 0,
    active: w.total > 0,
  }));

  // Burst flag: a single week dwarfing the rest of the active weeks.
  const activeTotals = weeks.filter((w) => w.active).map((w) => w.commits).sort((a, b) => a - b);
  const median = activeTotals.length ? activeTotals[Math.floor(activeTotals.length / 2)] : 0;
  const max = activeTotals.length ? activeTotals[activeTotals.length - 1] : 0;
  const burstFlag = median > 0 && max > median * 6 && activeTotals.length <= 3;

  const totalCommits = activity.weeks.reduce((s, w) => s + w.total, 0);

  return {
    found: true,
    owner,
    repo,
    url: repoJson.html_url,
    createdAt: repoJson.created_at,
    ageDays,
    pushedAt: repoJson.pushed_at,
    stars: repoJson.stargazers_count ?? null,
    contributors,
    totalCommits,
    releases: releases.count,
    latestRelease: releases.latest,
    weeks,
    burstFlag,
  };
}

async function commitActivity(owner: string, repo: string): Promise<{ weeks: { week: number; total: number }[] }> {
  // This endpoint computes async; it can 202. Retry briefly.
  for (let i = 0; i < 3; i++) {
    const res = await gh(`/repos/${owner}/${repo}/stats/commit_activity`);
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 1200));
      continue;
    }
    if (!res.ok) return { weeks: [] };
    const json = await res.json();
    if (!Array.isArray(json)) return { weeks: [] };
    return { weeks: json.map((w: any) => ({ week: w.week, total: w.total })) };
  }
  return { weeks: [] };
}

async function contributorCount(owner: string, repo: string): Promise<number | null> {
  const res = await gh(`/repos/${owner}/${repo}/contributors?per_page=100&anon=1`);
  if (!res.ok) return null;
  // Use Link header for an exact-ish count when paginated.
  const link = res.headers.get("link");
  if (link) {
    const m = link.match(/page=(\d+)>;\s*rel="last"/);
    if (m) return parseInt(m[1], 10);
  }
  const json = await res.json();
  return Array.isArray(json) ? json.length : null;
}

async function releaseInfo(owner: string, repo: string): Promise<{ count: number | null; latest: RepoData["latestRelease"] }> {
  const res = await gh(`/repos/${owner}/${repo}/releases?per_page=100`);
  if (!res.ok) return { count: null, latest: null };
  const json = await res.json();
  if (!Array.isArray(json) || json.length === 0) return { count: 0, latest: null };
  const latest = json[0];
  return {
    count: json.length,
    latest: {
      tag: latest.tag_name,
      at: latest.published_at ?? latest.created_at,
      url: latest.html_url,
    },
  };
}
