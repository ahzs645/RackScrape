import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'path';

export default defineConfig({
  plugins: [react()],
  root: join(__dirname),
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@': join(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist'
  }
});
