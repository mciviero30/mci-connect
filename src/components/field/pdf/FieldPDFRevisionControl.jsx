/**
 * Field PDF Revision Control
 * 
 * Tracks PDF revisions for audit trail and comparisons
 */

const DB_NAME = 'field_pdf_revisions';
const DB_VERSION = 1;
const REVISIONS_STORE = 'revisions';

/**
 * Initialize revision database
 */
async function initRevisionDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(REVISIONS_STORE)) {
        const store = db.createObjectStore(REVISIONS_STORE, { keyPath: 'revision_id' });
        store.createIndex('dimension_set_id', 'dimension_set_id', { unique: false });
        store.createIndex('job_id', 'job_id', { unique: false });
        store.createIndex('revision_number', 'revision_number', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
  });
}

/**
 * Get next revision number for dimension set
 */
export async function getNextRevisionNumber(dimensionSetId) {
  const db = await initRevisionDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([REVISIONS_STORE], 'readonly');
    const store = transaction.objectStore(REVISIONS_STORE);
    const index = store.index('dimension_set_id');
    
    const request = index.getAll(dimensionSetId);
    
    request.onsuccess = () => {
      const revisions = request.result;
      const maxRevision = revisions.length > 0 
        ? Math.max(...revisions.map(r => r.revision_number))
        : 0;
      resolve(maxRevision + 1);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store revision
 */
export async function storeRevision(revisionData) {
  const db = await initRevisionDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([REVISIONS_STORE], 'readwrite');
    const store = transaction.objectStore(REVISIONS_STORE);
    
    const revision = {
      revision_id: `${revisionData.dimension_set_id}_rev${revisionData.revision_number}`,
      dimension_set_id: revisionData.dimension_set_id,
      job_id: revisionData.job_id,
      revision_number: revisionData.revision_number,
      created_at: Date.now(),
      created_by: revisionData.created_by,
      pdf_blob: revisionData.pdf_blob,
      metadata: revisionData.metadata,
      change_summary: revisionData.change_summary,
      data_snapshot: revisionData.data_snapshot
    };
    
    const request = store.add(revision);
    
    request.onsuccess = () => resolve(revision);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get revision history
 */
export async function getRevisionHistory(dimensionSetId) {
  const db = await initRevisionDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([REVISIONS_STORE], 'readonly');
    const store = transaction.objectStore(REVISIONS_STORE);
    const index = store.index('dimension_set_id');
    
    const request = index.getAll(dimensionSetId);
    
    request.onsuccess = () => {
      const revisions = request.result.sort((a, b) => b.revision_number - a.revision_number);
      resolve(revisions);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get specific revision
 */
export async function getRevision(revisionId) {
  const db = await initRevisionDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([REVISIONS_STORE], 'readonly');
    const store = transaction.objectStore(REVISIONS_STORE);
    
    const request = store.get(revisionId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate change summary by comparing datasets
 */
export function generateChangeSummary(previousData, currentData) {
  const changes = {
    dimensions: compareCollections(previousData?.dimensions || [], currentData.dimensions),
    benchmarks: compareCollections(previousData?.benchmarks || [], currentData.benchmarks),
    metadata_changes: compareMetadata(previousData?.dimension_set, currentData.dimension_set),
    summary_text: ''
  };
  
  // Generate human-readable summary
  const summaryParts = [];
  
  if (changes.dimensions.added > 0) {
    summaryParts.push(`${changes.dimensions.added} dimension(s) added`);
  }
  if (changes.dimensions.removed > 0) {
    summaryParts.push(`${changes.dimensions.removed} dimension(s) removed`);
  }
  if (changes.dimensions.modified > 0) {
    summaryParts.push(`${changes.dimensions.modified} dimension(s) modified`);
  }
  
  if (changes.benchmarks.added > 0) {
    summaryParts.push(`${changes.benchmarks.added} benchmark(s) added`);
  }
  if (changes.benchmarks.removed > 0) {
    summaryParts.push(`${changes.benchmarks.removed} benchmark(s) removed`);
  }
  
  if (changes.metadata_changes.length > 0) {
    summaryParts.push(`${changes.metadata_changes.length} metadata change(s)`);
  }
  
  changes.summary_text = summaryParts.length > 0 
    ? summaryParts.join('; ')
    : 'Initial revision';
  
  return changes;
}

/**
 * Compare collections
 */
function compareCollections(previous, current) {
  const prevIds = new Set(previous.map(item => item.id || item.local_id));
  const currIds = new Set(current.map(item => item.id || item.local_id));
  
  const added = current.filter(item => !prevIds.has(item.id || item.local_id)).length;
  const removed = previous.filter(item => !currIds.has(item.id || item.local_id)).length;
  
  // Check for modifications
  let modified = 0;
  current.forEach(currItem => {
    const id = currItem.id || currItem.local_id;
    const prevItem = previous.find(p => (p.id || p.local_id) === id);
    
    if (prevItem && isModified(prevItem, currItem)) {
      modified++;
    }
  });
  
  return { added, removed, modified };
}

/**
 * Check if item was modified
 */
function isModified(previous, current) {
  // Check critical fields for changes
  const checkFields = ['value_feet', 'value_inches', 'value_fraction', 'measurement_type', 'area', 'elevation'];
  
  return checkFields.some(field => previous[field] !== current[field]);
}

/**
 * Compare metadata
 */
function compareMetadata(previous, current) {
  if (!previous) return ['Initial version'];
  
  const changes = [];
  
  if (previous.workflow_state !== current.workflow_state) {
    changes.push(`Status: ${previous.workflow_state} → ${current.workflow_state}`);
  }
  
  if (previous.approved_by !== current.approved_by) {
    changes.push('Approval changed');
  }
  
  return changes;
}