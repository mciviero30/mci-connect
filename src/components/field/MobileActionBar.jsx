import React, { useRef } from 'react';
import { Camera, CheckSquare, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toast';

export default function MobileActionBar({ jobId, onPhotoAdded, onTaskCreated, onNoteAdded }) {
  const { toast } = useToast();
  const photoInputRef = useRef(null);
  const [uploading, setUploading] = React.useState(false);

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Photo.create({
        job_id: jobId,
        file_url,
        caption: `Photo - ${new Date().toLocaleString()}`,
      });
      toast({
        title: 'Photo uploaded!',
        variant: 'success'
      });
      onPhotoAdded?.();
    } catch (err) {
      toast({
        title: 'Failed to upload photo',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="md:hidden fixed bottom-20 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900/80 border-t border-slate-700 px-4 py-3 z-40 backdrop-blur-sm shadow-2xl">
      <div className="flex gap-2">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />
        
        <Button
          onClick={() => photoInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg min-h-[52px] rounded-xl font-bold touch-manipulation active:scale-95 transition-transform"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Camera className="w-5 h-5 mr-2" />
              Photo
            </>
          )}
        </Button>

        <Button
          onClick={onTaskCreated}
          className="flex-1 bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black shadow-lg min-h-[52px] rounded-xl font-bold touch-manipulation active:scale-95 transition-transform"
        >
          <CheckSquare className="w-5 h-5 mr-2" />
          Task
        </Button>

        <Button
          onClick={onNoteAdded}
          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg min-h-[52px] rounded-xl font-bold touch-manipulation active:scale-95 transition-transform"
        >
          <FileText className="w-5 h-5 mr-2" />
          Note
        </Button>
      </div>
    </div>
  );
}