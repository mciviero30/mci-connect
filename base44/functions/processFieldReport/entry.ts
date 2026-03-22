/**
 * ============================================================================
 * FIELD REPORT PROCESSOR - AI Backend Function
 * ============================================================================
 * 
 * Procesa capturas de campo y genera reporte estructurado bilingüe
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Auth check
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      job_id,
      job_name,
      report_type,
      report_date,
      captured_by,
      captured_by_name,
      photo_urls = [],
      audio_url,
      video_url,
      optional_notes = ''
    } = payload;

    // ========================================================================
    // STEP 1: DETECT ORIGINAL LANGUAGE
    // ========================================================================
    
    let originalLanguage = 'en';
    if (optional_notes) {
      const detectPrompt = `Detect the language of this text. Return ONLY "en" or "es".

Text: ${optional_notes}`;
      
      const langResult = await base44.integrations.Core.InvokeLLM({
        prompt: detectPrompt
      });
      
      originalLanguage = langResult.toLowerCase().includes('es') ? 'es' : 'en';
    }

    // ========================================================================
    // STEP 2: GENERATE BILINGUAL STRUCTURED REPORT WITH QUALITY ANALYSIS
    // ========================================================================
    
    const promptTemplate = `You are a construction field report AI for Falkbuilt wall installations with expert quality control capabilities.

PROJECT: ${job_name}
REPORT TYPE: ${report_type}
DATE: ${report_date}
TECHNICIAN: ${captured_by_name}

CAPTURED DATA:
- Photos: ${photo_urls.length}
- Audio: ${audio_url ? 'Yes' : 'No'}
- Video: ${video_url ? 'Yes' : 'No'}
- Notes: ${optional_notes || 'None'}

INSTRUCTIONS:
1. Analyze all media (photos, audio, video)
2. Generate professional technical summaries in BOTH English and Spanish
3. Preserve technical construction terminology (do NOT simplify)
4. Identify safety risks
5. Extract material requirements
6. Generate actionable tasks
7. Create bilingual captions for each photo/video
8. **QUALITY ANALYSIS**: Inspect installation quality from photos/videos:
   - Assign quality_score (1-10): 1-4=fail, 5-6=needs_rework, 7-10=pass
   - Identify specific defects with severity (minor/major/critical)
   - Categorize defects: alignment, finish, damage, incomplete, safety, specification
   - Generate punch list items for corrections
   - Provide recommendations to improve quality
   - Reference specific photos showing defects

CRITICAL: Always generate BOTH English and Spanish versions, regardless of original language.

Return JSON:
{
  "summary_en": "Technical summary in English (3-4 sentences, preserve terminology)",
  "summary_es": "Resumen técnico en español (3-4 frases, preservar terminología)",
  "observations_en": "Detailed observations in English",
  "observations_es": "Observaciones detalladas en español",
  "safety_risks": [
    {
      "severity": "low|medium|high|critical",
      "description_en": "Risk description in English",
      "description_es": "Descripción del riesgo en español"
    }
  ],
  "material_requirements": ["Material 1", "Material 2"],
  "labor_notes": "Notes about labor or progress",
  "actionable_tasks": [
    {
      "title_en": "Task title in English",
      "title_es": "Título de tarea en español",
      "priority": "low|medium|high|critical",
      "category": "installation|safety|materials|inspection"
    }
  ],
  "quality_score": 8,
  "quality_defects": [
    {
      "severity": "minor|major|critical",
      "category": "alignment|finish|damage|incomplete|safety|specification",
      "description_en": "Defect description in English",
      "description_es": "Descripción del defecto en español",
      "location": "Wall section B, upper panel",
      "photo_reference": "Photo 2"
    }
  ],
  "punch_list_items": [
    {
      "title_en": "Punch item title in English",
      "title_es": "Título de punch item en español",
      "description_en": "Detailed description in English",
      "description_es": "Descripción detallada en español",
      "priority": "low|medium|high",
      "estimated_time": "30 minutes"
    }
  ],
  "quality_recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "media_captions": [
    {
      "media_index": 0,
      "caption_en": "English caption",
      "caption_es": "Subtítulo en español"
    }
  ],
  "search_keywords": ["keyword1", "keyword2"]
}`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: promptTemplate,
      file_urls: photo_urls.concat(video_url ? [video_url] : []),
      response_json_schema: {
        type: "object",
        properties: {
          summary_en: { type: "string" },
          summary_es: { type: "string" },
          observations_en: { type: "string" },
          observations_es: { type: "string" },
          safety_risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string" },
                description_en: { type: "string" },
                description_es: { type: "string" }
              }
            }
          },
          material_requirements: {
            type: "array",
            items: { type: "string" }
          },
          labor_notes: { type: "string" },
          actionable_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title_en: { type: "string" },
                title_es: { type: "string" },
                priority: { type: "string" },
                category: { type: "string" }
              }
            }
          },
          media_captions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                media_index: { type: "number" },
                caption_en: { type: "string" },
                caption_es: { type: "string" }
              }
            }
          },
          search_keywords: {
            type: "array",
            items: { type: "string" }
          },
          quality_score: { type: "number" },
          quality_defects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string" },
                category: { type: "string" },
                description_en: { type: "string" },
                description_es: { type: "string" },
                location: { type: "string" },
                photo_reference: { type: "string" }
              }
            }
          },
          punch_list_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title_en: { type: "string" },
                title_es: { type: "string" },
                description_en: { type: "string" },
                description_es: { type: "string" },
                priority: { type: "string" },
                estimated_time: { type: "string" }
              }
            }
          },
          quality_recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // ========================================================================
    // STEP 3: DETERMINE IF URGENT
    // ========================================================================
    
    const isUrgent = report_type === 'safety' || 
                    (analysis.safety_risks || []).some(r => r.severity === 'high' || r.severity === 'critical');

    // ========================================================================
    // STEP 4: BUILD MEDIA ATTACHMENTS WITH CAPTIONS
    // ========================================================================
    
    const mediaAttachments = [];
    
    // Add photos with captions
    photo_urls.forEach((url, index) => {
      const caption = (analysis.media_captions || []).find(c => c.media_index === index);
      mediaAttachments.push({
        url,
        type: 'photo',
        caption_en: caption?.caption_en || `Photo ${index + 1}`,
        caption_es: caption?.caption_es || `Foto ${index + 1}`,
        thumbnail_url: url
      });
    });

    // Add audio/video if present
    if (audio_url) {
      mediaAttachments.push({
        url: audio_url,
        type: 'audio',
        caption_en: 'Audio recording',
        caption_es: 'Grabación de audio'
      });
    }

    if (video_url) {
      mediaAttachments.push({
        url: video_url,
        type: 'video',
        caption_en: 'Video recording',
        caption_es: 'Grabación de video',
        thumbnail_url: video_url
      });
    }

    // ========================================================================
    // STEP 5: DETERMINE QUALITY STATUS AND FLAGS
    // ========================================================================
    
    const qualityScore = analysis.quality_score || 7;
    let qualityStatus = 'pass';
    if (qualityScore <= 4) {
      qualityStatus = 'fail';
    } else if (qualityScore <= 6) {
      qualityStatus = 'needs_rework';
    }
    
    const requiresQualityReview = qualityStatus === 'fail' || 
                                   (analysis.quality_defects || []).some(d => d.severity === 'critical');

    // ========================================================================
    // STEP 6: SAVE TO DATABASE
    // ========================================================================
    
    const reportData = {
      job_id,
      job_name,
      report_date,
      report_type,
      captured_by,
      captured_by_name,
      original_language: originalLanguage,
      summary_en: analysis.summary_en,
      summary_es: analysis.summary_es,
      observations_en: analysis.observations_en || '',
      observations_es: analysis.observations_es || '',
      safety_risks: analysis.safety_risks || [],
      material_requirements: analysis.material_requirements || [],
      labor_notes: analysis.labor_notes || '',
      is_urgent: isUrgent,
      actionable_tasks: (analysis.actionable_tasks || []).map(task => ({
        ...task,
        priority: (task.priority === 'low' || task.priority === 'medium') && 
                  (task.category === 'safety' || isUrgent) 
          ? 'high' 
          : task.priority
      })),
      quality_score: qualityScore,
      quality_status: qualityStatus,
      quality_defects: analysis.quality_defects || [],
      punch_list_items: analysis.punch_list_items || [],
      quality_recommendations: analysis.quality_recommendations || [],
      requires_quality_review: requiresQualityReview,
      media_attachments: mediaAttachments,
      raw_audio_url: audio_url,
      raw_video_url: video_url,
      processing_status: 'completed',
      processed_at: new Date().toISOString(),
      client_visible: false, // Manager must approve first
      search_keywords: analysis.search_keywords || [],
      offline_captured: false
    };

    const report = await base44.asServiceRole.entities.FieldReport.create(reportData);

    return Response.json({ 
      success: true, 
      report,
      is_urgent: isUrgent
    });

  } catch (error) {
    console.error('Error processing field report:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});