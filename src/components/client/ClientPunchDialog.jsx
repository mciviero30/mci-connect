import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Image as ImageIcon, X, Loader2, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toast';

export default function ClientPunchDialog({ 
  open, 
  onOpenChange, 
  jobId, 
  planId,
  pinPosition,
  clientEmail,
  clientName,
  onCreated 
}) {
  const { success, error } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const photoInputRef = useRef(null);

  // 🔒 BLOCK OFFLINE FOR CLIENTS
  const isOnline = navigator.onLine;
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      setPhotos(prev => [...prev, ...newUrls]);
    } catch (err) {
      error('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      error('Please provide a title for the punch item');
      return;
    }

    // 🔒 BLOCK OFFLINE SUBMISSION FOR CLIENTS
    if (!isOnline) {
      setShowOfflineWarning(true);
      error('You must be online to submit punch items');
      return;
    }

    setCreating(true);
    try {
      await base44.entities.Task.create({
        job_id: jobId,
        title: title.trim(),
        description: description.trim(),
        task_type: 'punch_item',
        created_by_client: true,
        punch_status: 'client_submitted',
        visible_to_client: true, // Auto-visible
        status: 'pending',
        blueprint_id: planId,
        pin_x: pinPosition?.x,
        pin_y: pinPosition?.y,
        photo_urls: photos,
      });

      success('Punch item submitted! Our team will review it shortly.');
      onCreated?.();
      onOpenChange(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setPhotos([]);
    } catch (err) {
      error('Failed to create punch item');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            Report Issue or Punch Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* OFFLINE WARNING FOR CLIENTS */}
          {!isOnline && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-300 font-semibold">
                🔴 No Internet Connection
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                You must be online to submit punch items. Please check your connection and try again.
              </p>
            </div>
          )}
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              📍 <strong>Pinned to Drawing</strong> - Your punch item will appear on the plan at the location you selected.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
              What needs attention? *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Damaged drywall, Missing outlet cover"
              className="bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
              Additional Details
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in more detail..."
              className="bg-white dark:bg-slate-900 min-h-[100px]"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Photos (Optional)
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
              className="w-full border-dashed min-h-[44px]"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Add Photos
                </>
              )}
            </Button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              ℹ️ Your punch item will be reviewed by our team. You'll be notified when it's addressed.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || creating || !isOnline}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : !isOnline ? (
                '🔴 Offline - Cannot Submit'
              ) : (
                'Submit Punch Item'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}