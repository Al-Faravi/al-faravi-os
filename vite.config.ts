import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    react(),
    basicSsl(), // Localhost-কে HTTPS করবে
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/logo.png', 'icons/alfaravi logo.png'],
      
      // Development মোডে PWA টেস্ট করার জন্য:
      devOptions: {
        enabled: true,
        type: 'module'
      },

      manifest: {
        name: 'Al_Faravi-os Workspace',
        short_name: 'Faravi OS',
        description: 'Premium Collaborative Learning Environment',
        theme_color: '#0D0E0F',
        background_color: '#0D0E0F',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      }
    })
  ]
});