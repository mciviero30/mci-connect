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

    if (!session.transcript_raw) {
      return Response.json({ error: 'No transcript available' }, { status: 400 });
    }

    // Update status
    await base44.asServiceRole.entities.SiteNoteSession.update(session_id, {
      processing_status: 'classified'
    });

    try {
      // Extract structured notes using AI
      const extractionPrompt = `You are extracting structured notes from a field technician's audio transcript.

CRITICAL RULES:
1. Extract ONLY what was explicitly said - no interpretations or inferences
2. Use exact quotes from the transcript
3. Include approximate timestamp in seconds for each note
4. If something wasn't mentioned, don't include it
5. No corrections or modifications to what was said
6. Extract area/room names if explicitly mentioned in speech
7. Every note must reference a timestamp from the audio

Transcript:
"${session.transcript_raw}"

Extract and structure into these categories:
- general_observations: General site observations
- area_specific: Notes about specific areas (extract area name from speech)
- measurement_comments: Comments about measurements or dimensions
- condition_issues: Issues with site conditions (mark severity: low/medium/high)
- safety_concerns: Safety-related observations
- installation_constraints: Constraints for installation work

Return ONLY valid JSON matching this exact structure (empty arrays if category not mentioned):
{
  "general_observations": [{"content": "exact quote", "timestamp_seconds": 0}],
  "area_specific": [{"area": "area name", "content": "exact quote", "timestamp_seconds": 0}],
  "measurement_comments": [{"content": "exact quote", "timestamp_seconds": 0}],
  "condition_issues": [{"content": "exact quote", "severity": "low|medium|high", "timestamp_seconds": 0}],
  "safety_concerns": [{"content": "exact quote", "timestamp_seconds": 0}],
  "installation_constraints": [{"content": "exact quote", "timestamp_seconds": 0}]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: extractionPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            general_observations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  timestamp_seconds: { type: "number" }
                }
              }
            },
            area_specific: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  content: { type: "string" },
                  timestamp_seconds: { type: "number" }
                }
              }
            },
            measurement_comments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  timestamp_seconds: { type: "number" }
                }
              }
            },
            condition_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  severity: { type: "string" },
                  timestamp_seconds: { type: "number" }
                }
              }
            },
            safety_concerns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  timestamp_seconds: { type: "number" }
                }
              }
            },
            installation_constraints: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  timestamp_seconds: { type: "number" }
                }
              }
            }
          }
        }
      });

      // Suggest area if found in area_specific notes
      let suggestedArea = null;
      if (result.area_specific && result.area_specific.length > 0) {
        suggestedArea = result.area_specific[0].area;
      }

      // Translate structured notes if needed
      const detectedLang = session.detected_language || 'en';
      const targetLang = detectedLang === 'es' ? 'en' : 'es';
      
      let translatedNotes = null;
      if (detectedLang !== targetLang) {
        try {
          const translationPrompt = `Translate the following structured notes from ${detectedLang === 'es' ? 'Spanish' : 'English'} to ${targetLang === 'es' ? 'Spanish' : 'English'}.

CRITICAL: Preserve the exact structure and timestamps. Only translate the "content" and "area" fields.

Original notes:
${JSON.stringify(result, null, 2)}

Return the same JSON structure with translated content fields only.`;

          translatedNotes = await base44.integrations.Core.InvokeLLM({
            prompt: translationPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                language: { type: "string" },
                general_observations: { type: "array" },
                area_specific: { type: "array" },
                measurement_comments: { type: "array" },
                condition_issues: { type: "array" },
                safety_concerns: { type: "array" },
                installation_constraints: { type: "array" }
              }
            }
          });
          
          translatedNotes.language = targetLang;
        } catch (error) {
          console.error('Translation failed:', error);
        }
      }

      // Update session with structured notes
      const updateData = {
        structured_notes: result,
        suggested_area: suggestedArea,
        processing_status: 'completed'
      };

      if (translatedNotes) {
        updateData.structured_notes_translated = translatedNotes;
      }

      await base44.asServiceRole.entities.SiteNoteSession.update(session_id, updateData);

      return Response.json({
        success: true,
        session_id: session_id,
        structured_notes: result,
        structured_notes_translated: translatedNotes,
        suggested_area: suggestedArea
      });

    } catch (error) {
      console.error('Extraction failed:', error);
      
      await base44.asServiceRole.entities.SiteNoteSession.update(session_id, {
        processing_status: 'error',
        error_message: `Extraction error: ${error.message}`
      });

      return Response.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Site note extraction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});