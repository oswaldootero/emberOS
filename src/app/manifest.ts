import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EmberOS — Heaven's Leaf Mission Control",
    short_name: "EmberOS",
    description:
      "A cinematic AI-powered media operating system for the Heaven's Leaf brotherhood.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        url: "/dashboard",
        icons: [{ src: "/icons/192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Prospecting",
        url: "/prospects",
        icons: [{ src: "/icons/192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Add prospect",
        url: "/prospects/new",
        icons: [{ src: "/icons/192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
