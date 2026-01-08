/**
 * Field PDF Pipeline
 * 
 * Orchestrates complete PDF generation pipeline
 */

import { collectPDFData } from './FieldPDFDataCollector';
import { normalizeForPDF } from './FieldPDFNormalizer';
import { generateFieldPDF } from './FieldPDFGenerator';
import { logPDFGeneration } from './FieldPDFAuditTrail';
import { queuePDFGeneration } from './FieldPDFQueue';

/**
 * Generate PDF (complete pipeline)
 */
export async function generateProductionPDF(jobId, dimensionSetId, user, options = {}) {
  try {
    console.log(`Starting PDF generation: Job ${jobId}, Set ${dimensionSetId}`);
    
    // Step 1: Collect data
    const dataset = await collectPDFData(jobId, dimensionSetId, {
      user_email: user.email,
      user_name: user.full_name,
      revision_number: options.revision_number,
      include_photos: options.include_photos || false,
      include_plans: options.include_plans || false
    });
    
    console.log('Data collected:', {
      dimensions: dataset.dimensions.length,
      benchmarks: dataset.benchmarks.length,
      photos: dataset.photos.length
    });
    
    // Step 2: Normalize
    const normalizedData = normalizeForPDF(dataset);
    
    console.log('Data normalized');
    
    // Step 3: Generate PDF
    const pdfResult = await generateFieldPDF(normalizedData, options);
    
    console.log('PDF generated:', {
      pages: normalizedData.metadata.page_count,
      size: pdfResult.blob.size
    });
    
    // Step 4: Audit trail
    await logPDFGeneration(pdfResult, normalizedData);
    
    console.log('PDF generation logged');
    
    return {
      success: true,
      pdf: pdfResult.pdf,
      blob: pdfResult.blob,
      metadata: pdfResult.metadata,
      document_id: normalizedData.metadata.document_id
    };
    
  } catch (error) {
    console.error('PDF generation failed:', error);
    
    // Queue for retry if offline
    if (!navigator.onLine) {
      await queuePDFGeneration(jobId, dimensionSetId, {
        user_email: user.email,
        user_name: user.full_name,
        ...options
      });
      
      return {
        success: false,
        queued: true,
        error: 'Offline - queued for generation'
      };
    }
    
    throw error;
  }
}

/**
 * Process queued PDFs
 */
export async function processQueuedPDFs(user) {
  const { getPendingPDFJobs, markPDFComplete } = await import('./FieldPDFQueue');
  
  const jobs = await getPendingPDFJobs();
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const job of jobs) {
    try {
      const result = await generateProductionPDF(
        job.job_id,
        job.dimension_set_id,
        user,
        job.options
      );
      
      await markPDFComplete(job.queue_id, result.metadata);
      
      results.success.push({
        queue_id: job.queue_id,
        document_id: result.document_id
      });
      
    } catch (error) {
      results.failed.push({
        queue_id: job.queue_id,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Download PDF
 */
export function downloadPDF(pdfResult, filename) {
  const blob = pdfResult.blob;
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${pdfResult.metadata.document_id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Get PDF statistics
 */
export async function getPDFStats(jobId) {
  const { getAuditTrailForJob } = await import('./FieldPDFAuditTrail');
  
  const records = await getAuditTrailForJob(jobId);
  
  return {
    total_generated: records.length,
    total_size: records.reduce((sum, r) => sum + (r.file_size || 0), 0),
    revisions: [...new Set(records.map(r => r.revision_number))],
    generators: [...new Set(records.map(r => r.generated_by))],
    offline_count: records.filter(r => r.offline_generated).length,
    latest: records[records.length - 1]
  };
}