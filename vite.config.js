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
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn', 'console.debug', 'console.info'],
      },
    },
    rollupOptions: {
      external: (id) => id.startsWith('https://'),
      output: {
        manualChunks: (id) => {
          if (id.startsWith('https://')) return undefined;
          if (id.includes('jspdf') || id.includes('jsPDF')) return 'vendor-jspdf';
          if (id.includes('html2canvas')) return 'vendor-html2canvas';
          if (id.includes('tesseract')) return 'vendor-tesseract';
          if (id.includes('three')) return 'vendor-three';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet';
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('react-quill') || id.includes('react-markdown')) return 'vendor-richtext';
          if (id.includes('date-fns') || id.includes('moment')) return 'vendor-dates';
          if (id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms';
          if (id.includes('hello-pangea') || id.includes('dnd')) return 'vendor-dnd';
          if (id.includes('gantt-task')) return 'vendor-gantt';
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('@tanstack')) return 'vendor-tanstack';
          if (id.includes('lucide')) return 'vendor-icons';
          if (id.includes('lodash') || id.includes('clsx') || id.includes('zod') ||
              id.includes('class-variance') || id.includes('tailwind-merge')) return 'vendor-utils';
          if (id.includes('@base44')) return 'vendor-base44';
          if (id.includes('node_modules')) return 'vendor-misc';
        }
      }
    }
  }
});
