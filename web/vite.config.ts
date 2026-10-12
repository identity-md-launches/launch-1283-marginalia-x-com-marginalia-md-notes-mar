import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static export for IPFS / plain-file hosting: relative base, output at the repository root `dist/`.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
});
