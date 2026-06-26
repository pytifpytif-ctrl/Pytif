import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png'],
      manifest: {
        name: 'Jiokoe',
        short_name: 'Jiokoe',
        description: 'Lock your money, get it back on your M-Pesa schedule.',
        theme_color: '#f97316',
        background_color: '#171717',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/app',
        categories: ['finance', 'productivity'],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        disableDevLogs: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase API/auth is never cached — leave it out of the SW so requests
          // bypass Workbox (avoids noisy dev console logs on every poll/realtime refresh).
        ],
      },
      devOptions: {
        // PWA off in dev: cleaner console, no SW intercepting Supabase on every request.
        // Test install/offline with: npm run build && npm run preview
        enabled: false,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
}))
