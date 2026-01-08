import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Video, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SiteNoteMediaCapture({ recordingDuration, onMediaCaptured, disabled }) {
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const capturePhoto = async () => {
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      
      stream.getTracks().forEach(track => track.stop());
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
      
      onMediaCaptured({
        media_type: 'photo',
        media_url: file_url,
        timestamp_seconds: recordingDuration
      });
      
      toast.success(`Photo captured at ${formatTime(recordingDuration)}`);
    } catch (error) {
      console.error('Photo capture failed:', error);
      toast.error('Failed to capture photo');
    } finally {
      setCapturing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed">
      <div className="text-xs font-semibold text-slate-600">Evidence:</div>
      <Button
        size="sm"
        variant="outline"
        onClick={capturePhoto}
        disabled={disabled || capturing}
        className="h-8"
      >
        {capturing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Camera className="w-4 h-4 mr-1" />
            Photo
          </>
        )}
      </Button>
      <Badge variant="outline" className="text-xs">
        @ {formatTime(recordingDuration)}
      </Badge>
    </div>
  );
}