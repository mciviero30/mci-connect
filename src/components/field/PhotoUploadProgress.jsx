import React, { useState, useEffect } from 'react';
import { fieldStorage } from './services/FieldStorageService';
import { Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function PhotoUploadProgress({ jobId }) {
  const [pendingPhotos, setPendingPhotos] = useState([]);

  useEffect(() => {
    const checkPendingPhotos = async () => {
      try {
        const photos = await fieldStorage.getPendingPhotos(jobId);
        setPendingPhotos(photos);
      } catch (error) {
        console.error('Failed to fetch pending photos:', error);
      }
    };

    checkPendingPhotos();
    const interval = setInterval(checkPendingPhotos, 1000);
    return () => clearInterval(interval);
  }, [jobId]);

  if (pendingPhotos.length === 0) return null;

  return (
    <div className="fixed bottom-32 md:bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 space-y-2">
      {pendingPhotos.map((photo) => (
        <div 
          key={photo.id}
          className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0">
              {photo.upload_status === 'uploading' && (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              )}
              {photo.upload_status === 'uploaded' && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              {photo.upload_status === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              {photo.upload_status === 'pending' && (
                <Camera className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {photo.caption || 'Untitled Photo'}
              </p>
              <p className="text-xs text-slate-400">
                {photo.upload_status === 'uploading' && `Uploading ${photo.upload_progress}%`}
                {photo.upload_status === 'uploaded' && 'Upload complete'}
                {photo.upload_status === 'error' && 'Upload failed - retrying'}
                {photo.upload_status === 'pending' && 'Waiting for connection'}
              </p>
            </div>
          </div>
          {photo.upload_status === 'uploading' && (
            <Progress value={photo.upload_progress} className="h-1" />
          )}
        </div>
      ))}
    </div>
  );
}