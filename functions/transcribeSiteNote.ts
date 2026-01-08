import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id } = await req.json();

    if (!session_id) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session
    const sessions = await base44.asServiceRole.entities.SiteNoteSession.filter({
      id: session_id
    });

    if (sessions.length === 0) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessions[0];

    // Update status
    await base44.asServiceRole.entities.SiteNoteSession.update(session_id, {
      processing_status: 'processing'
    });

    try {
      // Fetch audio file
      const audioResponse = await fetch(session.audio_url);
      
      if (!audioResponse.ok) {
        throw new Error('Failed to fetch audio file');
      }

      const audioBlob = await audioResponse.blob();

      // Transcribe using AI (Whisper-like transcription)
      const transcriptionResult = await base44.integrations.Core.InvokeLLM({
        prompt: 'Transcribe this audio recording verbatim. Preserve all spoken words exactly as said, including filler words, pauses, and unclear speech. Do not interpret, summarize, or clean up the transcription. Return only the raw transcription text.',
        file_urls: [session.audio_url],
        add_context_from_internet: false
      });

      const rawTranscript = typeof transcriptionResult === 'string' 
        ? transcriptionResult 
        : transcriptionResult.transcription || transcriptionResult.text || String(transcriptionResult);

      // Update session with transcription
      await base44.asServiceRole.entities.SiteNoteSession.update(session_id, {
        transcript_raw: rawTranscript,
        processing_status: 'transcribed',
        detected_language: detectLanguage(rawTranscript)
      });

      // Trigger structured extraction
      try {
        await base44.functions.invoke('extractStructuredSiteNotes', {
          session_id: session_id
        });
      } catch (extractError) {
        console.error('Structured extraction failed:', extractError);
        // Don't fail transcription if extraction fails
      }

      return Response.json({
        success: true,
        session_id: session_id,
        transcript: rawTranscript
      });

    } catch (error) {
      console.error('Transcription failed:', error);
      
      await base44.asServiceRole.entities.SiteNoteSession.update(session_id, {
        processing_status: 'error',
        error_message: error.message
      });

      return Response.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Site note transcription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function detectLanguage(text) {
  // Simple language detection - can be enhanced
  const spanishPatterns = /\b(el|la|los|las|un|una|de|del|para|con|que|es|está|son|en)\b/i;
  const englishPatterns = /\b(the|a|an|is|are|was|were|in|on|at|to|for|with|that)\b/i;
  
  const spanishMatches = (text.match(spanishPatterns) || []).length;
  const englishMatches = (text.match(englishPatterns) || []).length;
  
  if (spanishMatches > englishMatches) return 'es';
  return 'en';
}