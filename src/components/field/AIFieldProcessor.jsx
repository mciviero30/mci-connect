/**
 * ============================================================================
 * AI FIELD PROCESSING ENGINE - NATIVE MCI FIELD MODULE
 * ============================================================================
 * 
 * ROLE: Deterministic processing engine integrated into MCI Field
 * 
 * RESPONSIBILITY: Transform raw field captures (audio, video, photos)
 * into structured, bilingual, searchable, audit-ready field reports.
 * 
 * OUTPUT: Easy to view, search, filter, and review by:
 * - Technicians
 * - Managers
 * - Client portal users
 * 
 * INTEGRATION: Native to MCI Field (NO external vendors)
 * 
 * ============================================================================
 */

import { base44 } from '@/api/base44Client';

/**
 * ============================================================================
 * CORE PROCESSING FUNCTION
 * ============================================================================
 * 
 * Processes raw field captures into structured report
 * 
 * @param {Object} capture - Raw field capture
 * @param {string[]} capture.photo_urls - Photo URLs
 * @param {string} [capture.audio_url] - Audio recording URL
 * @param {string} [capture.video_url] - Video URL
 * @param {string} [capture.text_notes] - Text notes
 * @param {string} capture.job_id - Job ID
 * @param {string} capture.job_name - Job name
 * @param {string} capture.captured_by - User email
 * @param {string} capture.captured_by_name - User name
 * @param {string} [capture.language] - Preferred language (en/es)
 * 
 * @returns {Promise<Object>} Structured field report
 */
