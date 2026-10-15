import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base: './'` + HashRouter => el sitio funciona en cualquier subruta
// (GitHub Pages, Cloudflare Pages, Netlify...) sin configuración extra.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
