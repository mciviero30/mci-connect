import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Ruler, Download, Image as ImageIcon, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DimensionCanvas from './dimensions/DimensionCanvas';
import DimensionDialog from './dimensions/DimensionDialog';
import { FIELD_STABLE_QUERY_CONFIG } from './config/fieldQueryConfig';
import { format } from 'date-fns';

export default function FieldDimensionsView({ jobId, jobName }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDimensionDialog, setShowDimensionDialog] = useState(false);
  const [activeDimension, setActiveDimension] = useState(null);
  const [editingDimension, setEditingDimension] = useState(null);
  const [projectUnitSystem, setProjectUnitSystem] = useState('imperial');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['field-currentUser', jobId],
    queryFn: () => base44.auth.me(),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: dimensions = [] } = useQuery({
    queryKey: ['field-dimensions', jobId],
    queryFn: () => base44.entities.FieldDimension.filter({ job_id: jobId }, '-created_date'),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['field-photos', jobId],
    queryFn: () => base44.entities.Photo.filter({ job_id: jobId }),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['field-plans', jobId],
    queryFn: () => base44.entities.Plan.filter({ job_id: jobId }),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const createDimensionMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldDimension.create({
      ...data,
      job_id: jobId,
      job_name: jobName,
      measured_by: user.email,
      measured_by_name: user.full_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-dimensions', jobId], exact: true });
      setShowDimensionDialog(false);
      setActiveDimension(null);
      toast.success('Dimension saved');
    },
  });

  const deleteDimensionMutation = useMutation({
    mutationFn: (id) => base44.entities.FieldDimension.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-dimensions', jobId], exact: true });
      toast.success('Dimension deleted');
    },
  });

  const handleStartDimension = (type) => {
    setActiveDimension({
      dimension_type: type,
      measurement_type: type === 'horizontal' ? 'FF-FF' : 'BM-C',
      unit_system: projectUnitSystem,
    });
  };

  const handleDimensionPlace = (canvasData) => {
    setEditingDimension({
      ...activeDimension,
      canvas_data: canvasData,
    });
    setShowDimensionDialog(true);
  };

  const handleSaveDimension = (data) => {
    createDimensionMutation.mutate(data);
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Generating PDF...');
      const response = await base44.functions.invoke('exportDimensionsPDF', {
        jobId,
        jobName,
        dimensions,
        unitSystem: projectUnitSystem,
      });
      
      // Download PDF
      const link = document.createElement('a');
      link.href = response.data.pdf_url;
      link.download = `dimensions_${jobName}_${Date.now()}.pdf`;
      link.click();
      
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF', { description: error.message });
    }
  };

  const imageOptions = [
    ...plans.map(p => ({ value: `plan_${p.id}`, label: `Plan: ${p.name}`, url: p.image_url, type: 'plan' })),
    ...photos.map(p => ({ value: `photo_${p.id}`, label: `Photo: ${p.caption || 'Untitled'}`, url: p.photo_url, type: 'photo' })),
  ];

  const filteredDimensions = selectedImage 
    ? dimensions.filter(d => {
        const [type, id] = selectedImage.split('_');
        return (type === 'plan' && d.blueprint_id === id) || (type === 'photo' && d.photo_id === id);
      })
    : dimensions;

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Ruler className="w-5 h-5 text-orange-500" />
              Field Dimensions
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Professional measurement documentation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Unit System Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setProjectUnitSystem('imperial')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] ${
                  projectUnitSystem === 'imperial'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Imperial
              </button>
              <button
                onClick={() => setProjectUnitSystem('metric')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] ${
                  projectUnitSystem === 'metric'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Metric
              </button>
            </div>

            {/* Export PDF */}
            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="min-h-[44px]"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>

            {/* New Dimension */}
            <Button
              onClick={() => handleStartDimension('horizontal')}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 min-h-[44px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Dimension
            </Button>
          </div>
        </div>

        {/* Image Selector */}
        <div className="mt-4">
          <Select value={selectedImage || ''} onValueChange={setSelectedImage}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select drawing or photo to dimension..." />
            </SelectTrigger>
            <SelectContent>
              {imageOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.type === 'plan' ? '📐' : '📷'} {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 min-h-0 p-4">
        {selectedImage ? (
          <DimensionCanvas
            imageUrl={imageOptions.find(o => o.value === selectedImage)?.url}
            dimensions={filteredDimensions}
            activeDimension={activeDimension}
            onDimensionPlace={handleDimensionPlace}
            unitSystem={projectUnitSystem}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-800 rounded-xl">
            <div className="text-center">
              <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Select a drawing or photo to start dimensioning</p>
            </div>
          </div>
        )}
      </div>

      {/* Dimensions List */}
      {filteredDimensions.length > 0 && (
        <div className="flex-shrink-0 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">
            Dimensions on this image ({filteredDimensions.length})
          </h3>
          <div className="space-y-2">
            {filteredDimensions.map(dim => (
              <Card key={dim.id} className="bg-slate-50 dark:bg-slate-900">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {formatDimensionValue(dim)}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                        {dim.measurement_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {dim.area || 'No area specified'} • {format(new Date(dim.created_date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDimensionMutation.mutate(dim.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dimension Dialog */}
      <DimensionDialog
        open={showDimensionDialog}
        onOpenChange={setShowDimensionDialog}
        dimension={editingDimension}
        jobId={jobId}
        jobName={jobName}
        onSave={handleSaveDimension}
      />
    </div>
  );
}

function formatDimensionValue(dim) {
  if (dim.unit_system === 'imperial') {
    const ft = dim.value_feet || 0;
    const inches = dim.value_inches || 0;
    const frac = dim.value_fraction || '0';
    
    let result = `${ft}' ${inches}"`;
    if (frac !== '0') {
      result = `${ft}' ${inches} ${frac}"`;
    }
    return result;
  } else {
    return `${dim.value_mm || 0}mm`;
  }
}