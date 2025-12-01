import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Upload, X, Expand, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function FieldPhotosView({ jobId }) {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newPhoto, setNewPhoto] = useState({ file_url: '', caption: '', location: '' });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-photos', jobId] });
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
    createPhotoMutation.mutate({
      job_id: jobId,
      file_url: newPhoto.file_url,
      caption: newPhoto.caption,
      location: newPhoto.location,
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#D4C85C]">Fotos</h1>
        <Button 
          onClick={() => setShowUpload(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Subir Foto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center">
          <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No hay fotos</h3>
          <p className="text-slate-400 mb-4">Sube fotos del progreso del proyecto</p>
          <Button 
            onClick={() => setShowUpload(true)}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Upload className="w-4 h-4 mr-2" />
            Subir Foto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div 
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
            >
              <img 
                src={photo.file_url}
                alt={photo.caption || 'Foto'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.caption && (
                  <p className="text-sm text-white truncate">{photo.caption}</p>
                )}
                <p className="text-xs text-slate-300">
                  {format(new Date(photo.created_date), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Subir Foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Imagen</Label>
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
                      {uploading ? 'Subiendo...' : 'Click para subir imagen'}
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
              <Label className="text-slate-300">Descripción</Label>
              <Textarea 
                value={newPhoto.caption}
                onChange={(e) => setNewPhoto({...newPhoto, caption: e.target.value})}
                placeholder="Descripción de la foto..."
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Ubicación</Label>
              <Input 
                value={newPhoto.location}
                onChange={(e) => setNewPhoto({...newPhoto, location: e.target.value})}
                placeholder="Ej: Sala principal"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowUpload(false)} className="border-slate-700 text-slate-300">
                Cancelar
              </Button>
              <Button 
                onClick={handleCreatePhoto}
                disabled={!newPhoto.file_url || createPhotoMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {createPhotoMutation.isPending ? 'Guardando...' : 'Guardar Foto'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl">
          {selectedPhoto && (
            <>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-800">
                <img 
                  src={selectedPhoto.file_url}
                  alt={selectedPhoto.caption || 'Foto'}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex items-center justify-between mt-4">
                <div>
                  {selectedPhoto.caption && (
                    <p className="text-white font-medium">{selectedPhoto.caption}</p>
                  )}
                  <p className="text-sm text-slate-400">
                    {format(new Date(selectedPhoto.created_date), 'dd MMM yyyy HH:mm')}
                    {selectedPhoto.location && ` • ${selectedPhoto.location}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a href={selectedPhoto.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  </a>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deletePhotoMutation.mutate(selectedPhoto.id)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}