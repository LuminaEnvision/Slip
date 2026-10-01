import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "slip",
    short_name: "slip",
    description: "Send a link, get paid in USDG. The receipt writes itself.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1de35f",
    theme_color: "#1de35f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
