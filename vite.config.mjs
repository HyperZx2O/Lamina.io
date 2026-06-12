import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PWA config notes:
// - `registerType: 'prompt'` lets us explicitly trigger SW updates from the
//   client (see src/main.jsx) so we never surprise the user mid-quiz.
// - `injectRegister: false` because main.jsx imports workbox-window and
//   handles registration itself — that gives us access to the `offlineReady`
//   / `needRefresh` events for the OfflinePill badge.
// - Workbox runtime caching covers: curriculum JSON (CacheFirst so it works
//   even on cold start with no network), `/api/packs/*` (StaleWhileRevalidate
//   so the pack list shows up instantly then refreshes in the background),
//   and NCTB static files (precached at build time so the static fallback
//   `/offline-fallback.html` page is always reachable).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'favicon.svg',
        'favicon-progress.svg',
      ],
      manifest: {
        name: 'Lamina — AI Tutor for Bangladeshi Students',
        short_name: 'Lamina',
        description:
          'AI tutor, study packs, and live docs for the NCTB curriculum. Works offline once installed.',
        theme_color: '#141110',
        background_color: '#141110',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'en',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,json,woff2}'],
        navigateFallback: '/offline-fallback.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/docs/],
        // Conservative max cache size — study packs are tiny, but we want
        // the SW to evict stale curriculum chunks eventually.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // Static NCTB curriculum chunks. CacheFirst so the search and
            // RAG paths can keep working on a fully offline boot. These
            // files never change once published, so revalidation is wasted
            // work.
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/data/nctb-curriculum/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'lamina-nctb-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Pack manifest + pack JSON. StaleWhileRevalidate so the
            // /offline hub shows the previously-installed list immediately,
            // and a fresh copy lands in the background when online.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/packs/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'lamina-packs-v1',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // RAG enrichment calls. NetworkFirst so we get fresh results
            // online, but cached results show up when the user is offline
            // and re-tries a question they've asked before.
            urlPattern: ({ url, request }) =>
              request.method === 'POST' &&
              url.pathname === '/api/rag/enrich',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lamina-rag-v1',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 3, // 3 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Enable SW in dev so the offline paths can be tested locally.
        enabled: false,
        type: 'module',
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          katex: ['katex'],
        },
      },
    },
  },
});
