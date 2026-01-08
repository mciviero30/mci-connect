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
 * Queue PDF generation
 */
export async function queuePDFGeneration(jobId, dimensionSetId, options) {
  const db = await initPDFQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PDF_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(PDF_QUEUE_STORE);
    
    const request = store.add({
      job_id: jobId,
      dimension_set_id: dimensionSetId,
      options,
      status: 'pending',
      timestamp: Date.now(),
      retry_count: 0
    });
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
 * Mark PDF job as complete
 */
export async function markPDFComplete(queueId, pdfMetadata) {
  const db = await initPDFQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PDF_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(PDF_QUEUE_STORE);
    const getRequest = store.get(queueId);
    
    getRequest.onsuccess = () => {
      const job = getRequest.result;
      if (job) {
        job.status = 'completed';
        job.completed_at = Date.now();
        job.pdf_metadata = pdfMetadata;
        
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