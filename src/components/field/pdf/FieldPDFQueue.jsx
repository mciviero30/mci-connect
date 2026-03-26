/**
 * Field PDF Queue
 * 
 * Manages offline PDF generation queue
 */

const PDF_QUEUE_STORE = 'pdf_generation_queue';

/**
 * Initialize PDF queue
 */
async function initPDFQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mci_field_pdf_queue', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(PDF_QUEUE_STORE)) {
        const store = db.createObjectStore(PDF_QUEUE_STORE, { keyPath: 'queue_id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('job_id', 'job_id', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Queue PDF generation (with duplicate detection)
 */
export async function queuePDFGeneration(jobId, dimensionSetId, options, pdfBlob, dataHash) {
  const db = await initPDFQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PDF_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(PDF_QUEUE_STORE);
    
    // Check for duplicate first
    const index = store.index('job_id');
    const checkRequest = index.getAll(jobId);
    
    checkRequest.onsuccess = () => {
      const existing = checkRequest.result.find(job => 
        job.dimension_set_id === dimensionSetId &&
        job.status === 'pending' &&
        job.data_hash === dataHash
      );
      
      if (existing) {
        resolve({ duplicate: true, queue_id: existing.queue_id });
        return;
      }
      
      const request = store.add({
        job_id: jobId,
        dimension_set_id: dimensionSetId,
        options,
        status: 'pending',
        timestamp: Date.now(),
        retry_count: 0,
        pdf_blob: pdfBlob,
        data_hash: dataHash,
        generated_offline: true
      });
      
      request.onsuccess = () => resolve({ duplicate: false, queue_id: request.result });
      request.onerror = () => reject(request.error);
    };
    
    checkRequest.onerror = () => reject(checkRequest.error);
  });
}

/**
 * Generate PDF hash for duplicate detection
 */
export function generatePDFHash(dataset) {
  const hashData = {
    dimension_ids: dataset.dimensions.map(d => d.id || d.local_id).sort(),
    benchmark_ids: dataset.benchmarks.map(b => b.id || b.local_id).sort(),
    dimension_set_id: dataset.dimension_set.id,
    updated_date: dataset.dimension_set.updated_date
  };
  
  return btoa(JSON.stringify(hashData));
}

/**
 * Get pending PDF jobs
 */
export async function getPendingPDFJobs() {
  const db = await initPDFQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PDF_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(PDF_QUEUE_STORE);
    const index = store.index('status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark PDF job as synced
 */
export async function markPDFSynced(queueId, syncResult) {
  const db = await initPDFQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PDF_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(PDF_QUEUE_STORE);
    const getRequest = store.get(queueId);
    
    getRequest.onsuccess = () => {
      const job = getRequest.result;
      if (job) {
        job.status = 'synced';
        job.synced_at = Date.now();
        job.sync_result = syncResult;
        
        const putRequest = store.put(job);
        putRequest.onsuccess = () => resolve(job);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('PDF job not found'));
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Mark PDF job as failed
 */
export async function markPDFFailed(queueId, error) {
  const db = await initPDFQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PDF_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(PDF_QUEUE_STORE);
    const getRequest = store.get(queueId);
    
    getRequest.onsuccess = () => {
      const job = getRequest.result;
      if (job) {
        job.status = 'failed';
        job.failed_at = Date.now();
        job.error_message = error.message;
        job.retry_count = (job.retry_count || 0) + 1;
        
        const putRequest = store.put(job);
        putRequest.onsuccess = () => resolve(job);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('PDF job not found'));
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}