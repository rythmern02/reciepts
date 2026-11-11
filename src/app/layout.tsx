import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ShareProvider } from "@/components/share-modal";
import { TopBanner } from "@/components/top-banner";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Receipts · every Solana token has a receipt",
  description:
    "Paste a Solana token and get a one-page evidence card in under 10 seconds: team, work, pulse, money, wallet. Every line links to its source.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://receipts.xyz"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Receipts · every Solana token has a receipt",
    description: "Who the team is, what they shipped, whether they are still shipping, and where the money went.",
    url: "https://receipts.xyz",
    siteName: "Receipts",
    images: [
      {
        url: "/banner.png",
        width: 1200,
        height: 630,
        alt: "Receipts — Solana Token Evidence Card",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Receipts · every Solana token has a receipt",
    description: "Who the team is, what they shipped, whether they are still shipping, and where the money went.",
    images: ["/banner.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}>
      <body>
        <div className="toplight" />
        <div className="grain" />
        <ShareProvider>
          <TopBanner />
          <SiteNav />
          <main className="relative z-10">{children}</main>
          <SiteFooter />
        </ShareProvider>
      </body>
    </html>
  );
}
