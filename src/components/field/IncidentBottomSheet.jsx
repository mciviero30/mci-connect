import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, X } from 'lucide-react';
import FieldBottomSheet from './FieldBottomSheet';
import { base44 } from '@/api/base44Client';

export default function IncidentBottomSheet({ 
  open, 
  onOpenChange, 
  jobId,
  jobName,
  onCreated 
}) {
  const [formData, setFormData] = useState({
    type: 'near_miss',
    severity: 'low',
    description: '',
    location: '',
    injured_person: '',
    witnesses: '',
    corrective_actions: '',
    photo_urls: [],
  });
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        photo_urls: [...prev.photo_urls, file_url]
      }));
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.location) {
      alert('Please fill in description and location');
      return;
    }

    try {
      await base44.entities.SafetyIncident.create({
        job_id: jobId,
        job_name: jobName,
        ...formData,
      });
      
      onCreated?.();
      onOpenChange(false);
      setFormData({
        type: 'near_miss',
        severity: 'low',
        description: '',
        location: '',
        injured_person: '',
        witnesses: '',
        corrective_actions: '',
        photo_urls: [],
      });
    } catch (error) {
      console.error('Error creating incident:', error);
    }
  };

  return (
    <FieldBottomSheet 
      open={open} 
      onOpenChange={onOpenChange}
      title="Report Incident"
      maxHeight="85vh"
    >
      <div className="space-y-5">
        {/* Type */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Incident Type *
          </Label>
          <Select 
            value={formData.type} 
            onValueChange={(v) => setFormData({ ...formData, type: v })}
          >
            <SelectTrigger className="mt-1.5 min-h-[52px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="near_miss" className="min-h-[48px]">⚠️ Near Miss</SelectItem>
              <SelectItem value="injury" className="min-h-[48px]">🩹 Injury</SelectItem>
              <SelectItem value="property_damage" className="min-h-[48px]">🔨 Property Damage</SelectItem>
              <SelectItem value="environmental" className="min-h-[48px]">🌍 Environmental</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Severity */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Severity *
          </Label>
          <Select 
            value={formData.severity} 
            onValueChange={(v) => setFormData({ ...formData, severity: v })}
          >
            <SelectTrigger className="mt-1.5 min-h-[52px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low" className="min-h-[48px]">🟢 Low</SelectItem>
              <SelectItem value="medium" className="min-h-[48px]">🟡 Medium</SelectItem>
              <SelectItem value="high" className="min-h-[48px]">🟠 High</SelectItem>
              <SelectItem value="critical" className="min-h-[48px]">🔴 Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Description *
          </Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What happened?"
            className="mt-1.5 min-h-[100px]"
          />
        </div>

        {/* Location */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Location *
          </Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Where did this occur?"
            className="mt-1.5 min-h-[52px]"
          />
        </div>

        {/* Photos */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
            Photos
          </Label>
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
              id="incident-camera"
            />
            <Button
              type="button"
              onClick={() => document.getElementById('incident-camera')?.click()}
              disabled={uploading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white min-h-[52px] touch-manipulation active:scale-95"
            >
              <Camera className="w-5 h-5 mr-2" />
              {uploading ? 'Uploading...' : 'Take Photo'}
            </Button>
          </div>

          {/* Photo Grid */}
          {formData.photo_urls.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {formData.photo_urls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      photo_urls: prev.photo_urls.filter((_, i) => i !== idx)
                    }))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button 
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white min-h-[56px] touch-manipulation active:scale-95 font-bold shadow-lg"
        >
          Submit Incident Report
        </Button>
      </div>
    </FieldBottomSheet>
  );
}