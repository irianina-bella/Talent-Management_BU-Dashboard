import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          xlsx: ['xlsx'],
          export: ['html-to-image', 'jspdf'],
        },
      },
    },
  },
  worker: { format: 'es' },
});
