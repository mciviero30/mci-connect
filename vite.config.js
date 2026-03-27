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
          // ── Heavy PDF / canvas ──────────────────────────────────────
          if (id.includes('jspdf') || id.includes('jsPDF')) return 'vendor-jspdf';
          if (id.includes('html2canvas')) return 'vendor-html2canvas';

          // ── OCR (Tesseract) ─────────────────────────────────────────
          if (id.includes('tesseract')) return 'vendor-tesseract';

          // ── 3D (Three.js) ───────────────────────────────────────────
          if (id.includes('three')) return 'vendor-three';

          // ── Spreadsheet (xlsx) ──────────────────────────────────────
          if (id.includes('xlsx')) return 'vendor-xlsx';

          // ── Maps ────────────────────────────────────────────────────
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet';

          // ── Charts ──────────────────────────────────────────────────
          if (id.includes('recharts')) return 'vendor-recharts';

          // ── Animations ──────────────────────────────────────────────
          if (id.includes('framer-motion')) return 'vendor-motion';

          // ── Rich text / markdown ────────────────────────────────────
          if (id.includes('react-quill') || id.includes('react-markdown')) return 'vendor-richtext';

          // ── Date utilities ──────────────────────────────────────────
          if (id.includes('date-fns') || id.includes('moment')) return 'vendor-dates';

          // ── Forms ───────────────────────────────────────────────────
          if (id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms';

          // ── DnD ─────────────────────────────────────────────────────
          if (id.includes('hello-pangea') || id.includes('dnd')) return 'vendor-dnd';

          // ── Gantt ───────────────────────────────────────────────────
          if (id.includes('gantt-task')) return 'vendor-gantt';

          // ── Core React ──────────────────────────────────────────────
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';

          // ── Radix UI ─────────────────────────────────────────────────
          if (id.includes('@radix-ui')) return 'vendor-radix';

          // ── Tanstack ─────────────────────────────────────────────────
          if (id.includes('@tanstack')) return 'vendor-tanstack';

          // ── Icons ─────────────────────────────────────────────────────
          if (id.includes('lucide')) return 'vendor-icons';

          // ── Utilities (lodash, clsx, zod, etc.) ──────────────────────
          if (id.includes('lodash') || id.includes('clsx') || id.includes('zod') ||
              id.includes('class-variance') || id.includes('tailwind-merge')) return 'vendor-utils';

          // ── Everything else ───────────────────────────────────────────
          if (id.includes('node_modules')) return 'vendor-misc';
        }
      }
    }
  }
});
