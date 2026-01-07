import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Upload, X, Expand, Trash2, Download, ArrowLeftRight, Camera, MapPin, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import PhotoComparisonView from './PhotoComparison.jsx';
import MobilePhotoCapture from './MobilePhotoCapture.jsx';
import BeforeAfterPhotoManager from './BeforeAfterPhotoManager.jsx';
import { updateFieldQueryData } from './config/fieldQueryConfig';

export default function FieldPhotosView({ jobId }) {
  const [showUpload, setShowUpload] = useState(false);
  const [showMobileCapture, setShowMobileCapture] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newPhoto, setNewPhoto] = useState({ file_url: '', caption: '', location: '' });
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const queryClient = useQueryClient();

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['field-photos', jobId],
    queryFn: () => base44.entities.Photo.filter({ job_id: jobId }, '-created_date'),
  });

  const createPhotoMutation = useMutation({
    mutationFn: (data) => base44.entities.Photo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-photos', jobId] });
      setShowUpload(false);
      setNewPhoto({ file_url: '', caption: '', location: '' });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (id) => base44.entities.Photo.delete(id),
    onSuccess: (_, variables) => {
      // Scoped optimistic update - Field isolation
      updateFieldQueryData(queryClient, jobId, 'PHOTOS', (old) => 
        old ? old.filter(p => p.id !== variables) : old
      );
      setSelectedPhoto(null);
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewPhoto({ ...newPhoto, file_url });
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploading(false);
  };

  const handleCreatePhoto = () => {
    if (!newPhoto.file_url) return;
    
    // CRITICAL: Always link photo to job
    if (!jobId) {
      console.error('Cannot create photo without job_id');
      return;
    }
    
    createPhotoMutation.mutate({
      job_id: jobId,
      file_url: newPhoto.file_url,
      caption: newPhoto.caption,
      location: newPhoto.location,
    });
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header - Primary action removed (moved to bottom rail) */}
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-black">Photos</h1>
        </div>
      </div>

      <Tabs defaultValue="gallery" className="mb-6">
        <TabsList className="bg-slate-800 border-2 border-slate-700 p-1.5 rounded-xl shadow-md w-full flex-wrap h-auto gap-1.5">
          <TabsTrigger value="gallery" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-black text-slate-300 min-h-[44px] rounded-lg flex-1 font-medium">
            <Camera className="w-4 h-4 mr-2" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="before-after" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-black text-slate-300 min-h-[44px] rounded-lg flex-1 font-medium">
            <ArrowLeftRight className="w-4 h-4 mr-1" />
            Before/After
          </TabsTrigger>
          <TabsTrigger value="comparison" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-black text-slate-300 min-h-[44px] rounded-lg flex-1 font-medium">
            Compare
          </TabsTrigger>
        </TabsList>
        <TabsContent value="before-after" className="mt-4">
          <BeforeAfterPhotoManager jobId={jobId} />
        </TabsContent>
        <TabsContent value="comparison" className="mt-4">
          <PhotoComparisonView jobId={jobId} photos={photos} />
        </TabsContent>
        <TabsContent value="gallery">

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-300 text-sm">Loading photos...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-600 rounded-2xl p-16 text-center shadow-xl">
          <div className="w-20 h-20 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Camera className="w-10 h-10 text-orange-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Photos Yet</h3>
          <p className="text-slate-300 mb-6 max-w-md mx-auto">Start documenting your project progress by uploading or capturing photos</p>
          <Button 
            onClick={() => isMobile ? setShowMobileCapture(true) : setShowUpload(true)}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none shadow-lg min-h-[48px] px-6 rounded-xl"
          >
            {isMobile ? (
              <>
                <Camera className="w-5 h-5 mr-2" />
                Take Photo
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload Photo
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div 
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="relative rounded-2xl overflow-hidden cursor-pointer group border-4 border-slate-700 active:border-[#FFB800] shadow-2xl active:shadow-orange-500/30 transition-all touch-manipulation active:scale-[0.97] min-h-[200px]"
              style={{ aspectRatio: '1' }}
            >
              <img 
                src={photo.file_url}
                alt={photo.caption || 'Photo'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {photo.caption && (
                  <p className="text-base font-bold text-white mb-2 line-clamp-2 leading-tight drop-shadow-lg">{photo.caption}</p>
                )}
                <p className="text-sm text-slate-100 flex items-center gap-2 font-semibold drop-shadow">
                  <span>{format(new Date(photo.created_date), 'MMM dd, yyyy')}</span>
                  {photo.created_by && (
                    <>
                      <span>•</span>
                      <span className="truncate">{photo.created_by.split('@')[0]}</span>
                    </>
                  )}
                </p>
                {photo.location && (
                  <p className="text-sm text-slate-200 mt-1 flex items-center gap-1 font-medium drop-shadow">
                    <MapPin className="w-4 h-4" />
                    {photo.location}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

        </TabsContent>
      </Tabs>

      {/* Upload Dialog - Enhanced feedback */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Upload Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Image</Label>
              <div className="mt-1.5">
                {newPhoto.file_url ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-800">
                    <img src={newPhoto.file_url} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setNewPhoto({...newPhoto, file_url: ''})}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-amber-500/50 transition-colors">
                    <Upload className="w-8 h-8 text-slate-500 mb-2" />
                    <span className="text-sm text-slate-400">
                      {uploading ? 'Uploading...' : 'Click to upload image'}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <Textarea 
                value={newPhoto.caption}
                onChange={(e) => setNewPhoto({...newPhoto, caption: e.target.value})}
                placeholder="Photo description..."
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Location</Label>
              <Input 
                value={newPhoto.location}
                onChange={(e) => setNewPhoto({...newPhoto, location: e.target.value})}
                placeholder="e.g., Main hall"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowUpload(false)} className="border-slate-700 text-slate-300 min-h-[44px] hover:bg-slate-800">
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePhoto}
                disabled={!newPhoto.file_url || createPhotoMutation.isPending}
                className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none shadow-lg min-h-[44px] px-6"
              >
                {createPhotoMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer - Enhanced with author info */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl">
          {selectedPhoto && (
            <>
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700">
                <img 
                  src={selectedPhoto.file_url}
                  alt={selectedPhoto.caption || 'Photo'}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                <div className="flex-1">
                  {selectedPhoto.caption && (
                    <p className="text-white font-semibold text-base mb-2">{selectedPhoto.caption}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                    <span>{format(new Date(selectedPhoto.created_date), 'MMM dd, yyyy • HH:mm')}</span>
                    {selectedPhoto.created_by && (
                      <>
                        <span>•</span>
                        <span className="text-slate-300">{selectedPhoto.created_by.split('@')[0]}</span>
                      </>
                    )}
                    {selectedPhoto.location && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {selectedPhoto.location}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={selectedPhoto.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 min-h-[44px]">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </a>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this photo? This cannot be undone.')) {
                        deletePhotoMutation.mutate(selectedPhoto.id);
                      }
                    }}
                    disabled={deletePhotoMutation.isPending}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 min-h-[52px] touch-manipulation active:scale-95 font-semibold"
                  >
                    {deletePhotoMutation.isPending ? (
                      <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin mr-2" />
                    ) : (
                      <Trash2 className="w-5 h-5 mr-2" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Mobile Photo Capture */}
      <MobilePhotoCapture
        open={showMobileCapture}
        onOpenChange={setShowMobileCapture}
        jobId={jobId}
        onPhotoCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['field-photos', jobId] });
          setShowMobileCapture(false);
        }}
      />
    </div>
  );
}