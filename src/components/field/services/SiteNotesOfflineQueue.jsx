/**
 * Site Notes Offline Queue
 * 
 * Manages offline capture and sync for site notes
 */

const QUEUE_KEY = 'site_notes_queue';

/**
 * Queue site note session for processing
 */
export async function queueSession(sessionData) {
  try {
    const queue = loadQueue();
    
    const queueItem = {
      id: sessionData.sessionId || generateQueueId(),
      session_data: sessionData,
      queued_at: new Date().toISOString(),
      status: 'pending',
      retry_count: 0,
      last_error: null
    };
    
    queue.items.push(queueItem);
    saveQueue(queue);
    
    return queueItem;
  } catch (error) {
    console.error('Failed to queue session:', error);
    throw error;
  }
}

/**
 * Process queued sessions
 */
export async function processQueue(base44Client) {
  const queue = loadQueue();
  const results = {
    total: queue.items.length,
    processed: 0,
    failed: 0,
    errors: []
  };
  
  for (const item of queue.items) {
    if (item.status === 'completed') {
      results.processed++;
      continue;
    }
    
    try {
      // Process session through full pipeline
      await processSiteNoteSession(item.session_data, base44Client);
      
      item.status = 'completed';
      item.completed_at = new Date().toISOString();
      results.processed++;
      
    } catch (error) {
      item.status = 'error';
      item.last_error = error.message;
      item.retry_count++;
      results.failed++;
      results.errors.push({
        session_id: item.id,
        error: error.message
      });
    }
  }
  
  // Update queue
  queue.last_sync = new Date().toISOString();
  queue.items = queue.items.filter(item => item.status !== 'completed');
  saveQueue(queue);
  
  return results;
}

/**
 * Process site note session through pipeline
 */
async function processSiteNoteSession(sessionData, base44Client) {
  const { sessionId, audioUrl, metadata } = sessionData;
  
  // Import services dynamically
  const { transcribeAudio } = await import('./SiteNotesTranscription.js');
  const { classifyIntents, mergeIntentsWithOriginal } = await import('./SiteNotesIntentClassifier.js');
  const { extractEntities, createDraftEntities } = await import('./SiteNotesEntityExtractor.js');
  
  // Step 1: Transcribe
  const transcription = await transcribeAudio(audioUrl, base44Client);
  
  // Step 2: Classify intents
  const intents = await classifyIntents(
    [], // segments not needed for LLM
    transcription.transcript_english,
    base44Client
  );
  
  // Step 3: Merge with original language
  const intentsWithOriginal = mergeIntentsWithOriginal(
    intents,
    transcription.transcript_raw,
    transcription.transcript_english
  );
  
  // Step 4: Extract entities
  const entities = await extractEntities(intentsWithOriginal, metadata, base44Client);
  
  // Step 5: Create drafts
  const drafts = await createDraftEntities(entities, base44Client);
  
  // Step 6: Update session record
  await base44Client.entities.SiteNoteSession.update(sessionId, {
    processing_status: 'completed',
    transcript_raw: transcription.transcript_raw,
    transcript_english: transcription.transcript_english,
    detected_language: transcription.detected_language,
    detected_intents: intentsWithOriginal,
    extracted_entities: drafts,
    synced_at: new Date().toISOString()
  });
}

/**
 * Load queue from localStorage
 */
function loadQueue() {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (!stored) {
      return {
        version: '1.0',
        items: [],
        last_sync: null
      };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load queue:', error);
    return {
      version: '1.0',
      items: [],
      last_sync: null
    };
  }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save queue:', error);
    throw error;
  }
}

/**
 * Generate queue item ID
 */
function generateQueueId() {
  return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get queue status
 */
export function getQueueStatus() {
  const queue = loadQueue();
  
  return {
    total_items: queue.items.length,
    pending: queue.items.filter(i => i.status === 'pending').length,
    completed: queue.items.filter(i => i.status === 'completed').length,
    error: queue.items.filter(i => i.status === 'error').length,
    last_sync: queue.last_sync
  };
}