import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, MapPin, Clock, CheckSquare, Languages } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { haptic } from '@/components/feedback/HapticFeedback';
import { microToast } from '@/components/feedback/MicroToast';
import { humanize } from '@/components/feedback/HumanStates';
import { useDoubleSubmitPrevention } from '@/components/validation/useDoubleSubmitPrevention';
import { useMobileLifecycle } from './hooks/useMobileLifecycle';
import { useQuery } from '@tanstack/react-query';

export default function VoiceNoteRecorder({ open, onOpenChange, jobId, jobName, onComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [area, setArea] = useState('');
  const [location, setLocation] = useState(null);
  const [step, setStep] = useState('ready'); // ready, recording, processing, completed, error
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [linkedPlanId, setLinkedPlanId] = useState('');
  const [language, setLanguage] = useState('es-ES'); // Default Spanish

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Fetch tasks for linking
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', jobId],
    queryFn: () => base44.entities.Task.filter({ job_id: jobId }),
    enabled: !!jobId && open,
  });

  // Fetch plans for linking
  const { data: plans = [] } = useQuery({
    queryKey: ['plans', jobId],
    queryFn: () => base44.entities.Plan.filter({ job_id: jobId }),
    enabled: !!jobId && open,
  });

  // Get GPS location on mount
  useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => console.warn('GPS not available:', error)
      );
    }
  }, [open]);

  // Handle mobile lifecycle - pause recording on background
  useMobileLifecycle({
    onBackground: () => {
      if (isRecording) {
        console.log('[VoiceNote] App backgrounded - stopping recording');
        stopRecording();
      }
    },
  });

  const startRecording = async () => {
    // Immediate visual feedback
    setStep('recording');
    setIsRecording(true);
    setRecordingTime(0);
    
    // Haptic feedback
    haptic.medium();
    
    try {
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

      console.log('[VoiceNote] Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setStep('error');
      haptic.error();
      microToast.error('Microphone access needed — check settings', 3000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Immediate visual transition
      setStep('processing');
      setIsRecording(false);
      
      // Haptic feedback
      haptic.medium();
      
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      console.log('[VoiceNote] Recording stopped');
    }
  };

  const processRecording = async () => {
    try {
      setIsProcessing(true);
      setStep('processing');

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      console.log('[VoiceNote] Processing audio...');

      const response = await base44.functions.invoke('processVoiceNote', {
        audioBlob: Array.from(new Uint8Array(await audioBlob.arrayBuffer())),
        jobId,
        jobName,
        latitude: location?.latitude,
        longitude: location?.longitude,
        area: area || 'Unspecified area',
        linkedTaskId: linkedTaskId || null,
        linkedPlanId: linkedPlanId || null,
        language: language,
      });

      if (response.data.success) {
        // Immediate completion feedback
        setStep('completed');
        
        // Haptic success
        haptic.success();
        
        const taskCount = response.data.analysis.tasks?.length || 0;
        const issueCount = response.data.analysis.issues?.length || 0;
        microToast.offline(`Note saved — ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}, ${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`, 2000);
        
        setTimeout(() => {
          onComplete?.(response.data);
          onOpenChange(false);
          resetState();
        }, 1500);
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }

    } catch (error) {
      console.error('Processing error:', error);
      setStep('error');
      toast.error('Failed to process voice note', {
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setStep('ready');
    setRecordingTime(0);
    setArea('');
    setLinkedTaskId('');
    setLinkedPlanId('');
    audioChunksRef.current = [];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      clearInterval(timerRef.current);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-orange-500" />
            AI Site Notes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location Info */}
          {location && (
            <Card className="p-3 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <MapPin className="w-4 h-4" />
                <span>Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
              </div>
            </Card>
          )}

          {/* Configuration - Before Recording */}
          {step === 'ready' && (
            <div className="space-y-3">
              {/* Language Selector */}
              <div>
                <Label className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  Idioma de reconocimiento
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es-ES">🇪🇸 Español</SelectItem>
                    <SelectItem value="en-US">🇺🇸 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Area Input */}
              <div>
                <Label>Área/Ubicación (opcional)</Label>
                <Input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="ej., Piso 3 - Ala Norte"
                  className="mt-1.5"
                />
              </div>

              {/* Link to Task */}
              {tasks.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Vincular a tarea (opcional)
                  </Label>
                  <Select value={linkedTaskId} onValueChange={setLinkedTaskId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Seleccionar tarea..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Ninguna</SelectItem>
                      {tasks.map(task => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Link to Plan */}
              {plans.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Vincular a plano (opcional)
                  </Label>
                  <Select value={linkedPlanId} onValueChange={setLinkedPlanId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Seleccionar plano..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Ninguno</SelectItem>
                      {plans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Recording Status */}
          {step === 'recording' && (
            <Card className="p-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                  <div className="relative w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {formatTime(recordingTime)}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">Recording in progress...</p>
                </div>
              </div>
            </Card>
          )}

          {/* Processing Status */}
          {step === 'processing' && (
            <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <div className="text-center">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Processing voice note...</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Transcribing and analyzing...
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Completed Status */}
          {step === 'completed' && (
            <Card className="p-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <div className="text-center">
                  <p className="font-semibold text-green-900 dark:text-green-100">Processing complete!</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Voice note saved successfully
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Error Status */}
          {step === 'error' && (
            <Card className="p-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <div className="text-center">
                  <p className="font-semibold text-red-900 dark:text-red-100">Processing failed</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Please try again
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Instructions */}
          {step === 'ready' && (
            <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <p className="font-semibold mb-1">Consejos para mejores resultados:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Habla claro y a ritmo moderado</li>
                <li>Menciona problemas, medidas o tareas específicas</li>
                <li>Incluye detalles de ubicación (números de pared, áreas)</li>
                <li>La IA extraerá automáticamente tareas e incidencias</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {step === 'ready' && (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={startRecording}
                  className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Iniciar Grabación
                </Button>
              </>
            )}

            {step === 'recording' && (
              <Button 
                onClick={stopRecording}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
              >
                <MicOff className="w-4 h-4 mr-2" />
                Detener y Procesar
              </Button>
            )}

            {step === 'error' && (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Close
                </Button>
                <Button onClick={() => setStep('ready')} className="flex-1">
                  Try Again
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}