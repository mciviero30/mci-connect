import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, FileText, Image, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SiteNoteContextLinker({ session, open, onOpenChange, onLinked }) {
  const [selectedArea, setSelectedArea] = useState(session.suggested_area || null);
  const [selectedPlan, setSelectedPlan] = useState(session.plan_id || null);
  const [selectedPhotos, setSelectedPhotos] = useState(session.linked_photo_ids || []);
  const [linking, setLinking] = useState(false);

  const { data: areas = [] } = useQuery({
    queryKey: ['job-areas', session.job_id],
    queryFn: async () => {
      const dimensions = await base44.entities.FieldDimension.filter({ 
        job_id: session.job_id 
      });
      return [...new Set(dimensions.map(d => d.area).filter(Boolean))];
    },
    enabled: !!session.job_id && open
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['job-plans', session.job_id],
    queryFn: () => base44.entities.Plan.filter({ job_id: session.job_id }),
    enabled: !!session.job_id && open
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['session-photos', session.job_id],
    queryFn: async () => {
      // Get photos from around the time of recording (±30 minutes)
      const sessionTime = new Date(session.session_start).getTime();
      const allPhotos = await base44.entities.Photo.filter({ job_id: session.job_id });
      
      return allPhotos.filter(p => {
        const photoTime = new Date(p.captured_date || p.created_date).getTime();
        const timeDiff = Math.abs(photoTime - sessionTime);
        return timeDiff <= 30 * 60 * 1000; // 30 minutes
      });
    },
    enabled: !!session.job_id && open
  });

  const handleConfirmLinking = async () => {
    setLinking(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.SiteNoteSession.update(session.id, {
        area: selectedArea || 'Unassigned',
        area_confirmed: true,
        area_confirmed_by: user.email,
        area_confirmed_at: new Date().toISOString(),
        plan_id: selectedPlan || null,
        linked_photo_ids: selectedPhotos
      });

      toast.success('Context linked successfully');
      onOpenChange(false);
      
      if (onLinked) {
        onLinked();
      }
    } catch (error) {
      console.error('Failed to link context:', error);
      toast.error('Failed to link context');
    } finally {
      setLinking(false);
    }
  };

  const handleSkipLinking = async () => {
    try {
      const user = await base44.auth.me();
      
      await base44.entities.SiteNoteSession.update(session.id, {
        area: 'Unassigned',
        area_confirmed: true,
        area_confirmed_by: user.email,
        area_confirmed_at: new Date().toISOString()
      });

      toast.info('Note marked as unassigned');
      onOpenChange(false);
      
      if (onLinked) {
        onLinked();
      }
    } catch (error) {
      console.error('Failed to skip linking:', error);
      toast.error('Failed to update note');
    }
  };

  const togglePhoto = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Site Note to Context</DialogTitle>
          <DialogDescription>
            Associate this site note with specific areas, drawings, or photos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Suggestion Alert */}
          {session.suggested_area && !session.area_confirmed && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="font-semibold text-blue-900 mb-1">
                  AI Detected Area: "{session.suggested_area}"
                </div>
                <div className="text-sm text-blue-700">
                  Confirm or select a different area below. This is a suggestion only.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Area Selection */}
          <div>
            <label className="font-semibold mb-2 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Area / Room
            </label>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {areas.map(area => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedArea === area
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-sm">{area}</div>
                    {session.suggested_area === area && (
                      <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">
                        AI Suggested
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
              
              {selectedArea && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Selected: {selectedArea}
                </div>
              )}
            </div>
          </div>

          {/* Plan Selection */}
          {plans.length > 0 && (
            <div>
              <label className="font-semibold mb-2 block flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Drawing / Plan (Optional)
              </label>
              <select
                value={selectedPlan || ''}
                onChange={(e) => setSelectedPlan(e.target.value || null)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="">No plan linked</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name || `Plan ${plan.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Photo Selection */}
          {photos.length > 0 && (
            <div>
              <label className="font-semibold mb-2 block flex items-center gap-2">
                <Image className="w-4 h-4" />
                Photos Taken During Recording ({photos.length})
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {photos.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => togglePhoto(photo.id)}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                      selectedPhotos.includes(photo.id)
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || 'Photo'}
                      className="w-full h-full object-cover"
                    />
                    {selectedPhotos.includes(photo.id) && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <Alert>
            <AlertDescription className="text-xs text-slate-600">
              No silent auto-assignment. You must confirm or skip linking.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkipLinking}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Skip - Mark Unassigned
            </Button>
            <Button
              onClick={handleConfirmLinking}
              disabled={!selectedArea || linking}
              className="flex-1 bg-blue-600 text-white"
            >
              {linking ? (
                'Linking...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Linking
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}