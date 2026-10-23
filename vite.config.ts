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
    modulePreload: {
      resolveDependencies(filename, deps, { hostId, hostType }) {
        if (hostType === "html") {
          // Do not eagerly preload non-critical deferred vendor chunks on initial page HTML
          return deps.filter(
            (dep) =>
              !dep.includes("vendor-charts") &&
              !dep.includes("vendor-firestore") &&
              !dep.includes("vendor-editor") &&
              !dep.includes("cytoscape") &&
              !dep.includes("katex")
          );
        }
        return deps;
      },
    },
    rollupOptions: {
      output: {
        manualChunks(rawId: string) {
          const id = rawId.replace(/\\/g, "/");
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/") ||
            id.includes("/node_modules/react-is/") ||
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/") ||
            id.includes("node_modules/react-is/") ||
            id.includes("@tanstack/")
          ) {
            return "vendor-react";
          }
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
          if (id.includes("firebase/firestore") || id.includes("@firebase/firestore")) {
            return "vendor-firestore";
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
