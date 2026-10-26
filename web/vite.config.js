import { defineConfig } from "vite";

const backend = "http://127.0.0.1:8080";

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/static/dist/",
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: backend,
        changeOrigin: true,
        headers: { Origin: backend },
      },
    },
  },
  build: {
    outDir: "../static/dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/main.jsx",
      output: {
        entryFileNames: "app.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (asset) =>
          asset.name?.endsWith(".css")
            ? "app.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
}));
