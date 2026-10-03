import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const name = env.VITE_APP_NAME || 'Pixel Net';
  return {
    // BASE_PATH lets the same build serve from a domain root or a sub-path
    // such as GitHub Pages: BASE_PATH=/pixel-net/ npm run build
    base: env.BASE_PATH || '/',
    plugins: [
      react(),
      VitePWA({
        // A new version downloads in the background and is used the next time
        // the app opens. There is no prompt.
        registerType: 'autoUpdate',
        includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name,
          short_name: name,
          description: 'A hillshade and a Schmidt net of every pixel in a DEM.',
          display: 'standalone',
          background_color: '#f7f5f1',
          theme_color: '#ffffff',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Everything the app needs with no signal, the DEMs included.
          globPatterns: ['**/*.{js,css,html,woff2,json,tif,png,svg}'],
          // The link-preview image is read by other sites, never by the app.
          globIgnores: ['**/preview.png'],
          // The default limit of 2 MB would silently leave a larger DEM out.
          maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        },
      }),
    ],
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  };
});
