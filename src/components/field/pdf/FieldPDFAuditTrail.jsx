/**
 * Field PDF Audit Trail
 * 
 * Tracks all PDF generation for compliance
 */

const AUDIT_STORE = 'pdf_audit_trail';

/**
 * Initialize audit trail
 */
async function initAuditTrail() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mci_field_pdf_audit', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(AUDIT_STORE)) {
        const store = db.createObjectStore(AUDIT_STORE, { autoIncrement: true });
        store.createIndex('document_id', 'document_id', { unique: false });
        store.createIndex('job_id', 'job_id', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('generated_by', 'generated_by', { unique: false });
      }
    };
  });
}

/**
 * Log PDF generation
 */
export async function logPDFGeneration(pdfResult, normalizedData) {
  const db = await initAuditTrail();
  const { generatePDFMetadata, generateBenchmarkManifest } = await import('./FieldPDFMetadataGenerator');
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIT_STORE], 'readwrite');
    const store = transaction.objectStore(AUDIT_STORE);
    
    // Generate comprehensive metadata
    const fullMetadata = generatePDFMetadata(normalizedData, pdfResult);
    const benchmarkManifest = generateBenchmarkManifest(
      normalizedData.benchmarks,
      normalizedData.dimensions
    );
    
    const auditRecord = {
      document_id: normalizedData.metadata.document_id,
      job_id: normalizedData.job.id,
      dimension_set_id: normalizedData.dimension_set.id,
      revision_number: normalizedData.metadata.revision_number,
      generated_at: Date.now(),
      generated_by: normalizedData.metadata.generated_by,
      offline_generated: normalizedData.metadata.offline_generated,
      page_count: normalizedData.metadata.page_count,
      dimension_count: normalizedData.dimensions.length,
      benchmark_count: normalizedData.benchmarks.length,
      data_hash: hashDataset(normalizedData),
      file_size: pdfResult.blob.size,
      
      // Extended metadata
      full_metadata: fullMetadata,
      benchmark_manifest: benchmarkManifest
    };
    
    const request = store.add(auditRecord);
    
    request.onsuccess = () => resolve(auditRecord);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get audit trail for job
 */
export async function getAuditTrailForJob(jobId) {
  const db = await initAuditTrail();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIT_STORE], 'readonly');
    const store = transaction.objectStore(AUDIT_STORE);
    const index = store.index('job_id');
    const request = index.getAll(jobId);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Verify PDF reproducibility
 */
export async function verifyPDFReproducibility(documentId) {
  const db = await initAuditTrail();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIT_STORE], 'readonly');
    const store = transaction.objectStore(AUDIT_STORE);
    const index = store.index('document_id');
    const request = index.getAll(documentId);
    
    request.onsuccess = () => {
      const records = request.result || [];
      
      if (records.length === 0) {
        resolve({ reproducible: false, reason: 'No records found' });
        return;
      }
      
      // Check if all hashes match
      const hashes = records.map(r => r.data_hash);
      const allMatch = hashes.every(h => h === hashes[0]);
      
      resolve({
        reproducible: allMatch,
        generation_count: records.length,
        first_generated: records[0].generated_at,
        last_generated: records[records.length - 1].generated_at,
        unique_hashes: [...new Set(hashes)].length
      });
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Hash dataset for reproducibility check
 */
function hashDataset(data) {
  // Create deterministic string representation
  const str = JSON.stringify({
    job_id: data.job.id,
    dimension_set_id: data.dimension_set.id,
    dimension_count: data.dimensions.length,
    dimension_values: data.dimensions.map(d => d.display_value).join(',')
  });
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}