export async function processFieldCapture(capture) {
  const {
    photo_urls = [],
    audio_url,
    video_url,
    text_notes,
    job_id,
    job_name,
    captured_by,
    captured_by_name,
    language = 'en'
  } = capture;

  // ============================================================================
  // STEP 1: BUILD ANALYSIS PROMPT (BILINGUAL)
  // ============================================================================
  
  const promptES = `Eres un experto en instalación de paredes Falkbuilt. Analiza esta captura de campo y genera un reporte estructurado.

PROYECTO: ${job_name}
FECHA: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
CAPTURADO POR: ${captured_by_name}

${text_notes ? `NOTAS DEL TÉCNICO: ${text_notes}` : ''}

${photo_urls.length > 0 ? `FOTOS ADJUNTAS: ${photo_urls.length}` : ''}
${audio_url ? 'AUDIO: Incluido' : ''}
${video_url ? 'VIDEO: Incluido' : ''}

INSTRUCCIONES DE ANÁLISIS:
1. Extrae información estructurada de las capturas
2. Identifica tipo de actividad (instalación, inspección, problema, progreso)
3. Detecta issues/problemas de seguridad o calidad
4. Lista materiales visibles o mencionados
5. Estima progreso del trabajo
6. Identifica próximos pasos

RETORNA UN OBJETO JSON CON ESTA ESTRUCTURA EXACTA:
{
  "summary_es": "Resumen en español (2-3 frases)",
  "summary_en": "English summary (2-3 sentences)",
  "activity_type": "installation|inspection|issue|progress|delivery",
  "work_completed": "Descripción del trabajo realizado",
  "materials_identified": ["Material 1", "Material 2"],
  "issues_detected": [
    {
      "severity": "low|medium|high|critical",
      "description": "Descripción del problema",
      "recommended_action": "Acción recomendada"
    }
  ],
  "safety_observations": ["Observación 1", "Observación 2"],
  "progress_estimate": "10-25%|25-50%|50-75%|75-90%|90-100%",
  "next_steps": ["Siguiente paso 1", "Siguiente paso 2"],
  "quality_score": 1-10,
  "tags": ["tag1", "tag2", "tag3"]
}`;

  const promptEN = `You are a Falkbuilt wall installation expert. Analyze this field capture and generate a structured report.

PROJECT: ${job_name}
DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
CAPTURED BY: ${captured_by_name}

${text_notes ? `TECH NOTES: ${text_notes}` : ''}

${photo_urls.length > 0 ? `PHOTOS ATTACHED: ${photo_urls.length}` : ''}
${audio_url ? 'AUDIO: Included' : ''}
${video_url ? 'VIDEO: Included' : ''}

ANALYSIS INSTRUCTIONS:
1. Extract structured information from captures
2. Identify activity type (installation, inspection, issue, progress)
3. Detect safety or quality issues
4. List visible or mentioned materials
5. Estimate work progress
6. Identify next steps

RETURN A JSON OBJECT WITH THIS EXACT STRUCTURE:
{
  "summary_es": "Spanish summary (2-3 sentences)",
  "summary_en": "English summary (2-3 sentences)",
  "activity_type": "installation|inspection|issue|progress|delivery",
  "work_completed": "Description of work performed",
  "materials_identified": ["Material 1", "Material 2"],
  "issues_detected": [
    {
      "severity": "low|medium|high|critical",
      "description": "Issue description",
      "recommended_action": "Recommended action"
    }
  ],
  "safety_observations": ["Observation 1", "Observation 2"],
  "progress_estimate": "10-25%|25-50%|50-75%|75-90%|90-100%",
  "next_steps": ["Next step 1", "Next step 2"],
  "quality_score": 1-10,
  "tags": ["tag1", "tag2", "tag3"]
}`;

  const prompt = language === 'es' ? promptES : promptEN;

  // ============================================================================
  // STEP 2: INVOKE AI WITH STRUCTURED OUTPUT
  // ============================================================================
  
  const analysisResult = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: photo_urls,
    response_json_schema: {
      type: "object",
      properties: {
        summary_es: { type: "string" },
        summary_en: { type: "string" },
        activity_type: { 
          type: "string",
          enum: ["installation", "inspection", "issue", "progress", "delivery", "other"]
        },
        work_completed: { type: "string" },
        materials_identified: { 
          type: "array",
          items: { type: "string" }
        },
        issues_detected: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { 
                type: "string",
                enum: ["low", "medium", "high", "critical"]
              },
              description: { type: "string" },
              recommended_action: { type: "string" }
            }
          }
        },
        safety_observations: {
          type: "array",
          items: { type: "string" }
        },
        progress_estimate: { type: "string" },
        next_steps: {
          type: "array",
          items: { type: "string" }
        },
        quality_score: { 
          type: "number",
          minimum: 1,
          maximum: 10
        },
        tags: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["summary_es", "summary_en", "activity_type", "work_completed"]
    }
  });

  // ============================================================================
  // STEP 3: STRUCTURE FINAL REPORT
  // ============================================================================
  
  const report = {
    job_id,
    job_name,
    report_date: new Date().toISOString().split('T')[0],
    report_time: new Date().toISOString(),
    report_type: 'ai_field_capture',
    captured_by,
    captured_by_name,
    language,
    
    // Bilingual summaries
    summary_es: analysisResult.summary_es,
    summary_en: analysisResult.summary_en,
    
    // Structured data
    activity_type: analysisResult.activity_type,
    work_completed: analysisResult.work_completed,
    materials_identified: analysisResult.materials_identified || [],
    issues_detected: analysisResult.issues_detected || [],
    safety_observations: analysisResult.safety_observations || [],
    progress_estimate: analysisResult.progress_estimate,
    next_steps: analysisResult.next_steps || [],
    quality_score: analysisResult.quality_score || 0,
    tags: analysisResult.tags || [],
    
    // Attachments
    photo_urls,
    audio_url,
    video_url,
    text_notes,
    
    // Metadata
    processed_at: new Date().toISOString(),
    processor: 'ai_native_field_engine_v1',
    
    // Search optimization
    searchable_text: [
      analysisResult.summary_es,
      analysisResult.summary_en,
      analysisResult.work_completed,
      ...analysisResult.materials_identified,
      ...analysisResult.next_steps,
      text_notes
    ].filter(Boolean).join(' '),
    
    // Status
    status: 'processed',
    reviewed: false
  };

  return report;
}

/**
 * ============================================================================
 * QUICK CAPTURE PROCESSOR - Voice/Photo Notes
 * ============================================================================
 * 
 * Simplified processing for quick voice notes or photo captures
 * 
 * @param {Object} quickCapture - Quick capture data
 * @returns {Promise<Object>} Processed quick note
 */
