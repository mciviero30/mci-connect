/**
 * Site Notes Audio Capture Service
 * 
 * Handles audio recording with offline support
 */

const AUDIO_DB_NAME = 'site_notes_audio';
const AUDIO_STORE_NAME = 'recordings';
const DB_VERSION = 1;

/**
 * Initialize IndexedDB for audio storage
 */
async function initAudioDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'session_id' });
      }
    };
  });
}

/**
 * Start audio recording
 */
export async function startRecording(sessionId, jobId, area, user) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    });
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    const audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    const startTime = Date.now();
    
    return {
      mediaRecorder,
      stream,
      audioChunks,
      startTime,
      sessionId,
      metadata: {
        job_id: jobId,
        area,
        recorded_by: user.email,
        recorded_by_name: user.full_name,
        session_start: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Failed to start recording:', error);
    throw new Error('Microphone access denied or unavailable');
  }
}

/**
 * Stop recording and save audio
 */
export async function stopRecording(recordingSession) {
  return new Promise(async (resolve, reject) => {
    const { mediaRecorder, stream, audioChunks, startTime, sessionId, metadata } = recordingSession;
    
    mediaRecorder.onstop = async () => {
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
      
      // Create blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      // Store locally
      const localPath = await storeAudioLocally(sessionId, audioBlob, {
        ...metadata,
        session_end: new Date().toISOString(),
        duration_seconds: duration
      });
      
      resolve({
        audioBlob,
        localPath,
        duration,
        metadata: {
          ...metadata,
          session_end: new Date().toISOString(),
          duration_seconds: duration
        }
      });
    };
    
    mediaRecorder.onerror = (error) => reject(error);
    
    mediaRecorder.stop();
  });
}

/**
 * Store audio locally in IndexedDB
 */
async function storeAudioLocally(sessionId, audioBlob, metadata) {
  const db = await initAudioDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    
    const record = {
      session_id: sessionId,
      audio_blob: audioBlob,
      metadata,
      stored_at: new Date().toISOString(),
      synced: false
    };
    
    const request = store.put(record);
    
    request.onsuccess = () => resolve(`local://${sessionId}`);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve audio from local storage
 */
export async function getLocalAudio(sessionId) {
  const db = await initAudioDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_STORE_NAME], 'readonly');
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    const request = store.get(sessionId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Upload audio to server
 */
export async function uploadAudio(sessionId, base44Client) {
  try {
    const record = await getLocalAudio(sessionId);
    
    if (!record) {
      throw new Error('Audio not found in local storage');
    }
    
    // Upload audio file
    const { file_url } = await base44Client.integrations.Core.UploadFile({ 
      file: record.audio_blob 
    });
    
    // Mark as synced
    await markAsSynced(sessionId);
    
    return file_url;
    
  } catch (error) {
    console.error('Failed to upload audio:', error);
    throw error;
  }
}

/**
 * Mark audio as synced
 */
async function markAsSynced(sessionId) {
  const db = await initAudioDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    
    const getRequest = store.get(sessionId);
    
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.synced = true;
        record.synced_at = new Date().toISOString();
        store.put(record);
      }
      resolve();
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Get all unsynced audio sessions
 */
export async function getUnsyncedSessions() {
  const db = await initAudioDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_STORE_NAME], 'readonly');
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const unsynced = request.result.filter(r => !r.synced);
      resolve(unsynced);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear synced audio (cleanup)
 */
export async function clearSyncedAudio(olderThanDays = 7) {
  const db = await initAudioDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const toDelete = request.result.filter(r => 
        r.synced && new Date(r.synced_at) < cutoffDate
      );
      
      toDelete.forEach(record => {
        store.delete(record.session_id);
      });
      
      resolve(toDelete.length);
    };
    
    request.onerror = () => reject(request.error);
  });
}