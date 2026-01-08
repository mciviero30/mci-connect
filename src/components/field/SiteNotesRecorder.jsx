import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Square, Loader2, FileAudio, Info, MapPin, Ruler, AlertTriangle, ShieldAlert, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import StructuredNotesDisplay from './StructuredNotesDisplay';

export default function SiteNotesRecorder({ jobId, area }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [sessions, setSessions] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, [jobId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadSessions = async () => {
    try {
      const data = await base44.entities.SiteNoteSession.filter(
        { job_id: jobId },
        '-session_start',
        20
      );
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = handleRecordingStop;
      
      mediaRecorderRef.current.start();
      startTimeRef.current = Date.now();
      setRecording(true);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
      toast.success('Recording started - speak freely');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleRecordingStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    setProcessing(true);
    
    try {
      const user = await base44.auth.me();
      
      // Upload audio
      const formData = new FormData();
      formData.append('file', audioBlob, 'site-note.webm');
      
      const uploadResponse = await base44.integrations.Core.UploadFile({ file: audioBlob });
      const audioUrl = uploadResponse.file_url;
      
      // Create session record
      const session = await base44.entities.SiteNoteSession.create({
        job_id: jobId,
        area: area || null,
        session_start: new Date(startTimeRef.current).toISOString(),
        session_end: new Date().toISOString(),
        duration_seconds: durationSeconds,
        audio_url: audioUrl,
        recorded_by: user.email,
        recorded_by_name: user.full_name,
        processing_status: 'processing'
      });
      
      // Request transcription only
      await base44.functions.invoke('transcribeSiteNote', {
        session_id: session.id
      });
      
      toast.success('Site note saved - transcribing...');
      await loadSessions();
      
    } catch (error) {
      console.error('Failed to save site note:', error);
      toast.error('Failed to save site note');
    } finally {
      setProcessing(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Recording Control */}
      <Card className={recording ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Site Notes Recorder</span>
            {recording && (
              <Badge className="bg-red-500 text-white animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full mr-2" />
                Recording {formatDuration(duration)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <div className="font-semibold text-blue-900 mb-1">Hands-Free Documentation</div>
              <div className="text-blue-700">
                Record audio notes while walking the site. Audio will be transcribed automatically.
                Raw transcription is always preserved.
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            {!recording && !processing && (
              <Button
                onClick={startRecording}
                size="lg"
                className="w-full max-w-xs h-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg"
              >
                <Mic className="w-6 h-6 mr-2" />
                Start Site Notes
              </Button>
            )}
            
            {recording && (
              <Button
                onClick={stopRecording}
                size="lg"
                className="w-full max-w-xs h-20 bg-red-600 hover:bg-red-700 text-white text-lg"
              >
                <Square className="w-6 h-6 mr-2" />
                Stop Recording
              </Button>
            )}
            
            {processing && (
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-2" />
                <div className="text-sm text-slate-600">Processing audio...</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Site Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map(session => (
                <div key={session.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileAudio className="w-4 h-4 text-slate-600" />
                      <span className="font-semibold text-sm">
                        {new Date(session.session_start).toLocaleString()}
                      </span>
                    </div>
                    <Badge className={
                      session.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                      session.processing_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-800'
                    }>
                      {session.processing_status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-slate-600 mb-2">
                    Duration: {formatDuration(session.duration_seconds)} • 
                    By: {session.recorded_by_name} •
                    Area: {session.area || 'General'}
                  </div>
                  
                  {session.transcript_raw && (
                    <div className="mt-3 space-y-3">
                      {/* Structured Notes */}
                      {session.structured_notes && (
                        <StructuredNotesDisplay notes={session.structured_notes} />
                      )}
                      
                      {/* Raw Transcription */}
                      <details className="p-3 bg-white dark:bg-slate-800 rounded border">
                        <summary className="text-xs font-semibold text-slate-600 cursor-pointer">
                          Raw Transcription (Click to expand)
                        </summary>
                        <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                          {session.transcript_raw}
                        </div>
                      </details>
                    </div>
                  )}
                  
                  {session.audio_url && (
                    <audio controls className="w-full mt-3" src={session.audio_url}>
                      Your browser does not support audio playback.
                    </audio>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}