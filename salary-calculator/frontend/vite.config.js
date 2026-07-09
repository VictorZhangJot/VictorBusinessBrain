import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4841,
    proxy: {
      '/api': {
        target: 'http://localhost:4840',
        changeOrigin: true,
      },
    },
  },
});
