/**
 * ============================================================================
 * FIELD REPORT CAPTURE - Mobile-First UI
 * ============================================================================
 * 
 * Flujo ultra-simple para técnicos:
 * 1. Iniciar reporte
 * 2. Grabar audio/video + tomar fotos
 * 3. Confirmar y enviar
 * 
 * NO formularios largos
 * Procesamiento automático en backend
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, 
  Mic, 
  Video, 
  Upload, 
  X, 
  CheckCircle2,
  Loader2,
  FileText,
  AlertTriangle,
  Sparkles,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toast';
import { queueOfflineAction } from './FieldOfflineManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function FieldReportCapture({ jobId, jobName, onReportCreated }) {
  const [step, setStep] = useState('type'); // 'type' → 'capture' → 'processing' → 'done'
  const [reportType, setReportType] = useState('daily');
  const [photos, setPhotos] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [optionalNotes, setOptionalNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(null);
  
  const photoInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  
  const { toast } = useToast();

  const handlePhotoCapture = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploaded = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Upload to server
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({
          url: file_url,
          type: 'photo',
          preview: URL.createObjectURL(file)
        });
        
        setUploadProgress(((i + 1) / files.length) * 100);
      }
      
      setPhotos(prev => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} foto${uploaded.length > 1 ? 's' : ''} agregada${uploaded.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Error al subir fotos');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Grabando audio...');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      toast.error('No se pudo acceder al micrófono');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Grabación finalizada');
    }
  };

  const handleSubmit = async () => {
    setStep('processing');
    setProcessingStatus('uploading');

    try {
      const user = await base44.auth.me();
      
      // Upload media files if captured
      let audioUrl = null;
      let videoUrl = null;

      if (audioBlob) {
        setProcessingStatus('processing_audio');
        const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
        audioUrl = file_url;
      }

      if (videoBlob) {
        setProcessingStatus('processing_video');
        const videoFile = new File([videoBlob], `video_${Date.now()}.webm`, { type: 'video/webm' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: videoFile });
        videoUrl = file_url;
      }

      // Prepare capture data
      const captureData = {
        job_id: jobId,
        job_name: jobName,
        report_type: reportType,
        report_date: new Date().toISOString().split('T')[0],
        captured_by: user.email,
        captured_by_name: user.full_name,
        photo_urls: photos.map(p => p.url),
        audio_url: audioUrl,
        video_url: videoUrl,
        optional_notes: optionalNotes,
        offline_captured: !navigator.onLine
      };

      if (navigator.onLine) {
        // Online: Process immediately via backend function
        setProcessingStatus('processing_ai');
        const result = await base44.functions.invoke('processFieldReport', captureData);
        
        if (result.data.success) {
          setStep('done');
          setTimeout(() => {
            if (onReportCreated) onReportCreated(result.data.report);
            resetForm();
          }, 2000);
        } else {
          throw new Error(result.data.error || 'Processing failed');
        }
      } else {
        // Offline: Queue for later processing
        await queueOfflineAction({
          type: 'createFieldReport',
          data: captureData,
          timestamp: new Date().toISOString()
        });
        
        toast.success('Reporte guardado offline. Se procesará al conectarse.');
        setStep('done');
        setTimeout(() => {
          if (onReportCreated) onReportCreated(null);
          resetForm();
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Error al procesar reporte');
      setStep('capture');
    }
  };

  const resetForm = () => {
    setStep('type');
    setReportType('daily');
    setPhotos([]);
    setAudioBlob(null);
    setVideoBlob(null);
    setOptionalNotes('');
    setProcessingStatus(null);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const hasCaptures = photos.length > 0 || audioBlob || videoBlob || optionalNotes;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Step 1: Select Report Type */}
      {step === 'type' && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              Tipo de Reporte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { value: 'daily', label: 'Reporte Diario', labelEN: 'Daily Report', icon: FileText, color: 'blue' },
              { value: 'safety', label: 'Reporte de Seguridad', labelEN: 'Safety Report', icon: AlertTriangle, color: 'red' },
              { value: 'progress', label: 'Actualización de Progreso', labelEN: 'Progress Update', icon: TrendingUp, color: 'green' },
              { value: 'issue', label: 'Reporte de Problema', labelEN: 'Issue Report', icon: AlertCircle, color: 'amber' }
            ].map(({ value, label, labelEN, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => {
                  setReportType(value);
                  setStep('capture');
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[64px] ${
                  reportType === value
                    ? `bg-${color}-600 border-${color}-500 text-white`
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-orange-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-bold text-sm">{label}</p>
                    <p className="text-xs opacity-80">{labelEN}</p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Capture Media */}
      {step === 'capture' && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              Capturar Información
              <Badge className="ml-auto bg-orange-500 text-white">
                {reportType === 'daily' && 'Diario'}
                {reportType === 'safety' && 'Seguridad'}
                {reportType === 'progress' && 'Progreso'}
                {reportType === 'issue' && 'Problema'}
              </Badge>
            </CardTitle>
            <p className="text-sm text-slate-400">
              {reportType === 'safety' && '⚠️ Este reporte se marcará automáticamente como urgente'}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo Capture */}
            <div>
              <Label className="text-white mb-2 block">Fotos del Sitio</Label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-16 text-lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Tomar Fotos ({photos.length})
                  </>
                )}
              </Button>
              
              {isUploading && (
                <Progress value={uploadProgress} className="mt-2" />
              )}

              {/* Photo Thumbnails */}
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={photo.preview}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-slate-600"
                      />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audio Recording */}
            <div>
              <Label className="text-white mb-2 block">Grabación de Audio (Opcional)</Label>
              <div className="flex gap-2">
                {!isRecording && !audioBlob && (
                  <Button
                    type="button"
                    onClick={startAudioRecording}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white h-14"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    Grabar Audio
                  </Button>
                )}
                
                {isRecording && (
                  <Button
                    type="button"
                    onClick={stopAudioRecording}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white h-14 animate-pulse"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    Detener Grabación
                  </Button>
                )}
                
                {audioBlob && (
                  <div className="flex-1 flex items-center gap-3 p-4 bg-green-900/50 border border-green-700 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-white font-medium">Audio grabado</span>
                    <button
                      onClick={() => setAudioBlob(null)}
                      className="ml-auto p-1 hover:bg-red-500/20 rounded"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <Label className="text-white mb-2 block">Notas Adicionales (Opcional)</Label>
              <Textarea
                value={optionalNotes}
                onChange={(e) => setOptionalNotes(e.target.value)}
                placeholder="Agrega contexto o detalles adicionales..."
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 min-h-[100px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('type')}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Atrás
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!hasCaptures || isUploading}
                className="flex-1 bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white font-bold"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Procesar con IA
              </Button>
            </div>

            {!hasCaptures && (
              <p className="text-xs text-center text-amber-400">
                ⚠️ Agrega al menos una foto o grabación para continuar
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Processing */}
      {step === 'processing' && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">
              Procesando Reporte con IA...
            </h3>
            <p className="text-slate-400 mb-6">
              {processingStatus === 'uploading' && 'Subiendo archivos...'}
              {processingStatus === 'processing_audio' && 'Procesando audio...'}
              {processingStatus === 'processing_video' && 'Procesando video...'}
              {processingStatus === 'processing_ai' && 'Analizando con IA...'}
            </p>
            <div className="space-y-2 text-sm text-slate-500">
              <p>✓ Detección automática de idioma</p>
              <p>✓ Generación bilingüe (EN/ES)</p>
              <p>✓ Identificación de riesgos</p>
              <p>✓ Subtítulos para fotos/videos</p>
              <p>✓ Tareas accionables</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <Card className="bg-gradient-to-br from-green-800 to-green-900 border-green-700 shadow-xl">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">
              ¡Reporte Creado!
            </h3>
            <p className="text-green-300 mb-6">
              El reporte ha sido procesado y está disponible para managers y clientes
            </p>
            <Button
              onClick={resetForm}
              className="bg-white text-green-900 hover:bg-green-50"
            >
              Crear Otro Reporte
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}