import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crossOriginIsolation } from './vite-cross-origin-isolation';

export default defineConfig({
  plugins: [react(), crossOriginIsolation()],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    proxy: {
      '/template': 'http://localhost:3000',
      '/chat': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
});
