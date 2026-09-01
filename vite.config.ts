import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tanstack/react-start/server": path.resolve(__dirname, "./src/lib/react-start-shim.ts"),
      "@tanstack/react-start": path.resolve(__dirname, "./src/lib/react-start-shim.ts"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: process.env.DISABLE_HMR === "true" || !!process.env.V0_ENV ? false : undefined,
    watch: process.env.DISABLE_HMR === "true" ? null : {},
  },
});
