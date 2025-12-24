import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CameraCapture({ isOpen, onClose, onCapture, language = 'en' }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = front, 'environment' = back

  const startCamera = async (mode = 'user') => {
    try {
      setError(null);
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(language === 'es' 
          ? 'Permiso de cámara denegado. Por favor permite el acceso a la cámara en la configuración de tu navegador.' 
          : 'Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError(language === 'es' 
          ? 'No se encontró ninguna cámara en tu dispositivo.' 
          : 'No camera found on your device.');
      } else {
        setError(language === 'es' 
          ? 'Error al acceder a la cámara. Por favor intenta de nuevo.' 
          : 'Error accessing camera. Please try again.');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        onCapture(file);
        handleClose();
      }
    }, 'image/jpeg', 0.9);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setError(null);
    onClose();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-slate-900 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Camera className="w-5 h-5 text-orange-500" />
            {language === 'es' ? 'Tomar Foto' : 'Take Photo'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex gap-3 justify-center">
            {!error && (
              <>
                <Button
                  onClick={switchCamera}
                  variant="outline"
                  className="border-slate-300 dark:border-slate-600"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Cambiar Cámara' : 'Switch Camera'}
                </Button>
                <Button
                  onClick={handleCapture}
                  className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-md"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Capturar' : 'Capture'}
                </Button>
              </>
            )}
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-slate-300 dark:border-slate-600"
            >
              <X className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}