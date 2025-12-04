/**
 * PDF VIEWER WRAPPER
 * 
 * Isolates PDF.js implementation for easy replacement.
 * Provides consistent API regardless of underlying library.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// PDF.js configuration - centralized for easy updates
const PDFJS_CONFIG = {
  workerSrc: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
  cMapPacked: true,
};

// Lazy load PDF.js
let pdfjs = null;
async function loadPDFJS() {
  if (pdfjs) return pdfjs;
  
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CONFIG.workerSrc;
  pdfjs = pdfjsLib;
  return pdfjs;
}

export default function PDFViewerWrapper({ 
  url, 
  onLoad, 
  onError, 
  onPageChange,
  initialPage = 1,
  initialScale = 1,
  showControls = true,
  className = '',
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(initialScale);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rendering, setRendering] = useState(false);

  // Load PDF document
  useEffect(() => {
    if (!url) return;
    
    let cancelled = false;
    
    async function loadPDF() {
      try {
        setLoading(true);
        setError(null);
        
        const pdfjsLib = await loadPDFJS();
        
        const loadingTask = pdfjsLib.getDocument({
          url,
          cMapUrl: PDFJS_CONFIG.cMapUrl,
          cMapPacked: PDFJS_CONFIG.cMapPacked,
        });
        
        const pdf = await loadingTask.promise;
        
        if (cancelled) return;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(Math.min(initialPage, pdf.numPages));
        setLoading(false);
        
        onLoad?.({ totalPages: pdf.numPages });
      } catch (err) {
        if (cancelled) return;
        console.error('PDF load error:', err);
        setError(err.message || 'Failed to load PDF');
        setLoading(false);
        onError?.(err);
      }
    }
    
    loadPDF();
    
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || rendering) return;
    
    try {
      setRendering(true);
      
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Calculate viewport with rotation
      const viewport = page.getViewport({ scale, rotation });
      
      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Render page
      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;
      
      setRendering(false);
    } catch (err) {
      console.error('Page render error:', err);
      setRendering(false);
    }
  }, [pdfDoc, currentPage, scale, rotation, rendering]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Navigation handlers
  const goToPage = (page) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
    onPageChange?.(newPage);
  };

  const prevPage = () => goToPage(currentPage - 1);
  const nextPage = () => goToPage(currentPage + 1);

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const rotate = () => setRotation(r => (r + 90) % 360);

  const download = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.pdf';
    link.click();
  };

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full bg-slate-100 dark:bg-slate-800 ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading PDF...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20 ${className}`}>
        <div className="text-center p-4">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load PDF</p>
          <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={prevPage} disabled={currentPage <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-300 min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button variant="ghost" size="icon" onClick={nextPage} disabled={currentPage >= totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-300 min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 3}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={rotate}>
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={download}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Canvas container */}
      <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <canvas 
          ref={canvasRef}
          className="shadow-lg max-w-full"
          style={{ 
            maxHeight: '100%',
            objectFit: 'contain'
          }}
        />
        {rendering && (
          <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get PDF as image (for thumbnail generation)
 */
export async function getPDFPageAsImage(url, pageNumber = 1, scale = 0.5) {
  try {
    const pdfjsLib = await loadPDFJS();
    
    const pdf = await pdfjsLib.getDocument({
      url,
      cMapUrl: PDFJS_CONFIG.cMapUrl,
      cMapPacked: PDFJS_CONFIG.cMapPacked,
    }).promise;
    
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('PDF to image error:', error);
    return null;
  }
}

/**
 * Check if file is a PDF
 */
export function isPDF(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.pdf') || lower.includes('application/pdf');
}