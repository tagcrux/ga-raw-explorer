import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset paths relative, so the same build works under any sub-path
// (GitHub Pages /<repo>/, Apache /projects/ga-raw-explorer/dist/, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173, strictPort: true },
  preview: { host: true, port: 4173, strictPort: true },
});
