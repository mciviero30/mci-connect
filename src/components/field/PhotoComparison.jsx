import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ArrowLeftRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PhotoComparisonView({ jobId, photos = [] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [newComparison, setNewComparison] = useState({
    name: '',
    before_photo_id: '',
    after_photo_id: '',
    location: '',
  });

  const queryClient = useQueryClient();

  const { data: comparisons = [] } = useQuery({
    queryKey: ['photo-comparisons', jobId],
    queryFn: () => base44.entities.PhotoComparison.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PhotoComparison.create({ ...data, job_id: jobId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-comparisons', jobId] });
      setShowCreate(false);
      setNewComparison({ name: '', before_photo_id: '', after_photo_id: '', location: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PhotoComparison.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-comparisons', jobId] });
      setSelectedComparison(null);
    },
  });

  const getPhotoUrl = (photoId) => photos.find(p => p.id === photoId)?.file_url;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl">
          <h1 className="text-2xl font-bold text-black" style={{ fontSize: '1.575rem' }}>Comparaciones Antes/Después</h1>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nueva
        </Button>
      </div>

      {comparisons.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-2xl shadow-lg">
          <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-xl font-bold text-white mb-2">No before/after pairs yet</h3>
          <p className="text-slate-400 mb-4">Take photos with matching location tags to create comparisons</p>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Comparison
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {comparisons.map(comp => (
            <button
              key={comp.id}
              onClick={() => setSelectedComparison(comp)}
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:border-amber-500/50 transition-all text-left"
            >
              <p className="font-medium text-white text-sm">{comp.name}</p>
              {comp.location && (
                <p className="text-xs text-slate-400 mt-1">{comp.location}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Nueva Comparación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Nombre</Label>
              <Input
                value={newComparison.name}
                onChange={(e) => setNewComparison({ ...newComparison, name: e.target.value })}
                placeholder="Ej: Cocina - Remodelación"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Foto Antes</Label>
              <Select
                value={newComparison.before_photo_id}
                onValueChange={(v) => setNewComparison({ ...newComparison, before_photo_id: v })}
              >
                <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Seleccionar foto..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {photos.map(photo => (
                    <SelectItem key={photo.id} value={photo.id} className="text-white">
                      {photo.caption || 'Sin título'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Foto Después</Label>
              <Select
                value={newComparison.after_photo_id}
                onValueChange={(v) => setNewComparison({ ...newComparison, after_photo_id: v })}
              >
                <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Seleccionar foto..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {photos.map(photo => (
                    <SelectItem key={photo.id} value={photo.id} className="text-white">
                      {photo.caption || 'Sin título'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Ubicación</Label>
              <Input
                value={newComparison.location}
                onChange={(e) => setNewComparison({ ...newComparison, location: e.target.value })}
                placeholder="Ej: Sala principal"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-700">
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate(newComparison)}
                disabled={!newComparison.name || !newComparison.before_photo_id || !newComparison.after_photo_id}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Crear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comparison Viewer */}
      <Dialog open={!!selectedComparison} onOpenChange={() => setSelectedComparison(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl">
          {selectedComparison && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  {selectedComparison.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(selectedComparison.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="relative aspect-video overflow-hidden rounded-lg">
                {/* Before Image */}
                <img
                  src={getPhotoUrl(selectedComparison.before_photo_id)}
                  alt="Antes"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* After Image with clip */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <img
                    src={getPhotoUrl(selectedComparison.after_photo_id)}
                    alt="Después"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                {/* Slider */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <ArrowLeftRight className="w-4 h-4 text-slate-800" />
                  </div>
                </div>
                {/* Slider Input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                />
                {/* Labels */}
                <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-sm">
                  Antes
                </div>
                <div className="absolute bottom-4 right-4 bg-black/60 px-2 py-1 rounded text-sm">
                  Después
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}