export async function processQuickCapture(quickCapture) {
  const {
    content,
    photo_urls = [],
    job_id,
    captured_by,
    captured_by_name,
    language = 'en'
  } = quickCapture;

  const prompt = language === 'es'
    ? `Analiza esta nota rápida de campo y extrae información estructurada. Si es una nota de voz transcrita, limpia y estructura el texto.

CONTENIDO: ${content}

Retorna JSON:
{
  "summary": "Resumen corto (1 frase)",
  "category": "task|issue|note|material|safety|other",
  "priority": "low|medium|high",
  "action_required": true/false,
  "suggested_action": "Acción sugerida si aplica"
}`
    : `Analyze this quick field note and extract structured information. If it's a transcribed voice note, clean and structure the text.

CONTENT: ${content}

Return JSON:
{
  "summary": "Short summary (1 sentence)",
  "category": "task|issue|note|material|safety|other",
  "priority": "low|medium|high",
  "action_required": true/false,
  "suggested_action": "Suggested action if applicable"
}`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: photo_urls.length > 0 ? photo_urls : undefined,
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        category: { 
          type: "string",
          enum: ["task", "issue", "note", "material", "safety", "other"]
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"]
        },
        action_required: { type: "boolean" },
        suggested_action: { type: "string" }
      }
    }
  });

  return {
    job_id,
    captured_by,
    captured_by_name,
    content,
    photo_urls,
    language,
    ...result,
    created_at: new Date().toISOString(),
    type: 'quick_note'
  };
}

/**
 * ============================================================================
 * BATCH PROCESSOR - End of Day Processing
 * ============================================================================
 * 
 * Process all unprocessed captures from the day into daily summary
 * 
 * @param {Object} batchParams - Batch processing parameters
 * @returns {Promise<Object>} Daily summary report
 */
