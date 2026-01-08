/**
 * Site Notes Intent Classifier
 * 
 * Classifies transcript segments into structured intents
 */

export const INTENTS = {
  TASK: 'task',
  INCIDENT: 'incident',
  DIMENSION: 'dimension',
  BENCHMARK: 'benchmark',
  GENERAL_NOTE: 'general_note'
};

/**
 * Classify transcript segments into intents
 */
export async function classifyIntents(transcriptSegments, transcriptEnglish, base44Client) {
  try {
    const result = await base44Client.integrations.Core.InvokeLLM({
      prompt: `Analyze this construction site voice note and classify each statement into intents.

Transcript:
${transcriptEnglish}

Available intents:
- task: Work items to be done (e.g., "install glass on wall 101")
- incident: Safety issues, accidents, damage (e.g., "broken glass panel")
- dimension: Measurements (e.g., "wall is 10 feet 3 inches")
- benchmark: Reference points (e.g., "laser line at 48 inches from floor")
- general_note: Observations, conditions, notes

For each detected intent, provide:
- intent type
- confidence (0-100)
- text excerpt
- estimated time range in seconds

Return as JSON array.`,
      response_json_schema: {
        type: "object",
        properties: {
          intents: {
            type: "array",
            items: {
              type: "object",
              properties: {
                intent: { 
                  type: "string",
                  enum: ["task", "incident", "dimension", "benchmark", "general_note"]
                },
                confidence: { type: "number" },
                text: { type: "string" },
                segment_start: { type: "number" },
                segment_end: { type: "number" }
              }
            }
          }
        }
      }
    });
    
    return result.intents || [];
    
  } catch (error) {
    console.error('Intent classification failed:', error);
    throw new Error('Failed to classify intents: ' + error.message);
  }
}

/**
 * Merge intents with original language
 */
export function mergeIntentsWithOriginal(intents, transcriptOriginal, transcriptEnglish) {
  return intents.map(intent => ({
    ...intent,
    text_english: intent.text,
    // Try to find matching text in original (approximate)
    text_original: findMatchingSegment(intent.text, transcriptOriginal, transcriptEnglish)
  }));
}

/**
 * Find matching segment in original language
 */
function findMatchingSegment(englishText, transcriptOriginal, transcriptEnglish) {
  // If original is English, return as-is
  if (transcriptOriginal === transcriptEnglish) {
    return englishText;
  }
  
  // Approximate word-level alignment
  const englishWords = transcriptEnglish.split(/\s+/);
  const originalWords = transcriptOriginal.split(/\s+/);
  const searchWords = englishText.split(/\s+/);
  
  // Find position in English transcript
  const englishPosition = transcriptEnglish.indexOf(englishText);
  if (englishPosition === -1) return englishText;
  
  // Calculate approximate position ratio
  const ratio = englishPosition / transcriptEnglish.length;
  const originalPosition = Math.floor(transcriptOriginal.length * ratio);
  
  // Extract approximate segment from original
  const segmentLength = englishText.length;
  const originalSegment = transcriptOriginal.substring(
    originalPosition,
    originalPosition + segmentLength
  );
  
  return originalSegment || englishText;
}