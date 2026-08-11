/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#FFFFFF',          // 60% White / light background
          card: '#F8FAFC',        // Light Card Background
          navy: '#020F33',        // 25% Deep Navy (Headings/Primary CTA)
          cyan: '#02C2D5',        // 10% AlFaravi Cyan (Highlights & Hover)
          lime: '#A3D803',        // 5% AlFaravi Lime (Tiny Accents)
          border: '#E2E8F0',      // Border color
          textMuted: '#475569',   // Secondary Text
        }
      }
    },
  },
  plugins: [],
}