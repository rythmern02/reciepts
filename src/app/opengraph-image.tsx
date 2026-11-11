import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Receipts · every Solana token has a receipt";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "#0a0a0a",
          fontFamily: "monospace",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle green ambient light */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: 200,
            width: 800,
            height: 400,
            background: "radial-gradient(circle, rgba(61, 220, 151, 0.12) 0%, rgba(10, 10, 10, 0) 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Left side: Brand, typography & value prop */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 60px",
            width: 620,
            color: "#ededed",
            zIndex: 1,
          }}
        >
          {/* Logo badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#141414",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 40,
              padding: "8px 18px",
              alignSelf: "flex-start",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3ddc97" }} />
            {/* SVG mini receipt */}
            <svg width="15" height="18" viewBox="0 0 18 22">
              <path
                d="M1 1h16v18l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6L1 19z"
                fill="#f2efe7"
              />
              <rect x="4" y="5" width="10" height="1.6" fill="#151515" />
              <rect x="4" y="8.4" width="7" height="1.6" fill="#151515" />
              <rect x="4" y="11.8" width="9" height="1.6" fill="#151515" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>RECEIPTS</span>
          </div>

          {/* Headline */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 62, fontWeight: 400, letterSpacing: -1, lineHeight: 1.05, color: "#ededed" }}>
              Don&apos;t trust.
            </div>
            <div style={{ fontSize: 62, fontWeight: 400, fontStyle: "italic", letterSpacing: -1, lineHeight: 1.05, color: "#f2efe7" }}>
              Check the receipt.
            </div>
            <div style={{ fontSize: 20, color: "#a1a1a1", marginTop: 22, lineHeight: 1.4 }}>
              Every Solana token has a receipt.
            </div>
            <div style={{ fontSize: 16, color: "#6b6b6b", marginTop: 8 }}>
              Team, work, pulse, money, wallet. Every line links to its source.
            </div>
          </div>

          {/* Footer badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#3ddc97",
                background: "#151515",
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.08)",
                letterSpacing: 1,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ddc97" }} />
              SOLANA MAINNET
            </div>
            <div style={{ fontSize: 14, color: "#8b877c" }}>receipts.xyz</div>
          </div>
        </div>

        {/* Right side: The iconic paper receipt */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingRight: 60,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 480,
              background: "#f2efe7",
              color: "#151515",
              padding: "36px 36px 28px",
              transform: "rotate(2.5deg)",
              boxShadow: "0 28px 60px rgba(0,0,0,0.75)",
            }}
          >
            {/* Receipt title */}
            <div style={{ display: "flex", justifyContent: "center", fontSize: 24, fontWeight: 900, letterSpacing: 8 }}>
              RECEIPTS
            </div>
            <div style={{ display: "flex", justifyContent: "center", fontSize: 10, color: "#8b877c", letterSpacing: 2, marginTop: 4 }}>
              SOLANA EVIDENCE REPORT
            </div>
            <div style={{ display: "flex", borderTop: "2px dashed rgba(21,21,21,0.25)", margin: "16px 0 12px" }} />

            {/* Token */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>$JUP</span>
                <span style={{ fontSize: 14, color: "#666" }}>Jupiter</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#178a5c" }}>VERIFIED</div>
            </div>

            <div style={{ display: "flex", borderTop: "1.5px dashed rgba(21,21,21,0.15)", marginBottom: 12 }} />

            {/* Sections */}
            {[
              ["TEAM", "VERIFIED", "#178a5c"],
              ["WORK", "FOUND", "#151515"],
              ["PULSE", "HEALTHY", "#178a5c"],
              ["MONEY", "FOUND", "#151515"],
              ["WALLET", "REVOKED", "#178a5c"],
            ].map(([name, status, col]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 16, padding: "5px 0" }}>
                <span style={{ fontWeight: 800, letterSpacing: 2 }}>{name}</span>
                <span style={{ color: col, fontWeight: 700 }}>{status}</span>
              </div>
            ))}

            <div style={{ display: "flex", borderTop: "2px dashed rgba(21,21,21,0.25)", margin: "14px 0 14px" }} />

            {/* Stamp and domain */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  border: "3px solid #178a5c",
                  color: "#178a5c",
                  borderRadius: 8,
                  padding: "4px 12px",
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: 3,
                  transform: "rotate(-8deg)",
                }}
              >
                STRONG
              </div>
              <div style={{ fontSize: 14, color: "#8b877c" }}>receipts.xyz</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
