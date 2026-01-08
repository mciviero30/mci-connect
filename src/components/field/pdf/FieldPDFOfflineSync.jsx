/**
 * Field PDF Offline Sync
 * 
 * Syncs offline-generated PDFs to server when online
 */

import { getPendingPDFJobs, markPDFSynced, markPDFFailed } from './FieldPDFQueue';

let syncInProgress = false;
let syncListeners = [];

/**
 * Sync offline PDFs
 */
export async function syncOfflinePDFs(base44Client) {
  if (syncInProgress) {
    console.log('PDF sync already in progress');
    return { already_syncing: true };
  }
  
  if (!navigator.onLine) {
    console.log('Cannot sync PDFs - offline');
    return { offline: true };
  }
  
  syncInProgress = true;
  notifySyncListeners('syncing');
  
  try {
    const pendingJobs = await getPendingPDFJobs();
    
    if (pendingJobs.length === 0) {
      console.log('No pending PDFs to sync');
      syncInProgress = false;
      notifySyncListeners('idle');
      return { synced: 0, failed: 0 };
    }
    
    console.log(`Syncing ${pendingJobs.length} offline PDF(s)`);
    
    const results = {
      synced: 0,
      failed: 0,
      errors: []
    };
    
    for (const job of pendingJobs) {
      try {
        await syncPDFJob(job, base44Client);
        await markPDFSynced(job.queue_id, {
          synced_at: Date.now(),
          uploaded: true
        });
        
        results.synced++;
        console.log(`✓ Synced PDF: ${job.dimension_set_id}`);
        
      } catch (error) {
        console.error(`✗ Failed to sync PDF ${job.dimension_set_id}:`, error);
        
        await markPDFFailed(job.queue_id, error);
        
        results.failed++;
        results.errors.push({
          job_id: job.job_id,
          error: error.message
        });
      }
    }
    
    syncInProgress = false;
    notifySyncListeners('idle');
    
    return results;
    
  } catch (error) {
    console.error('PDF sync failed:', error);
    syncInProgress = false;
    notifySyncListeners('error');
    throw error;
  }
}

/**
 * Sync individual PDF job
 */
async function syncPDFJob(job, base44Client) {
  // Upload PDF blob to storage
  const file = new File([job.pdf_blob], `dimension_set_${job.dimension_set_id}_rev${job.options.revision_number || 1}.pdf`, {
    type: 'application/pdf'
  });
  
  const { file_url } = await base44Client.integrations.Core.UploadFile({ file });
  
  console.log('PDF uploaded:', file_url);
  
  // Create DimensionSetExport record or similar tracking entity
  // This links the PDF to the dimension set for future access
  
  return {
    uploaded: true,
    file_url,
    synced_at: Date.now()
  };
}

/**
 * Subscribe to sync status changes
 */
export function subscribePDFSync(callback) {
  syncListeners.push(callback);
  
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
}

/**
 * Notify sync listeners
 */
function notifySyncListeners(status) {
  syncListeners.forEach(cb => cb(status));
}

/**
 * Get sync status
 */
export function getPDFSyncStatus() {
  return syncInProgress ? 'syncing' : 'idle';
}

/**
 * Auto-sync on connectivity change
 */
export function initPDFAutoSync(base44Client) {
  window.addEventListener('online', async () => {
    console.log('Network restored - syncing offline PDFs');
    
    try {
      const result = await syncOfflinePDFs(base44Client);
      
      if (result.synced > 0) {
        console.log(`✓ Auto-synced ${result.synced} PDF(s)`);
      }
      
      if (result.failed > 0) {
        console.error(`✗ ${result.failed} PDF(s) failed to sync`);
      }
      
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  });
}