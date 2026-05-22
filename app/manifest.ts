import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Medicare Pharmacy SaaS",
    short_name: "Medicare",
    description: "Smart pharmacy billing, inventory, and compliance.",
    start_url: "/shop/dashboard",
    display: "standalone",
    background_color: "#F7FAFC",
    theme_color: "#00A878",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
