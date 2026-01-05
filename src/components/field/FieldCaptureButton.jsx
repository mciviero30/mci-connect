/**
 * ============================================================================
 * FIELD CAPTURE BUTTON - Native AI Processing Trigger
 * ============================================================================
 * 
 * Mobile-optimized button for capturing field data with AI processing
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Mic, Video, FileText, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { processFieldCapture, ActivityTypeLabels, SeverityColors } from './AIFieldProcessor';
import { Card, CardContent } from '@/components/ui/card';

export default function FieldCaptureButton({ jobId, jobName, onCaptureProcessed }) {
  const [open, setOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState(null); // 'photo', 'audio', 'video', 'note'
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processedReport, setProcessedReport] = useState(null);
  
  const [captureData, setCaptureData] = useState({
    photo_urls: [],
    audio_url: null,
    video_url: null,
    text_notes: ''
  });

  const fileInputRef = useRef(null);

  const handlePhotoCapture = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setCapturing(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      
      setCaptureData(prev => ({
        ...prev,
        photo_urls: [...prev.photo_urls, ...urls]
      }));
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setCapturing(false);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const user = await base44.auth.me();
      const language = user?.preferred_language || user?.language_preference || 'en';

      const report = await processFieldCapture({
        ...captureData,
        job_id: jobId,
        job_name: jobName,
        captured_by: user.email,
        captured_by_name: user.full_name,
        language
      });

      // Save to DailyFieldReport entity
      const savedReport = await base44.entities.DailyFieldReport.create(report);
      
      setProcessedReport(report);
      
      if (onCaptureProcessed) {
        onCaptureProcessed(savedReport);
      }
    } catch (error) {
      console.error('Error processing capture:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCaptureMode(null);
    setCaptureData({
      photo_urls: [],
      audio_url: null,
      video_url: null,
      text_notes: ''
    });
    setProcessedReport(null);
  };

  const canProcess = captureData.photo_urls.length > 0 || 
                     captureData.audio_url || 
                     captureData.video_url || 
                     captureData.text_notes;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-lg min-h-[48px] rounded-xl"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        AI Field Capture
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              AI Field Capture & Processing
            </DialogTitle>
          </DialogHeader>

          {!processedReport ? (
            <div className="space-y-6">
              {/* Capture Options */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={capturing}
                  className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-orange-500 hover:bg-orange-50"
                >
                  {capturing ? (
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  ) : (
                    <Camera className="w-6 h-6 text-orange-500" />
                  )}
                  <span className="text-sm font-medium">Photos</span>
                  {captureData.photo_urls.length > 0 && (
                    <Badge className="bg-orange-100 text-orange-700 text-xs">
                      {captureData.photo_urls.length} captured
                    </Badge>
                  )}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCaptureMode('note')}
                  className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-blue-500 hover:bg-blue-50"
                >
                  <FileText className="w-6 h-6 text-blue-500" />
                  <span className="text-sm font-medium">Text Note</span>
                </Button>
              </div>

              {/* Photo Thumbnails */}
              {captureData.photo_urls.length > 0 && (
                <div className="space-y-2">
                  <Label>Captured Photos ({captureData.photo_urls.length})</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {captureData.photo_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Capture ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-slate-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Text Notes */}
              <div>
                <Label>Additional Notes (Optional)</Label>
                <Textarea
                  value={captureData.text_notes}
                  onChange={(e) => setCaptureData({ ...captureData, text_notes: e.target.value })}
                  placeholder="Add text notes, voice transcription, or observations..."
                  className="h-32 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Process Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleProcess}
                  disabled={!canProcess || processing}
                  className="bg-gradient-to-r from-orange-600 to-yellow-500 text-white"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Process Capture
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Processed Report Display
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-900">Capture Processed Successfully</p>
                  <p className="text-sm text-green-700">AI analysis complete and saved to field reports</p>
                </div>
              </div>

              {/* Report Summary */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label className="text-xs text-slate-500">Activity Type</Label>
                    <Badge className="mt-1 bg-blue-100 text-blue-700">
                      {ActivityTypeLabels.en[processedReport.activity_type]}
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-500">Summary</Label>
                    <p className="text-sm text-slate-900 mt-1">{processedReport.summary_en}</p>
                  </div>

                  {processedReport.materials_identified?.length > 0 && (
                    <div>
                      <Label className="text-xs text-slate-500">Materials Identified</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {processedReport.materials_identified.map((material, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {material}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {processedReport.issues_detected?.length > 0 && (
                    <div>
                      <Label className="text-xs text-slate-500">Issues Detected</Label>
                      <div className="space-y-2 mt-1">
                        {processedReport.issues_detected.map((issue, idx) => (
                          <div key={idx} className={`p-2 rounded border ${SeverityColors[issue.severity]}`}>
                            <p className="text-xs font-bold">{issue.severity.toUpperCase()}: {issue.description}</p>
                            <p className="text-xs mt-1">→ {issue.recommended_action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {processedReport.quality_score > 0 && (
                    <div>
                      <Label className="text-xs text-slate-500">Quality Score</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full"
                            style={{ width: `${processedReport.quality_score * 10}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{processedReport.quality_score}/10</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button onClick={handleClose} className="bg-gradient-to-r from-orange-600 to-yellow-500 text-white">
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}