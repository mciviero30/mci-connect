import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Tesseract from 'tesseract.js';

export default function PDFProcessor({ pdfFile, jobId, onComplete, onCancel }) {
  const [status, setStatus] = useState('loading'); // loading, processing, success, error
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [extractedPlans, setExtractedPlans] = useState([]);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (pdfFile) {
      processPDF();
    }
  }, [pdfFile]);

  const extractTextFromRegion = async (canvas, x, y, width, height) => {
    try {
      // Create a temporary canvas for the region
      const regionCanvas = document.createElement('canvas');
      regionCanvas.width = width;
      regionCanvas.height = height;
      const ctx = regionCanvas.getContext('2d');
      
      // Increase contrast for better OCR
      ctx.filter = 'contrast(2) brightness(1.2)';
      ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
      
      // OCR on the region with better settings
      const { data: { text } } = await Tesseract.recognize(
        regionCanvas,
        'eng',
        {
          logger: () => {}, // Silent
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
        }
      );
      
      return text.trim();
    } catch (err) {
      console.error('OCR error:', err);
      return '';
    }
  };

  const extractDrawingNumber = (text) => {
    // Look for patterns like IN-000, IN-001, IN-500, etc.
    const patterns = [
      /IN-\d{3}/i,
      /IN-\d{2,4}/i,
      /[A-Z]{2}-\d{3}/i,
      /[A-Z]{1,3}-\d{2,4}/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].toUpperCase();
      }
    }
    
    return null;
  };

  const processPDF = async () => {
    try {
      setStatus('loading');
      setProgress(5);

      // Load PDF.js
      if (!window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        await new Promise(resolve => setTimeout(resolve, 100));
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      }

      setProgress(10);

      // Load PDF
      const loadingTask = window.pdfjsLib.getDocument(pdfFile);
      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);
      setProgress(20);

      setStatus('processing');
      const plans = [];

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        setCurrentPage(pageNum);
        
        const page = await pdf.getPage(pageNum);
        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        // Render page to canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Extract drawing number from bottom-right corner (where IN-000 appears)
        const regionWidth = canvas.width * 0.25; // Right 25% of page
        const regionHeight = canvas.height * 0.2; // Bottom 20% of page
        const regionX = canvas.width - regionWidth;
        const regionY = canvas.height - regionHeight;

        const ocrText = await extractTextFromRegion(
          canvas, 
          regionX, 
          regionY, 
          regionWidth, 
          regionHeight
        );

        const drawingNumber = extractDrawingNumber(ocrText);
        const planName = drawingNumber || `Page ${pageNum} - Pending Confirmation`;
        const needsConfirmation = !drawingNumber;

        // Convert canvas to blob and upload
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], `${planName}.png`, { type: 'image/png' });
        
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        plans.push({
          name: planName,
          file_url,
          page_number: pageNum,
          needs_confirmation: needsConfirmation
        });

        const progressPercent = 20 + (pageNum / pdf.numPages) * 70;
        setProgress(progressPercent);
      }

      setExtractedPlans(plans);
      setProgress(90);

      // Create all plans in database
      for (const plan of plans) {
        await base44.entities.Plan.create({
          job_id: jobId,
          name: plan.name,
          file_url: plan.file_url,
          order: plan.page_number - 1,
          needs_confirmation: plan.needs_confirmation || false
        });
      }

      setProgress(100);
      setStatus('success');
      
      setTimeout(() => {
        onComplete(plans.length);
      }, 1500);

    } catch (err) {
      console.error('PDF processing error:', err);
      setStatus('error');
      setError(err.message || 'Error processing PDF');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Loading PDF...
              </h3>
            </>
          )}

          {status === 'processing' && (
            <>
              <div className="relative w-16 h-16 mx-auto mb-4">
                <FileText className="w-16 h-16 text-amber-500" />
                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {currentPage}/{totalPages}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Processing Pages...
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Extracting drawing numbers and creating plans
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Success!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {extractedPlans.length} plans created
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Error
              </h3>
              <p className="text-sm text-red-500 dark:text-red-400 mb-4">
                {error}
              </p>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Close
              </button>
            </>
          )}

          {(status === 'loading' || status === 'processing') && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {Math.round(progress)}%
              </p>
            </div>
          )}

          {status === 'processing' && extractedPlans.length > 0 && (
            <div className="mt-4 max-h-32 overflow-y-auto">
              <div className="text-left space-y-1">
                {extractedPlans.map((plan, idx) => (
                  <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                    <span className={plan.needs_confirmation ? 'text-amber-500' : ''}>
                      {plan.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}