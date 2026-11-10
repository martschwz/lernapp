import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Die App liegt auf GitHub Pages unter https://martschwz.github.io/lernapp/
export default defineConfig({
  base: "/lernapp/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Lernapp",
        short_name: "Lernapp",
        description: "Vokabeln, 1×1 und mehr – mit Karteikasten.",
        lang: "de",
        start_url: "/lernapp/",
        scope: "/lernapp/",
        display: "standalone",
        background_color: "#f3f5fa",
        theme_color: "#2f5bd3",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/lernapp/index.html",
      },
    }),
  ],
  test: { environment: "node" },
} as never);
