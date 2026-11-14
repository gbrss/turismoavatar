// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.turismoavatar.cl',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  image: {
    // Imágenes locales optimizadas en build (AVIF/WebP + srcset)
    responsiveStyles: true,
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/reservas/gracias'),
      changefreq: 'weekly',
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
