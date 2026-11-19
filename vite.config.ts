import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PWA (Offline-Fähigkeit + "Zum Home-Bildschirm") lässt sich für Vorschau-Builds abschalten: NO_PWA=1 npm run build
const withPwa = !process.env.NO_PWA;

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    withPwa &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Befliegungsprojekte',
          short_name: 'Befliegungen',
          description: 'Gemeinsame Verwaltung unserer Drohnenbefliegungsprojekte',
          lang: 'de',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '.',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          navigateFallback: 'index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // Kartenkacheln, die schon einmal angesehen wurden, auch offline anzeigen
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-tiles',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
  ],
});
