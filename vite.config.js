import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true'
    }),
    react(),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    // Strip console.log in production builds
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn', 'console.debug', 'console.info'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('jspdf') || id.includes('jsPDF')) return 'vendor-jspdf';
          if (id.includes('leaflet')) return 'vendor-leaflet';
          if (id.includes('html2canvas')) return 'vendor-html2canvas';
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('@tanstack')) return 'vendor-tanstack';
          if (id.includes('date-fns')) return 'vendor-dates';
          if (id.includes('lucide')) return 'vendor-icons';
          if (id.includes('node_modules')) return 'vendor-misc';
        }
      }
    }
  }
});
