/**
 * Site Notes Transcription Service
 * 
 * Transcribes audio and detects language
 */

/**
 * Transcribe audio using LLM with language detection
 */
export async function transcribeAudio(audioUrl, base44Client) {
  try {
    // Use LLM with file_urls for transcription
    const result = await base44Client.integrations.Core.InvokeLLM({
      prompt: `Transcribe this audio recording from a construction site. 
      
Detect the language and provide:
1. Full transcription in original language
2. English translation (if original is not English)
3. Detected language (ISO code)
4. Confidence score (0-100)

Format response as JSON.`,
      file_urls: [audioUrl],
      response_json_schema: {
        type: "object",
        properties: {
          transcript_original: { type: "string" },
          transcript_english: { type: "string" },
          detected_language: { type: "string" },
          confidence: { type: "number" },
          is_english: { type: "boolean" }
        }
      }
    });
    
    return {
      transcript_raw: result.transcript_original,
      transcript_english: result.transcript_english || result.transcript_original,
      detected_language: result.detected_language,
      confidence: result.confidence,
      transcribed_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Transcription failed:', error);
    throw new Error('Failed to transcribe audio: ' + error.message);
  }
}

/**
 * Segment transcript by time markers (if available)
 */
export function segmentTranscript(transcript, audioDuration) {
  // Split by sentence boundaries
  const sentences = transcript.match(/[^\.!\?]+[\.!\?]+/g) || [transcript];
  
  // Estimate timing based on word count
  const totalWords = transcript.split(/\s+/).length;
  const wordsPerSecond = totalWords / audioDuration;
  
  let currentTime = 0;
  
  const segments = sentences.map(sentence => {
    const wordCount = sentence.split(/\s+/).length;
    const duration = wordCount / wordsPerSecond;
    
    const segment = {
      text: sentence.trim(),
      start_time: currentTime,
      end_time: currentTime + duration,
      duration
    };
    
    currentTime += duration;
    return segment;
  });
  
  return segments;
}

/**
 * Clean and normalize transcript
 */
export function normalizeTranscript(transcript) {
  return transcript
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}