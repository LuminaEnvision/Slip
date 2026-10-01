import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { Pwa } from "@/components/pwa";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "800"],
  variable: "--font-display",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: { default: "slip: pay links with a receipt built in", template: "%s · slip" },
  description: "Pay someone, or bill for a service. Every receipt stays.",
  applicationName: "slip",
  appleWebApp: { capable: true, title: "slip", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1de35f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable}`}>
        <div className="wrap">
          <div className="head">
            <a className="logo" href="/">
              sli<span>p</span>
            </a>
            <span className="chip">USDG</span>
          </div>
          <p className="tag">Pay someone, or bill for a service. Every receipt stays.</p>
          {children}
          <Pwa />
          <p className="foot">
            USDG on Robinhood Chain. Gas is paid in ETH.
            <br />
            <a href="/terms">Terms</a>
            {" · "}
            <a href="/privacy">Privacy</a>
            {" · "}
            <a href="/withdraw">Fees</a>
          </p>
        </div>
        <Nav />
      </body>
    </html>
  );
}
