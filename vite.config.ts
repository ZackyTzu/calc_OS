import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Served from https://zackytzu.github.io/calc_OS/ (GitHub Pages). Override with BASE_PATH=/ for other hosts.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/calc_OS/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
