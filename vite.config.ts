import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // React core — always needed first, keep tiny + cacheable
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-core";
          }
          // Framer Motion — large animation library, separate chunk for caching
          if (id.includes("node_modules/framer-motion/")) {
            return "framer-motion";
          }
          // Router
          if (
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/react-router-dom") ||
            id.includes("node_modules/@remix-run/")
          ) {
            return "router";
          }
          // i18n
          if (
            id.includes("node_modules/i18next") ||
            id.includes("node_modules/react-i18next")
          ) {
            return "i18n";
          }
          // Lenis smooth scroll
          if (id.includes("node_modules/lenis/")) {
            return "lenis";
          }
        },
      },
    },
  },
});