/**
 * PDF DOWNLOAD BUTTON
 * Reusable button component for downloading PDFs
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { downloadQuotePDF } from './generateQuotePDF';
import { downloadInvoicePDF } from './generateInvoicePDF';

export default function PDFDownloadButton({ 
  data, 
  type = 'quote', 
  variant = 'outline',
  className = '',
  children 
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Guard: Don't render if no data or no ID
  if (!data || !data.id) {
    return null;
  }

  const handleDownload = async () => {
    // Additional safety check before generating
    if (!data || !data.id) {
      console.warn('Cannot generate PDF: Missing data or ID');
      return;
    }

    setIsGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (type === 'quote') {
        downloadQuotePDF(data);
      } else if (type === 'invoice') {
        downloadInvoicePDF(data);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating}
      variant={variant}
      className={className}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          {children || 'Download PDF'}
        </>
      )}
    </Button>
  );
}