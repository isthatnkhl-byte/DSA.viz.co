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
        manualChunks(id: string) {
          if (id.includes("node_modules/@excalidraw")) {
            return "vendor-excalidraw";
          }
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) {
            return "vendor-firebase";
          }
          if (id.includes("node_modules/@monaco-editor") || id.includes("node_modules/prism-react-renderer")) {
            return "vendor-editor";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/motion") || id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("node_modules/@radix-ui") || id.includes("node_modules/lucide-react")) {
            return "vendor-ui";
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

