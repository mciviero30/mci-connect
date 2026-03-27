import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true'
    }),
    react(),
  ],
  build: {
    // Raise warning threshold a bit — large chunks are now split manually
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Heavy PDF library — load only on demand
          if (id.includes('jspdf') || id.includes('jsPDF')) return 'vendor-jspdf';
          // Map library — load only on demand
          if (id.includes('leaflet')) return 'vendor-leaflet';
          // Canvas/screenshot — load only on demand
          if (id.includes('html2canvas')) return 'vendor-html2canvas';
          // Core React ecosystem (always needed)
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
          // Radix UI primitives (shared UI)
          if (id.includes('@radix-ui')) return 'vendor-radix';
          // Tanstack Query
          if (id.includes('@tanstack')) return 'vendor-tanstack';
          // Date utilities
          if (id.includes('date-fns')) return 'vendor-dates';
          // Lucide icons
          if (id.includes('lucide')) return 'vendor-icons';
          // Other node_modules → generic vendor chunk
          if (id.includes('node_modules')) return 'vendor-misc';
        }
      }
    }
  }
});
