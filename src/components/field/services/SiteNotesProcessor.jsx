/**
 * Site Notes Processor
 * 
 * Orchestrates the complete Site Notes AI pipeline
 */

import { transcribeAudio } from './SiteNotesTranscription';
import { classifyIntents } from './SiteNotesIntentClassifier';
import { extractEntities } from './SiteNotesEntityExtractor';
import { normalizeExtractedData } from './SiteNotesNormalization';
import { validateDraftBatch } from './SiteNotesValidation';
import { createDraftEntities } from './SiteNotesEntityExtractor';

/**
 * Process voice note end-to-end
 */
export async function processSiteNote(sessionId, audioUrl, jobMetadata, user, base44Client) {
  try {
    // Update session status
    await base44Client.entities.SiteNoteSession.update(sessionId, {
      processing_status: 'processing'
    });
    
    // Step 1: Transcribe audio
    const transcription = await transcribeAudio(audioUrl, base44Client);
    
    await base44Client.entities.SiteNoteSession.update(sessionId, {
      transcript_raw: transcription.transcript_raw,
      transcript_english: transcription.transcript_english,
      detected_language: transcription.detected_language,
      processing_status: 'transcribed'
    });
    
    // Step 2: Classify intents
    const intents = await classifyIntents(
      transcription.transcript_english,
      transcription.transcript_raw,
      transcription.detected_language,
      base44Client
    );
    
    await base44Client.entities.SiteNoteSession.update(sessionId, {
      detected_intents: intents,
      processing_status: 'classified'
    });
    
    // Step 3: Extract entities
    const sessionMetadata = {
      job_id: jobMetadata.job_id,
      job_name: jobMetadata.job_name,
      area: jobMetadata.area,
      recorded_by: user.email,
      recorded_by_name: user.full_name,
      session_start: new Date().toISOString(),
      detected_language: transcription.detected_language
    };
    
    const extractedEntities = await extractEntities(intents, sessionMetadata, base44Client);
    
    // Step 4: Normalize data
    const normalizedEntities = normalizeExtractedData(extractedEntities, transcription.detected_language);
    
    // Step 5: Validate
    const validation = validateDraftBatch(normalizedEntities);
    
    // Step 6: Create drafts for user review
    const drafts = await createDraftEntities(normalizedEntities, base44Client);
    
    // Update session with results
    await base44Client.entities.SiteNoteSession.update(sessionId, {
      extracted_entities: drafts,
      processing_status: 'completed'
    });
    
    return {
      success: true,
      session_id: sessionId,
      transcription,
      intents,
      drafts,
      validation,
      requires_review: drafts.some(d => d.requires_review)
    };
    
  } catch (error) {
    console.error('Site notes processing failed:', error);
    
    // Update session with error
    await base44Client.entities.SiteNoteSession.update(sessionId, {
      processing_status: 'error',
      error_message: error.message
    });
    
    throw error;
  }
}

/**
 * Create site note session
 */
export async function createSiteNoteSession(jobId, jobName, area, user, base44Client) {
  try {
    const session = await base44Client.entities.SiteNoteSession.create({
      job_id: jobId,
      job_name: jobName,
      area: area,
      recorded_by: user.email,
      recorded_by_name: user.full_name,
      session_start: new Date().toISOString(),
      processing_status: 'recording'
    });
    
    return session;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
}

/**
 * Complete site note session
 */
export async function completeSiteNoteSession(sessionId, audioUrl, durationSeconds, base44Client) {
  try {
    await base44Client.entities.SiteNoteSession.update(sessionId, {
      audio_url: audioUrl,
      session_end: new Date().toISOString(),
      duration_seconds: durationSeconds,
      processing_status: 'processing'
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to complete session:', error);
    throw error;
  }
}

/**
 * Get pending drafts for session
 */
export async function getSessionDrafts(sessionId, base44Client) {
  try {
    const session = await base44Client.entities.SiteNoteSession.filter({ 
      id: sessionId 
    }).then(sessions => sessions[0]);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    return {
      session,
      drafts: session.extracted_entities || [],
      status: session.processing_status
    };
  } catch (error) {
    console.error('Failed to get session drafts:', error);
    throw error;
  }
}

/**
 * Process offline site note
 */
export async function processOfflineSiteNote(sessionData, base44Client) {
  try {
    // Create session
    const session = await base44Client.entities.SiteNoteSession.create({
      ...sessionData,
      offline_captured: true,
      synced_at: new Date().toISOString()
    });
    
    // Process if audio is available
    if (sessionData.audio_url) {
      return await processSiteNote(
        session.id,
        sessionData.audio_url,
        {
          job_id: sessionData.job_id,
          job_name: sessionData.job_name,
          area: sessionData.area
        },
        {
          email: sessionData.recorded_by,
          full_name: sessionData.recorded_by_name
        },
        base44Client
      );
    }
    
    return { success: true, session_id: session.id };
  } catch (error) {
    console.error('Failed to process offline site note:', error);
    throw error;
  }
}