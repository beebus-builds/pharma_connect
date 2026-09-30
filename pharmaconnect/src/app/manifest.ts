import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PharmaConnect — Medicines Near You",
    short_name: "PharmaConnect",
    description:
      "Search medicines and find the nearest pharmacy with stock in hand across Nepal. Works offline for browsing the medicine catalog.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: "#2f9480",
    lang: "en",
    categories: ["health", "medical", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search medicines", url: "/#search", description: "Find a medicine near you" },
      { name: "Medicine catalog", url: "/medicines", description: "Browse medicines and prices" },
      { name: "My requests", url: "/dashboard/patient", description: "Track your stock requests" },
    ],
    // `id` must be same-origin as the document, otherwise Chrome ignores it
    // (and logs "property 'id' ignored" once per installability check).
    // A stable "/" works on localhost:3000, :3002, preview and prod alike —
    // never put an absolute URL here.
    id: "/",
  };
}
