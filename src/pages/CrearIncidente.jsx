import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/i18n/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Upload, X, Plus, MapPin, FileText, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CrearIncidentePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    job_id: '',
    job_name: '',
    incident_date: new Date().toISOString(),
    incident_type: 'near_miss',
    severity: 'low',
    location: '',
    description: '',
    immediate_action_taken: '',
    affected_person: '',
    affected_person_email: '',
    injury_type: '',
    medical_attention_required: false,
    osha_reportable: false,
  });

  const [photos, setPhotos] = useState([]);
  const [witnesses, setWitnesses] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }, 'name'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Generate incident number
      const { incident_number } = await base44.functions.invoke('generateIncidentNumber');

      // Upload photos
      const uploadedPhotos = await Promise.all(
        photos.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return file_url;
        })
      );

      // Get location if available
      let latitude = null;
      let longitude = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (err) { /* intentionally silenced */ }

      }

      // WRITE GUARD — user_id required for new records (legacy tolerated)
      const writeData = {
        ...data,
        incident_number,
        reported_by_user_id: user?.id, // NEW: Enforce user_id
        reported_by: user.email,
        reported_by_name: user.full_name,
        photos: uploadedPhotos,
        witnesses,
        latitude,
        longitude,
      };

      if (!user?.id) {
      }

      return base44.entities.SafetyIncident.create(writeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safetyIncidents'] });
      toast({
        title: 'Incidente reportado exitosamente',
        variant: 'success'
      });
      navigate(createPageUrl('SafetyIncidents'));
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleJobChange = (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setFormData({
        ...formData,
        job_id: jobId,
        job_name: job.name,
      });
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setPhotos([...photos, ...files]);
  };

  const handleRemovePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleAddWitness = () => {
    setWitnesses([...witnesses, { name: '', email: '', statement: '' }]);
  };

  const handleWitnessChange = (index, field, value) => {
    const newWitnesses = [...witnesses];
    newWitnesses[index][field] = value;
    setWitnesses(newWitnesses);
  };

  const handleRemoveWitness = (index) => {
    setWitnesses(witnesses.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.job_id || !formData.description) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive'
      });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <PageHeader
        title="Reportar Incidente de Seguridad"
        description="Documentar incidente o casi accidente"
        icon={Shield}
        showBack={true}
      />

      <form onSubmit={handleSubmit}>
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Trabajo *</Label>
              <Select value={formData.job_id} onValueChange={handleJobChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar trabajo" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Incidente *</Label>
                <Select
                  value={formData.incident_type}
                  onValueChange={(value) => setFormData({ ...formData, incident_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="injury">Lesión</SelectItem>
                    <SelectItem value="near_miss">Casi Accidente</SelectItem>
                    <SelectItem value="property_damage">Daño a Propiedad</SelectItem>
                    <SelectItem value="equipment_failure">Falla de Equipo</SelectItem>
                    <SelectItem value="safety_violation">Violación de Seguridad</SelectItem>
                    <SelectItem value="environmental">Ambiental</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Severidad *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Fecha y Hora del Incidente *</Label>
              <Input
                type="datetime-local"
                value={formData.incident_date.slice(0, 16)}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Ubicación Específica en el Sitio</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="ej: Piso 3, Zona Norte"
              />
            </div>

            <div>
              <Label>Descripción del Incidente *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe lo que sucedió en detalle..."
                rows={4}
                required
              />
            </div>

            <div>
              <Label>Acción Inmediata Tomada</Label>
              <Textarea
                value={formData.immediate_action_taken}
                onChange={(e) => setFormData({ ...formData, immediate_action_taken: e.target.value })}
                placeholder="¿Qué se hizo inmediatamente después del incidente?"
                rows={3}
              />
            </div>

            {/* Person Affected */}
            {formData.incident_type === 'injury' && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-4">
                <h4 className="font-bold text-red-900 dark:text-red-400">Información de la Persona Afectada</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={formData.affected_person}
                      onChange={(e) => setFormData({ ...formData, affected_person: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.affected_person_email}
                      onChange={(e) => setFormData({ ...formData, affected_person_email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Tipo de Lesión</Label>
                  <Input
                    value={formData.injury_type}
                    onChange={(e) => setFormData({ ...formData, injury_type: e.target.value })}
                    placeholder="ej: Corte, fractura, quemadura..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="medical"
                    checked={formData.medical_attention_required}
                    onChange={(e) => setFormData({ ...formData, medical_attention_required: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="medical">¿Se requirió atención médica?</Label>
                </div>
              </div>
            )}

            {/* OSHA Reportable */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="osha"
                checked={formData.osha_reportable}
                onChange={(e) => setFormData({ ...formData, osha_reportable: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="osha" className="font-bold text-purple-700 dark:text-purple-400">
                ¿Reportable a OSHA?
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Fotos del Incidente</h3>
              <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById('photoInput').click()}>
                <Upload className="w-4 h-4 mr-2" />
                Subir Fotos
              </Button>
              <input
                id="photoInput"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {photos.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No hay fotos adjuntas</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photos.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white hover:bg-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Witnesses */}
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Testigos</h3>
              <Button type="button" size="sm" onClick={handleAddWitness} className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Testigo
              </Button>
            </div>

            {witnesses.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No hay testigos agregados</p>
            ) : (
              <div className="space-y-4">
                {witnesses.map((witness, index) => (
                  <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveWitness(index)}
                      className="absolute top-2 right-2 text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Nombre</Label>
                        <Input
                          value={witness.name}
                          onChange={(e) => handleWitnessChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={witness.email}
                          onChange={(e) => handleWitnessChange(index, 'email', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Declaración</Label>
                      <Textarea
                        value={witness.statement}
                        onChange={(e) => handleWitnessChange(index, 'statement', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(createPageUrl('SafetyIncidents'))}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]"
          >
            {createMutation.isPending ? 'Reportando...' : 'Reportar Incidente'}
          </Button>
        </div>
      </form>
    </div>
  );
}