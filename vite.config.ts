import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // আপাতত আইকন না থাকায় PWA প্লাগিন বন্ধ রাখছি
    /* 
    VitePWA({
      registerType: 'autoUpdate',
      ... (বাকি কোড)
    }) 
    */
  ],
})