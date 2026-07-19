import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://nexspace-wsl5.onrender.com',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
