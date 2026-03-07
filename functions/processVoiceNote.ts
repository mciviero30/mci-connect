import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audioBlob, jobId, jobName, latitude, longitude, area } = await req.json();

    // 1. Upload audio file
    const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
    const { file_url: audioUrl } = await base44.integrations.Core.UploadFile({ file: audioFile });

    // 2. Create pending field note
    const fieldNote = await base44.asServiceRole.entities.FieldNote.create({
      job_id: jobId,
      job_name: jobName,
      recorded_by: user.email,
      recorded_by_name: user.full_name,
      audio_url: audioUrl,
      latitude,
      longitude,
      area,
      processing_status: 'processing',
    });

    // 3. Transcribe audio using AI (speech-to-text)
    console.log('[VoiceNote] Starting transcription...');
    const transcriptPrompt = `Transcribe the following audio. Return only the transcript text, no extra commentary.`;
    
    const transcriptResult = await base44.integrations.Core.InvokeLLM({
      prompt: transcriptPrompt,
      file_urls: [audioUrl],
    });

    const transcript = transcriptResult.trim();

    // 4. AI analysis to extract structured data
    console.log('[VoiceNote] Analyzing transcript...');
    const analysisPrompt = `Analyze the following field site notes transcript and extract structured information:

TRANSCRIPT:
${transcript}

Extract:
1. Issues/Problems - Any problems, defects, or concerns mentioned (with severity: low/medium/high/critical)
2. Tasks - Action items that need to be done (with priority: low/medium/high)
3. Observations - General observations about the site
4. Measurements - Any measurements, dimensions, or quantities mentioned (with value and unit)

Return JSON only.`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                suggested_action: { type: 'string' }
              }
            }
          },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'] }
              }
            }
          },
          observations: {
            type: 'array',
            items: { type: 'string' }
          },
          measurements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item: { type: 'string' },
                value: { type: 'string' },
                unit: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // 5. Update field note with transcript and analysis
    await base44.asServiceRole.entities.FieldNote.update(fieldNote.id, {
      transcript,
      ai_analysis: aiAnalysis,
      processing_status: 'completed',
    });

    console.log('[VoiceNote] Processing complete');

    return Response.json({
      success: true,
      fieldNoteId: fieldNote.id,
      transcript,
      analysis: aiAnalysis,
    });

  } catch (error) {
    console.error('[VoiceNote] Processing error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});