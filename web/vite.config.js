import { defineConfig } from 'vite';
export default defineConfig({
  base: '/static/dist/',
  build: {
    outDir: '../static/dist', emptyOutDir: true,
    rollupOptions: { input: 'src/main.jsx', output: {
      entryFileNames: 'app.js', chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: asset => asset.name?.endsWith('.css') ? 'app.css' : 'assets/[name]-[hash][extname]'
    }}
  }
});
