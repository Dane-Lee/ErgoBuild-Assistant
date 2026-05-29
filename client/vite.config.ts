import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const clientDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: clientDir,
  plugins: [react()],
  server: {
    port: 5273,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:4100",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(clientDir, "../dist"),
    emptyOutDir: true,
  },
});
