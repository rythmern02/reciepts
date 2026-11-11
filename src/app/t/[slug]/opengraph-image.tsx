import { ImageResponse } from "next/og";
import { store } from "@/lib/store";
import { getOrBuildReceipt, resolveInput } from "@/lib/engine/build-receipt";
import { summarize } from "@/lib/summary";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Receipt evidence card";

const INK = { strong: "#178a5c", partial: "#b8720b", thin: "#c8352b" } as const;
const TAG = {
  verified: ["VERIFIED", "#178a5c"],
  found: ["FOUND", "#151515"],
  not_found: ["NOT FOUND", "#8b877c"],
  disputed: ["DISPUTED", "#b8720b"],
} as const;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let receipt = await store.getReceiptBySlug(slug);
  if (!receipt) {
    const r = await resolveInput(slug);
    if (r.address) receipt = await getOrBuildReceipt(r.address).catch(() => null);
  }
  const s = receipt ? summarize(receipt) : null;
  const level = s?.level ?? "thin";

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: "#0a0a0a", fontFamily: "monospace" }}>
        {/* left: headline */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 56px", width: 560, color: "#ededed" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, letterSpacing: 2 }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: "#3ddc97" }} />
            RECEIPTS
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>{s?.ticker ? `$${s.ticker}` : "Receipt"}</div>
            <div style={{ fontSize: 28, color: "#a1a1a1", marginTop: 14 }}>{s?.name ?? "Solana token"}</div>
            <div style={{ fontSize: 26, color: "#6b6b6b", marginTop: 36 }}>
              {s ? `${s.sourced} of ${s.total} lines sourced` : ""}
            </div>
          </div>
          <div style={{ fontSize: 20, color: "#6b6b6b" }}>Every line links to its source · not investment advice</div>
        </div>

        {/* right: the paper */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 56 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 520,
              background: "#f2efe7",
              color: "#151515",
              padding: "40px 40px 34px",
              transform: "rotate(2deg)",
              boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", fontSize: 30, fontWeight: 800, letterSpacing: 10 }}>RECEIPTS</div>
            <div style={{ display: "flex", borderTop: "2px dashed rgba(21,21,21,0.3)", margin: "20px 0 14px" }} />
            {(s?.sections ?? []).map((sec) => (
              <div key={sec.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 24, padding: "7px 0" }}>
                <span style={{ fontWeight: 800, letterSpacing: 3 }}>{sec.title.toUpperCase()}</span>
                <span style={{ color: TAG[sec.status][1], fontWeight: 700 }}>{TAG[sec.status][0]}</span>
              </div>
            ))}
            <div style={{ display: "flex", borderTop: "2px dashed rgba(21,21,21,0.3)", margin: "14px 0 20px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  border: `4px solid ${INK[level]}`,
                  color: INK[level],
                  borderRadius: 10,
                  padding: "6px 16px",
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: 4,
                  transform: "rotate(-8deg)",
                }}
              >
                {level.toUpperCase()}
              </div>
              <div style={{ fontSize: 18, color: "#8b877c" }}>receipts.xyz/t/{s?.slug ?? slug}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