export async function processEndOfDayBatch(batchParams) {
  const {
    job_id,
    job_name,
    date,
    captures = [],
    tasks_completed = [],
    time_entries = [],
    language = 'en'
  } = batchParams;

  const photoUrls = captures.flatMap(c => c.photo_urls || []).slice(0, 10);
  
  const prompt = language === 'es'
    ? `Genera un resumen ejecutivo del día para este proyecto de construcción.

PROYECTO: ${job_name}
FECHA: ${new Date(date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

CAPTURAS DEL DÍA: ${captures.length}
TAREAS COMPLETADAS: ${tasks_completed.length}
HORAS TRABAJADAS: ${time_entries.reduce((sum, e) => sum + (e.hours_worked || 0), 0)}h

RESÚMENES DE CAPTURAS:
${captures.map((c, i) => `${i+1}. ${c.summary_es || c.summary_en || c.text_notes || 'Captura de campo'}`).join('\n')}

TAREAS COMPLETADAS:
${tasks_completed.map(t => `- ${t.title}`).join('\n')}

Genera un resumen ejecutivo con:
1. Logros del Día (3-5 puntos clave)
2. Materiales Utilizados
3. Issues/Problemas Encontrados
4. Horas Trabajadas y Equipo
5. Plan para Mañana
6. Status General del Proyecto

Formato JSON:
{
  "daily_summary_es": "Resumen ejecutivo en español",
  "daily_summary_en": "Executive summary in English",
  "key_accomplishments": ["Logro 1", "Logro 2"],
  "materials_used": ["Material 1", "Material 2"],
  "issues_found": ["Issue 1"],
  "total_hours": ${time_entries.reduce((sum, e) => sum + (e.hours_worked || 0), 0)},
  "crew_count": ${new Set(time_entries.map(e => e.employee_email)).size},
  "tomorrow_plan": ["Tarea 1", "Tarea 2"],
  "overall_status": "on_track|at_risk|delayed",
  "confidence_score": 1-10
}`
    : `Generate an executive end-of-day summary for this construction project.

PROJECT: ${job_name}
DATE: ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

CAPTURES TODAY: ${captures.length}
TASKS COMPLETED: ${tasks_completed.length}
HOURS WORKED: ${time_entries.reduce((sum, e) => sum + (e.hours_worked || 0), 0)}h

CAPTURE SUMMARIES:
${captures.map((c, i) => `${i+1}. ${c.summary_en || c.summary_es || c.text_notes || 'Field capture'}`).join('\n')}

COMPLETED TASKS:
${tasks_completed.map(t => `- ${t.title}`).join('\n')}

Generate executive summary with:
1. Key Accomplishments (3-5 bullet points)
2. Materials Used
3. Issues/Problems Found
4. Hours Worked and Crew
5. Tomorrow's Plan
6. Overall Project Status

JSON Format:
{
  "daily_summary_es": "Spanish executive summary",
  "daily_summary_en": "English executive summary",
  "key_accomplishments": ["Achievement 1", "Achievement 2"],
  "materials_used": ["Material 1", "Material 2"],
  "issues_found": ["Issue 1"],
  "total_hours": ${time_entries.reduce((sum, e) => sum + (e.hours_worked || 0), 0)},
  "crew_count": ${new Set(time_entries.map(e => e.employee_email)).size},
  "tomorrow_plan": ["Task 1", "Task 2"],
  "overall_status": "on_track|at_risk|delayed",
  "confidence_score": 1-10
}`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: language === 'es' ? promptES : prompt,
    file_urls: photoUrls,
    response_json_schema: {
      type: "object",
      properties: {
        daily_summary_es: { type: "string" },
        daily_summary_en: { type: "string" },
        key_accomplishments: {
          type: "array",
          items: { type: "string" }
        },
        materials_used: {
          type: "array",
          items: { type: "string" }
        },
        issues_found: {
          type: "array",
          items: { type: "string" }
        },
        total_hours: { type: "number" },
        crew_count: { type: "number" },
        tomorrow_plan: {
          type: "array",
          items: { type: "string" }
        },
        overall_status: {
          type: "string",
          enum: ["on_track", "at_risk", "delayed"]
        },
        confidence_score: { type: "number" }
      }
    }
  });

  return {
    job_id,
    job_name,
    report_date: date,
    report_type: 'daily_summary',
    language,
    ...result,
    captures_processed: captures.length,
    tasks_completed: tasks_completed.length,
    photo_urls: photoUrls,
    processed_at: new Date().toISOString()
  };
}

/**
 * ============================================================================
 * SAFETY ANALYZER - Analyze photos/video for safety compliance
 * ============================================================================
 */
export async function analyzeSafety(safetyParams) {
  const { photo_urls = [], video_url, job_id, language = 'en' } = safetyParams;

  const prompt = language === 'es'
    ? `Analiza estas imágenes/video de un sitio de construcción para seguridad.

CHECKLIST DE SEGURIDAD FALKBUILT:
- ✓ Uso de EPP (casco, gafas, guantes, botas de seguridad)
- ✓ Manejo seguro de paneles de vidrio
- ✓ Escaleras/andamios seguros
- ✓ Área de trabajo limpia y organizada
- ✓ Herramientas en buen estado
- ✓ Señalización adecuada
- ✓ Protección contra caídas

Retorna JSON:
{
  "safety_score": 1-10,
  "compliant_items": ["Item conforme 1"],
  "violations": [
    {
      "severity": "low|medium|high|critical",
      "description": "Descripción",
      "corrective_action": "Acción correctiva"
    }
  ],
  "recommendations": ["Recomendación 1"],
  "overall_assessment": "safe|needs_attention|unsafe"
}`
    : `Analyze these construction site images/video for safety compliance.

FALKBUILT SAFETY CHECKLIST:
- ✓ PPE usage (hard hat, safety glasses, gloves, safety boots)
- ✓ Safe glass panel handling
- ✓ Secure ladders/scaffolding
- ✓ Clean and organized work area
- ✓ Tools in good condition
- ✓ Proper signage
- ✓ Fall protection

Return JSON:
{
  "safety_score": 1-10,
  "compliant_items": ["Compliant item 1"],
  "violations": [
    {
      "severity": "low|medium|high|critical",
      "description": "Description",
      "corrective_action": "Corrective action"
    }
  ],
  "recommendations": ["Recommendation 1"],
  "overall_assessment": "safe|needs_attention|unsafe"
}`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: photo_urls.concat(video_url ? [video_url] : []),
    response_json_schema: {
      type: "object",
      properties: {
        safety_score: { type: "number" },
        compliant_items: {
          type: "array",
          items: { type: "string" }
        },
        violations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string" },
              description: { type: "string" },
              corrective_action: { type: "string" }
            }
          }
        },
        recommendations: {
          type: "array",
          items: { type: "string" }
        },
        overall_assessment: { type: "string" }
      }
    }
  });

  return {
    job_id,
    analysis_type: 'safety',
    ...result,
    analyzed_at: new Date().toISOString()
  };
}

