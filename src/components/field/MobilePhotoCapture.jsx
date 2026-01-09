import React, { useState, useRef } from 'react';
import { Camera, MapPin, Loader2, X, Check, RotateCcw, ImagePlus, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { fieldStorage } from './services/FieldStorageService';
import { SaveGuarantee } from './services/SaveGuarantee';
import SaveConfirmation from './SaveConfirmation';

export default function MobilePhotoCapture({ 
  open, 
  onOpenChange, 
  jobId, 
  onPhotoCreated,
  wallNumber = null 
}) {
  const [step, setStep] = useState('capture'); // capture | preview | details
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [location, setLocation] = useState(null);
  const [caption, setCaption] = useState('');
  const [locationText, setLocationText] = useState('');
  const [saveProgress, setSaveProgress] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationType, setConfirmationType] = useState('success');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const resetState = () => {
    setStep('capture');
    setCapturedImage(null);
    setLocation(null);
    setCaption('');
    setLocationText('');
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({ latitude, longitude, accuracy });
        
        // Try to get address from coordinates
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          if (data.display_name) {
            setLocationText(data.display_name.split(',').slice(0, 3).join(', '));
          }
        } catch (err) {
          setLocationText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        setGettingLocation(false);
      },
      (error) => {
        console.error('Location error:', error);
        setGettingLocation(false);
        alert('Unable to get location. Please enter manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleFileSelect = async (e, fromCamera = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediate visual transition
    setStep('preview');
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage({
        preview: event.target.result,
        file: file,
        fromCamera
      });
    };
    reader.readAsDataURL(file);

    // Auto-get location when capturing
    if (fromCamera) {
      getCurrentLocation();
    }
  };

  const handleUpload = async () => {
    if (!capturedImage?.file) return;

    const photoData = {
      job_id: jobId,
      caption: caption || (wallNumber ? `Wall ${wallNumber}` : ''),
      location: locationText,
      gps_latitude: location?.latitude,
      gps_longitude: location?.longitude,
      wall_number: wallNumber,
    };

    // BLOCKING SAVE: UI waits for confirmation
    const result = await SaveGuarantee.guaranteeSave({
      entityType: 'Photo',
      entityData: photoData,
      jobId,
      apiCall: async () => {
        // Upload file first
        const { file_url } = await base44.integrations.Core.UploadFile({ 
          file: capturedImage.file 
        });
        
        // Then create photo record
        return await base44.entities.Photo.create({
          ...photoData,
          file_url,
        });
      },
      draftKey: `photo_${jobId}`,
      onProgress: setSaveProgress,
    });
    
    if (result.success) {
      // Immediate success feedback
      setConfirmationType(result.savedOffline ? 'offline' : 'success');
      setShowConfirmation(true);
      
      // Haptic success
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
      
      // Close modal after brief confirmation
      setTimeout(() => {
        onPhotoCreated?.();
        handleClose();
      }, 1200);
      
    } else {
      // Save failed
      setSaveProgress(null);
      toast.error(result.error || 'Failed to save photo', { duration: 3000 });
    }
  };

  return (
    <>
      {/* Save Confirmation Feedback */}
      <SaveConfirmation 
        show={showConfirmation}
        type={confirmationType}
        onComplete={() => setShowConfirmation(false)}
      />
      
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-md mx-auto p-0 overflow-hidden">
        {/* Step: Capture */}
        {step === 'capture' && (
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-slate-900 dark:text-white">Add Photo</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Camera Capture - Primary for mobile */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 p-6 bg-[#FFB800] hover:bg-[#E5A600] text-white rounded-xl transition-colors"
              >
                <Camera className="w-8 h-8" />
                <span className="text-lg font-medium">Take Photo</span>
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileSelect(e, true)}
                className="hidden"
              />

              {/* Gallery Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 p-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="font-medium">Choose from Gallery</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, false)}
                className="hidden"
              />

              {wallNumber && (
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                  <span className="text-sm text-amber-700 dark:text-amber-400">
                    Photo for Wall #{wallNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && capturedImage && (
          <div className="flex flex-col h-full">
            <div className="relative aspect-square bg-black">
              <img 
                src={capturedImage.preview} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setStep('capture')}
                className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep('capture')}
                className="flex-1 border-slate-300 dark:border-slate-700"
              >
                Retake
              </Button>
              <Button 
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  setStep('details');
                }}
                className="flex-1 bg-[#FFB800] hover:bg-[#E5A600] text-white active:scale-95 transition-transform"
              >
                <Check className="w-4 h-4 mr-2" />
                Use Photo
              </Button>
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-slate-900 dark:text-white">Photo Details</DialogTitle>
            </DialogHeader>

            {/* Preview thumbnail */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4">
              <img 
                src={capturedImage?.preview} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-4">
              {/* Caption */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Description
                </label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe what's in the photo..."
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  rows={2}
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Location
                </label>
                <div className="flex gap-2">
                  <Input
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="e.g., Conference Room A"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="border-slate-200 dark:border-slate-700 px-3"
                  >
                    {gettingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {location && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    GPS location captured (±{Math.round(location.accuracy)}m)
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('preview')}
                  className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    handleUpload();
                  }}
                  disabled={saveProgress !== null}
                  className="flex-1 bg-[#FFB800] hover:bg-[#E5A600] text-white disabled:opacity-70 active:scale-95 transition-transform"
                >
                  {saveProgress === 'validating' && (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  )}
                  {saveProgress === 'persisting' && (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  )}
                  {saveProgress === 'uploading' && (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  )}
                  {saveProgress === 'confirming' && (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  )}
                  {!saveProgress && 'Save Photo'}
                </Button>
              </div>
            </div>
          </div>
        )}
        </DialogContent>
      </Dialog>
    </>
  );
}