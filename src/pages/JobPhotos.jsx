import React, { useState } from "react";
import { formatDate } from '@/lib/utils';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Image as ImageIcon, Trash2, Eye } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function JobPhotos() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    category: 'progress',
    description: '',
    file: null
  });

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.list('-created_date', 300);
      return jobs.find(j => j.id === jobId);
    },
    enabled: !!jobId
  });

  const { data: photos, isLoading } = useQuery({
    queryKey: ['jobPhotos', jobId],
    queryFn: () => base44.entities.Document.filter({ 
      job_id: jobId,
      file_type: 'image'
    }),
    initialData: [],
    enabled: !!jobId
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });
      
      return base44.entities.Document.create({
        file_name: data.file.name,
        file_url,
        file_type: 'image',
        file_size: data.file.size,
        category: 'photos',
        folder: data.category,
        job_id: jobId,
        job_name: job?.name,
        description: data.description,
        uploaded_by_email: (await base44.auth.me()).email,
        uploaded_by_name: (await base44.auth.me()).full_name,
        is_public: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobPhotos'] });
      setUploading(false);
      setUploadDialogOpen(false);
      setUploadForm({ category: 'progress', description: '', file: null });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobPhotos'] });
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = () => {
    if (!uploadForm.file) {
      alert('Please select a file');
      return;
    }
    uploadMutation.mutate(uploadForm);
  };

  const beforePhotos = photos.filter(p => p.folder === 'before');
  const afterPhotos = photos.filter(p => p.folder === 'after');
  const progressPhotos = photos.filter(p => p.folder === 'progress' || !p.folder);

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{background: 'linear-gradient(135deg, #0a1525 0%, #0f2942 100%)'}}>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={`Photos - ${job?.name || 'Loading...'}`}
          description={`${photos.length} photos uploaded`}
          icon={Camera}
          showBack
          actions={
            <Button onClick={() => setUploadDialogOpen(true)} className="bg-gradient-to-r from-cyan-500 to-blue-500">
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
          }
        />

        {/* Before Photos */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-cyan-400" />
            Before Photos ({beforePhotos.length})
          </h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {beforePhotos.map(photo => (
              <Card key={photo.id} className="glass-card border-cyan-500/20 group">
                <CardContent className="p-0 relative">
                  <img 
                    src={photo.file_url} 
                    alt={photo.file_name}
                    className="w-full h-64 object-cover rounded-t-lg cursor-pointer"
                    onClick={() => setSelectedImage(photo)}
                  />
                  <div className="p-4">
                    <p className="text-sm text-slate-400 line-clamp-2">{photo.description || 'No description'}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => setSelectedImage(photo)} className="flex-1 bg-slate-800 border-slate-700 text-slate-300">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(photo.id)} className="text-red-400 hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {beforePhotos.length === 0 && (
              <Card className="glass-card border-slate-700 col-span-full">
                <CardContent className="p-12 text-center">
                  <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500">No before photos yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Progress Photos */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-blue-400" />
            Progress Photos ({progressPhotos.length})
          </h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {progressPhotos.map(photo => (
              <Card key={photo.id} className="glass-card border-blue-500/20 group">
                <CardContent className="p-0 relative">
                  <img 
                    src={photo.file_url} 
                    alt={photo.file_name}
                    className="w-full h-64 object-cover rounded-t-lg cursor-pointer"
                    onClick={() => setSelectedImage(photo)}
                  />
                  <div className="p-4">
                    <p className="text-sm text-slate-400 line-clamp-2">{photo.description || 'No description'}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => setSelectedImage(photo)} className="flex-1 bg-slate-800 border-slate-700 text-slate-300">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(photo.id)} className="text-red-400 hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {progressPhotos.length === 0 && (
              <Card className="glass-card border-slate-700 col-span-full">
                <CardContent className="p-12 text-center">
                  <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500">No progress photos yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* After Photos */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-emerald-400" />
            After Photos ({afterPhotos.length})
          </h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {afterPhotos.map(photo => (
              <Card key={photo.id} className="glass-card border-emerald-500/20 group">
                <CardContent className="p-0 relative">
                  <img 
                    src={photo.file_url} 
                    alt={photo.file_name}
                    className="w-full h-64 object-cover rounded-t-lg cursor-pointer"
                    onClick={() => setSelectedImage(photo)}
                  />
                  <div className="p-4">
                    <p className="text-sm text-slate-400 line-clamp-2">{photo.description || 'No description'}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => setSelectedImage(photo)} className="flex-1 bg-slate-800 border-slate-700 text-slate-300">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(photo.id)} className="text-red-400 hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {afterPhotos.length === 0 && (
              <Card className="glass-card border-slate-700 col-span-full">
                <CardContent className="p-12 text-center">
                  <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500">No after photos yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Upload Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Photo Category</Label>
                <Select value={uploadForm.category} onValueChange={(v) => setUploadForm({...uploadForm, category: v})}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="before" className="text-white">Before</SelectItem>
                    <SelectItem value="progress" className="text-white">Progress</SelectItem>
                    <SelectItem value="after" className="text-white">After</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  placeholder="Add a description..."
                  className="bg-slate-800 border-slate-700 text-white"
                  rows={3}
                />
              </div>

              <div>
                <Label>Select Photo</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="photo-upload"
                />
                <Button
                  onClick={() => document.getElementById('photo-upload').click()}
                  variant="outline"
                  className="w-full mt-2 bg-slate-800 border-slate-700 text-slate-300"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadForm.file ? uploadForm.file.name : 'Choose File'}
                </Button>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)} className="flex-1 bg-slate-800 border-slate-700">
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={!uploadForm.file || uploading} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500">
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Viewer */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">{selectedImage?.file_name}</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <div>
                <img 
                  src={selectedImage.file_url} 
                  alt={selectedImage.file_name}
                  className="w-full rounded-lg"
                />
                {selectedImage.description && (
                  <p className="mt-4 text-slate-300">{selectedImage.description}</p>
                )}
                <p className="text-sm text-slate-500 mt-2">
                  Uploaded by {selectedImage.uploaded_by_name} on {formatDate(selectedImage.created_date)}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}