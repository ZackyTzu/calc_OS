import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import wasmPlugin from 'vite-plugin-wasm';

// Both plugins ship CommonJS typings; under nodenext TypeScript sees the namespace instead of the default export.
const wasm = wasmPlugin as unknown as () => PluginOption;

// Served from https://zackytzu.github.io/calc_OS/ (GitHub Pages). The deploy workflow sets BASE_PATH=/ when the
// CUSTOM_DOMAIN repository variable is present (docs/custom-domain.md); set it yourself for other hosts.
// The COOP/COEP headers give SharedArrayBuffer to the Nspire transfer engine in development;
// in production public/coi-serviceworker.js adds them.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  base: process.env.BASE_PATH ?? '/calc_OS/',
  plugins: [react(), tailwindcss(), wasm()],
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
  optimizeDeps: {
    exclude: ['web-libnspire'],
  },
  server: { headers: isolation },
  preview: { headers: isolation },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
