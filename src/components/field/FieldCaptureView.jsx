import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Camera, 
  Upload, 
  FileText, 
  AlertTriangle, 
  ArrowLeftRight,
  Clock,
  Mic,
  X,
  Download,
  Trash2,
  MapPin,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { FIELD_QUERY_KEYS, FIELD_STABLE_QUERY_CONFIG } from './config/fieldQueryConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from 'sonner';
import MobilePhotoCapture from './MobilePhotoCapture';
import BeforeAfterPhotoManager from './BeforeAfterPhotoManager';
import PhotoComparisonView from './PhotoComparison';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import IncidentBottomSheet from './IncidentBottomSheet';
import DailyReportGenerator from './DailyReportGenerator';

/**
 * FASE 4 (UX): Unified Capture Section
 * 
 * Consolidates ALL visual documentation:
 * - Photos (camera-first)
 * - Daily Reports
 * - Safety Incidents
 * - Voice Notes
 * - Before/After Comparisons
 * 
 * Rationale: All "evidence capture" shares same mental model.
 * Default: Camera ready for instant access.
 */
// FASE 5 PERF: Memoized component
const FieldCaptureView = React.memo(function FieldCaptureView({ jobId, jobName, plans = [] }) {
  const [activeTab, setActiveTab] = useState('camera');
  const [showMobileCapture, setShowMobileCapture] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newPhoto, setNewPhoto] = useState({ file_url: '', caption: '', location: '' });
  const [showIncident, setShowIncident] = useState(false);
  const [showVoiceNote, setShowVoiceNote] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);

  const queryClient = useQueryClient();
  
  // FASE 5 PERF: Stable mobile detection
  const isMobile = React.useMemo(() => 
    typeof window !== 'undefined' && window.innerWidth < 768, 
    []
  );

  const { data: photos = [], isLoading } = useQuery({
    queryKey: FIELD_QUERY_KEYS.PHOTOS(jobId),
    queryFn: () => base44.entities.Photo.filter({ job_id: jobId }, '-created_date'),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const createPhotoMutation = useMutation({
    mutationFn: (data) => base44.entities.Photo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-photos', jobId] });
      setShowUpload(false);
      setNewPhoto({ file_url: '', caption: '', location: '' });
      toast.success('✓ Photo saved');
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (id) => base44.entities.Photo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-photos', jobId] });
      setSelectedPhoto(null);
      toast.success('✓ Photo deleted');
    },
  });

  // FASE 5 PERF: Stable callbacks (already optimized)
  const handleFileUpload = React.useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewPhoto(prev => ({ ...prev, file_url }));
    } catch (error) {
      toast.error('Failed to upload photo');
    }
    setUploading(false);
  }, []);

  const handleCreatePhoto = React.useCallback(() => {
    if (!newPhoto.file_url) return;
    createPhotoMutation.mutate({
      job_id: jobId,
      file_url: newPhoto.file_url,
      caption: newPhoto.caption,
      location: newPhoto.location,
    });
  }, [jobId, newPhoto, createPhotoMutation]);

  // FASE 5 PERF: Memoized quick actions (stable reference)
  const quickActions = React.useMemo(() => [
    { id: 'camera', label: 'Take Photo', icon: Camera, action: () => isMobile ? setShowMobileCapture(true) : setShowUpload(true) },
    { id: 'report', label: 'Daily Report', icon: FileText, action: () => setShowDailyReport(true) },
    { id: 'incident', label: 'Incident', icon: AlertTriangle, action: () => setShowIncident(true) },
    { id: 'voice', label: 'Voice Note', icon: Mic, action: () => setShowVoiceNote(true) },
  ], [isMobile]);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* FASE 4 POLISH: Camera-first hero CTA */}
      <div className="flex-shrink-0 p-4 sm:p-6 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Capture</h2>
            <p className="text-sm text-slate-400">Document progress & issues</p>
          </div>
          <Button
            onClick={() => isMobile ? setShowMobileCapture(true) : setShowUpload(true)}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black font-bold min-h-[56px] px-8 rounded-xl shadow-2xl active:scale-95 transition-transform"
          >
            <Camera className="w-6 h-6 mr-2" />
            Photo
          </Button>
        </div>

        {/* FASE 4 POLISH: Larger, clearer quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                className="flex flex-col items-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 rounded-xl border border-slate-600 transition-all min-h-[88px] touch-manipulation active:scale-95 shadow-lg"
              >
                <Icon className="w-6 h-6 text-orange-400" />
                <span className="text-sm font-bold text-white">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FASE 4 POLISH: Content with better visual hierarchy */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border-2 border-slate-700 p-1.5 rounded-xl mb-6 w-full shadow-xl">
            <TabsTrigger 
              value="camera" 
              className="flex-1 data-[state=active]:bg-orange-600 data-[state=active]:text-black min-h-[52px] font-bold rounded-lg data-[state=active]:shadow-lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              Gallery
            </TabsTrigger>
            <TabsTrigger 
              value="before-after" 
              className="flex-1 data-[state=active]:bg-orange-600 data-[state=active]:text-black min-h-[52px] font-bold rounded-lg data-[state=active]:shadow-lg"
            >
              <ArrowLeftRight className="w-5 h-5 mr-2" />
              Compare
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="flex-1 data-[state=active]:bg-orange-600 data-[state=active]:text-black min-h-[52px] font-bold rounded-lg data-[state=active]:shadow-lg"
            >
              <FileText className="w-5 h-5 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Gallery Tab */}
          <TabsContent value="camera" className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              </div>
            ) : photos.length === 0 ? (
              <div className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-16 text-center">
                <Camera className="w-24 h-24 text-slate-700 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-white mb-3">No Photos</h3>
                <p className="text-slate-400 mb-8 max-w-sm mx-auto">Capture site progress, issues, or before/after comparisons</p>
                <Button 
                  onClick={() => isMobile ? setShowMobileCapture(true) : setShowUpload(true)}
                  className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black font-bold min-h-[56px] px-8 shadow-xl rounded-xl active:scale-95 transition-transform"
                >
                  <Camera className="w-6 h-6 mr-2" />
                  Take First Photo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                    className="relative aspect-square bg-slate-950 rounded-xl overflow-hidden cursor-pointer hover:ring-4 hover:ring-orange-500 transition-all group shadow-lg active:scale-95"
                  >
                    <img 
                      src={photo.file_url || photo.photo_url}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm font-semibold truncate">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Before/After Tab */}
          <TabsContent value="before-after" className="mt-0">
            <BeforeAfterPhotoManager jobId={jobId} />
          </TabsContent>

          {/* FASE 4 POLISH: Larger, clearer report actions */}
          <TabsContent value="reports" className="mt-0">
            <div className="space-y-5">
              <button
                onClick={() => setShowDailyReport(true)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-700 rounded-2xl p-6 min-h-[88px] transition-all active:scale-[0.98] touch-manipulation shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-base text-white mb-1">Daily Report</div>
                    <div className="text-sm text-slate-400">Photos + Tasks + Progress</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setShowIncident(true)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-700 rounded-2xl p-6 min-h-[88px] transition-all active:scale-[0.98] touch-manipulation shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-base text-white mb-1">Safety Incident</div>
                    <div className="text-sm text-slate-400">Document issues immediately</div>
                  </div>
                </div>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

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

      {/* Upload Dialog (Desktop) */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
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
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-orange-500/50 transition-colors">
                    <Upload className="w-8 h-8 text-slate-500 mb-2" />
                    <span className="text-sm text-slate-400">
                      {uploading ? 'Uploading...' : 'Click to upload'}
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
              <Label className="text-slate-300">Caption</Label>
              <Textarea 
                value={newPhoto.caption}
                onChange={(e) => setNewPhoto({...newPhoto, caption: e.target.value})}
                placeholder="Describe the photo..."
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Location</Label>
              <Input 
                value={newPhoto.location}
                onChange={(e) => setNewPhoto({...newPhoto, location: e.target.value})}
                placeholder="e.g., Main hall, Room 101"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowUpload(false)}
                className="border-slate-700 text-slate-300 min-h-[48px]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePhoto}
                disabled={!newPhoto.file_url || createPhotoMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white min-h-[48px]"
              >
                {createPhotoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
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
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800">
                <img 
                  src={selectedPhoto.file_url || selectedPhoto.photo_url}
                  alt={selectedPhoto.caption}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                <div className="flex-1">
                  {selectedPhoto.caption && (
                    <p className="text-white font-semibold mb-2">{selectedPhoto.caption}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>{format(new Date(selectedPhoto.created_date), 'MMM dd, yyyy • HH:mm')}</span>
                    {selectedPhoto.location && (
                      <>
                        <span>•</span>
                        <MapPin className="w-3 h-3" />
                        <span>{selectedPhoto.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={selectedPhoto.file_url || selectedPhoto.photo_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 min-h-[44px]">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </a>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this photo?')) {
                        deletePhotoMutation.mutate(selectedPhoto.id);
                      }
                    }}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Voice Note Recorder */}
      <VoiceNoteRecorder
        open={showVoiceNote}
        onOpenChange={setShowVoiceNote}
        jobId={jobId}
        jobName={jobName}
        onComplete={() => setShowVoiceNote(false)}
      />

      {/* Incident Report */}
      <IncidentBottomSheet
        open={showIncident}
        onOpenChange={setShowIncident}
        jobId={jobId}
        jobName={jobName}
        onCreated={() => {
          setShowIncident(false);
          queryClient.invalidateQueries({ queryKey: ['safety-incidents', jobId] });
        }}
      />

      {/* Daily Report Generator */}
      {showDailyReport && (
        <DailyReportGenerator
          jobId={jobId}
          jobName={jobName}
          onClose={() => setShowDailyReport(false)}
        />
      )}
    </div>
  );
});

export default FieldCaptureView;