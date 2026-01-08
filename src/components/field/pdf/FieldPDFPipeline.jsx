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
    
    const { getNextRevisionNumber, storeRevision, generateChangeSummary, getRevisionHistory } = await import('./FieldPDFRevisionControl');
    
    // Get revision number
    const revisionNumber = await getNextRevisionNumber(dimensionSetId);
    
    // Get previous revision for change comparison
    const revisionHistory = await getRevisionHistory(dimensionSetId);
    const previousRevision = revisionHistory.length > 0 ? revisionHistory[0] : null;
    
    // Step 1: Collect data
    const dataset = await collectPDFData(jobId, dimensionSetId, {
      user_email: user.email,
      user_name: user.full_name,
      revision_number: revisionNumber,
      include_photos: options.include_photos || false,
      include_plans: options.include_plans || false
    });
    
    console.log('Data collected:', {
      dimensions: dataset.dimensions.length,
      benchmarks: dataset.benchmarks.length,
      photos: dataset.photos.length
    });
    
    // Step 2: Pre-flight validation
    const { preFlightValidation } = await import('./FieldPDFValidator');
    const { validateBenchmarkCompleteness, validateBenchmarkElevations } = await import('./FieldPDFBenchmarkValidator');
    
    const validation = preFlightValidation(dataset);
    
    if (!validation.can_generate) {
      throw new Error(`PDF validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Benchmark-specific validation
    const benchmarkValidation = validateBenchmarkCompleteness(dataset.benchmarks, dataset.dimensions);
    const elevationValidation = validateBenchmarkElevations(dataset.benchmarks);
    
    const allWarnings = [
      ...validation.warnings,
      ...benchmarkValidation.warnings,
      ...elevationValidation.warnings
    ];
    
    if (allWarnings.length > 0) {
      console.warn('PDF validation warnings:', allWarnings);
    }
    
    // Step 3: Generate change summary
    const changeSummary = generateChangeSummary(
      previousRevision?.data_snapshot,
      dataset
    );
    
    console.log('Change summary:', changeSummary.summary_text);
    
    // Step 4: Normalize
    const normalizedData = normalizeForPDF(dataset);
    normalizedData.metadata.change_summary = changeSummary;
    
    console.log('Data normalized and sorted');
    
    // Step 5: Generate PDF
    const pdfResult = await generateFieldPDF(normalizedData, options);
    
    console.log('PDF generated:', {
      pages: normalizedData.metadata.page_count,
      size: pdfResult.blob.size,
      document_id: normalizedData.metadata.document_id,
      revision: revisionNumber
    });
    
    // Step 6: Store revision
    await storeRevision({
      dimension_set_id: dimensionSetId,
      job_id: jobId,
      revision_number: revisionNumber,
      created_by: user.full_name,
      pdf_blob: pdfResult.blob,
      metadata: pdfResult.metadata,
      change_summary: changeSummary,
      data_snapshot: dataset
    });
    
    console.log('Revision stored:', revisionNumber);
    
    // Step 7: Audit trail
    await logPDFGeneration(pdfResult, normalizedData);
    
    console.log('PDF generation logged to audit trail');
    
    return {
      success: true,
      pdf: pdfResult.pdf,
      blob: pdfResult.blob,
      metadata: pdfResult.metadata,
      document_id: normalizedData.metadata.document_id,
      revision_number: revisionNumber,
      change_summary: changeSummary.summary_text,
      validation
    };
    
  } catch (error) {
    console.error('PDF generation failed:', error);
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