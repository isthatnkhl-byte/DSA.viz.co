import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rootDir = import.meta.dirname;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
      "@tanstack/react-start/server": path.resolve(rootDir, "./src/lib/react-start-shim.ts"),
      "@tanstack/react-start": path.resolve(rootDir, "./src/lib/react-start-shim.ts"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(rawId: string) {
          const id = rawId.replace(/\\/g, "/");
          if (
            id.includes("/clsx/") ||
            id.endsWith("/clsx") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge") ||
            id.includes("@radix-ui") ||
            id.includes("lucide-react")
          ) {
            return "vendor-ui";
          }
          if (id.includes("firebase") || id.includes("@firebase")) {
            return "vendor-firebase";
          }
          if (id.includes("@monaco-editor") || id.includes("prism-react-renderer")) {
            return "vendor-editor";
          }
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("/d3/")) {
            return "vendor-charts";
          }
          if (id.includes("motion") || id.includes("framer-motion")) {
            return "vendor-motion";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: process.env.DISABLE_HMR === "true" || !!process.env.V0_ENV ? false : undefined,
    watch: process.env.DISABLE_HMR === "true" ? null : {},
  },
});
