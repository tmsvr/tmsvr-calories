import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  // Served at https://tmsvr.github.io/tmsvr-calories/ — the base only
  // applies to builds so the local dev server stays at /.
  base: command === "build" ? "/tmsvr-calories/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-180.png"],
      manifest: {
        // start_url/scope default to the Vite base; icon paths are
        // relative so they work under the /tmsvr-calories/ subpath too.
        name: "Macros — Calorie & Macro Tracker",
        short_name: "Macros",
        description: "Personal quick-add calorie and macro tracker",
        theme_color: "#0b0b0f",
        background_color: "#0b0b0f",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
}));