/**
 * ============================================================================
 * QUALITY INSPECTOR - Analyze installation quality
 * ============================================================================
 */
export async function analyzeQuality(qualityParams) {
  const { photo_urls = [], task_id, task_title, language = 'en' } = qualityParams;

  const prompt = language === 'es'
    ? `Inspecciona la calidad de esta instalación Falkbuilt.

TAREA: ${task_title}

CRITERIOS DE CALIDAD:
- Alineación de paneles (nivel y plomo)
- Limpieza de instalación
- Acabados correctos
- Hardware instalado correctamente
- Sellado apropiado
- Superficie sin daños

Retorna JSON:
{
  "quality_score": 1-10,
  "pass_fail": "pass|fail|needs_rework",
  "inspection_items": [
    {
      "item": "Nombre del item",
      "status": "pass|fail|na",
      "notes": "Notas"
    }
  ],
  "defects": ["Defecto 1"],
  "recommendations": ["Recomendación 1"],
  "punch_items": ["Punch item 1"]
}`
    : `Inspect the quality of this Falkbuilt installation.

TASK: ${task_title}

QUALITY CRITERIA:
- Panel alignment (level and plumb)
- Installation cleanliness
- Proper finishes
- Hardware correctly installed
- Appropriate sealing
- Surface damage-free

Return JSON:
{
  "quality_score": 1-10,
  "pass_fail": "pass|fail|needs_rework",
  "inspection_items": [
    {
      "item": "Item name",
      "status": "pass|fail|na",
      "notes": "Notes"
    }
  ],
  "defects": ["Defect 1"],
  "recommendations": ["Recommendation 1"],
  "punch_items": ["Punch item 1"]
}`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: photo_urls,
    response_json_schema: {
      type: "object",
      properties: {
        quality_score: { type: "number" },
        pass_fail: {
          type: "string",
          enum: ["pass", "fail", "needs_rework"]
        },
        inspection_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item: { type: "string" },
              status: { type: "string" },
              notes: { type: "string" }
            }
          }
        },
        defects: {
          type: "array",
          items: { type: "string" }
        },
        recommendations: {
          type: "array",
          items: { type: "string" }
        },
        punch_items: {
          type: "array",
          items: { type: "string" }
        }
      }
    }
  });

  return {
    task_id,
    task_title,
    analysis_type: 'quality',
    ...result,
    photo_urls,
    inspected_at: new Date().toISOString()
  };
}

/**
 * ============================================================================
 * EXPORT UTILITIES
 * ============================================================================
 */

export const ActivityTypeLabels = {
  en: {
    installation: 'Installation',
    inspection: 'Inspection',
    issue: 'Issue Reported',
    progress: 'Progress Update',
    delivery: 'Material Delivery',
    other: 'Other'
  },
  es: {
    installation: 'Instalación',
    inspection: 'Inspección',
    issue: 'Problema Reportado',
    progress: 'Actualización de Progreso',
    delivery: 'Entrega de Materiales',
    other: 'Otro'
  }
};

export const SeverityColors = {
  low: 'bg-blue-100 text-blue-700 border-blue-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300'
};

export const StatusColors = {
  on_track: 'bg-green-100 text-green-700 border-green-300',
  at_risk: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  delayed: 'bg-red-100 text-red-700 border-red-300'
};