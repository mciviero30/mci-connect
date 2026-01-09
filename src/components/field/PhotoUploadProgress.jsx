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

  // Only show actively uploading or recently uploaded (auto-hide completed after 3s)
  const activePhotos = pendingPhotos.filter(p => 
    p.upload_status === 'uploading' || 
    p.upload_status === 'pending' ||
    p.upload_status === 'error'
  );

  if (activePhotos.length === 0) return null;

  return (
    <div className="fixed bottom-32 md:bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 space-y-2">
      {activePhotos.map((photo) => (
        <div 
          key={photo.id}
          className="bg-slate-800/95 backdrop-blur-md border border-slate-700/50 radius-md shadow-enterprise-lg spacing-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {photo.upload_status === 'uploading' && (
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" strokeWidth={2.5} />
                </div>
              )}
              {photo.upload_status === 'error' && (
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              )}
              {photo.upload_status === 'pending' && (
                <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {photo.upload_status === 'uploading' && 'Uploading photo'}
                {photo.upload_status === 'error' && 'Upload failed'}
                {photo.upload_status === 'pending' && 'Waiting for signal'}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                {photo.upload_status === 'uploading' && `${photo.upload_progress || 0}%`}
                {photo.upload_status === 'error' && 'Will retry automatically'}
                {photo.upload_status === 'pending' && 'Saved locally'}
              </p>
            </div>
          </div>
          {photo.upload_status === 'uploading' && (
            <Progress value={photo.upload_progress || 0} className="h-1 mt-2" />
          )}
        </div>
      ))}
    </div>
  );
}