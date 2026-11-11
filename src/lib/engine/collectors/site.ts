// Live-site + deploy check. Answers "is there a live product?" and
// "when did it last ship?" from HTTP reality (reachability, TLS, last-modified).

import { fetchWithTimeout } from "@/lib/config";

export interface SiteData {
  found: boolean;
  url: string;
  host: string;
  status: number | null;
  https: boolean;
  lastModified: string | null;
  server: string | null;
  title: string | null;
}

export async function collectSite(siteUrl?: string): Promise<SiteData | null> {
  if (!siteUrl) return null;
  let url = siteUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return null;
  }

  try {
    const res = await fetchWithTimeout(url, {
      timeoutMs: 6000,
      redirect: "follow",
      headers: { "user-agent": "receipts-protocol/1.0 (+https://receipts.xyz)" },
    });
    let title: string | null = null;
    try {
      const text = await res.text();
      const m = text.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
      title = m ? m[1].trim() : null;
    } catch {
      /* body not needed */
    }
    return {
      found: res.ok,
      url,
      host,
      status: res.status,
      https: url.startsWith("https"),
      lastModified: res.headers.get("last-modified"),
      server: res.headers.get("server"),
      title,
    };
  } catch {
    return { found: false, url, host, status: null, https: url.startsWith("https"), lastModified: null, server: null, title: null };
  }
}
