import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function TimeLogDialog({ open, onClose, jobs, user }) {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    job_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '08:00:00',
    check_out: '17:00:00',
    lunch_minutes: 30,
    hour_type: 'normal',
    work_type: 'normal',
    task_details: '',
    notes: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const checkIn = new Date(`${data.date}T${data.check_in}`);
      const checkOut = new Date(`${data.date}T${data.check_out}`);
      const totalMinutes = (checkOut - checkIn) / (1000 * 60);
      const hoursWorked = (totalMinutes - data.lunch_minutes) / 60;

      const selectedJob = jobs.find(j => j.id === data.job_id);

      return await base44.entities.TimeEntry.create({
        employee_email: user.email,
        employee_name: user.full_name,
        job_id: data.job_id,
        job_name: selectedJob?.name || '',
        date: data.date,
        check_in: data.check_in,
        check_out: data.check_out,
        lunch_minutes: data.lunch_minutes,
        hours_worked: hoursWorked,
        hour_type: data.hour_type,
        work_type: data.work_type,
        task_details: data.task_details,
        notes: data.notes,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allTimeEntries']);
      queryClient.invalidateQueries(['jobTimeEntries']);
      toast.success(language === 'es' ? 'Tiempo registrado exitosamente' : 'Time logged successfully');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.job_id) {
      toast.error(language === 'es' ? 'Selecciona un trabajo' : 'Please select a job');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            {language === 'es' ? 'Registrar Tiempo Trabajado' : 'Log Work Time'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-900 dark:text-white">{language === 'es' ? 'Trabajo' : 'Job'}</Label>
              <Select value={formData.job_id} onValueChange={(val) => setFormData({...formData, job_id: val})}>
                <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue placeholder={language === 'es' ? 'Seleccionar trabajo' : 'Select job'} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-900 dark:text-white">{language === 'es' ? 'Fecha' : 'Date'}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-900 dark:text-white">{language === 'es' ? 'Hora Entrada' : 'Check In'}</Label>
              <Input
                type="time"
                value={formData.check_in}
                onChange={(e) => setFormData({...formData, check_in: e.target.value + ':00'})}
                className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600"
              />
            </div>

            <div>
              <Label className="text-slate-900 dark:text-white">{language === 'es' ? 'Hora Salida' : 'Check Out'}</Label>
              <Input
                type="time"
                value={formData.check_out}
                onChange={(e) => setFormData({...formData, check_out: e.target.value + ':00'})}
                className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600"
              />
            </div>

            <div>
              <Label className="text-slate-900 dark:text-white">{language === 'es' ? 'Almuerzo (min)' : 'Lunch (min)'}</Label>
              <Input
                type="number"
                value={formData.lunch_minutes}
                onChange={(e) => setFormData({...formData, lunch_minutes: parseInt(e.target.value) || 0})}
                className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-900 dark:text-white">{language === 'es' ? 'Tipo de Hora' : 'Hour Type'}</Label>
              <Select value={formData.hour_type} onValueChange={(val) => setFormData({...formData, hour_type: val})}>
                <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="normal">{language === 'es' ? 'Normal' : 'Normal'}</SelectItem>
                  <SelectItem value="overtime">{language === 'es' ? 'Tiempo Extra' : 'Overtime'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-900 dark:text-white">{language === 'es' ? 'Tipo de Trabajo' : 'Work Type'}</Label>
              <Select value={formData.work_type} onValueChange={(val) => setFormData({...formData, work_type: val})}>
                <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="normal">{language === 'es' ? 'Normal' : 'Normal'}</SelectItem>
                  <SelectItem value="driving">{language === 'es' ? 'Conducción' : 'Driving'}</SelectItem>
                  <SelectItem value="setup">{language === 'es' ? 'Preparación' : 'Setup'}</SelectItem>
                  <SelectItem value="cleanup">{language === 'es' ? 'Limpieza' : 'Cleanup'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">{language === 'es' ? 'Detalles de Tarea' : 'Task Details'}</Label>
            <Input
              value={formData.task_details}
              onChange={(e) => setFormData({...formData, task_details: e.target.value})}
              placeholder={language === 'es' ? 'Descripción breve de la tarea' : 'Brief task description'}
              className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600"
            />
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">{language === 'es' ? 'Notas' : 'Notes'}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder={language === 'es' ? 'Notas adicionales' : 'Additional notes'}
              className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isLoading}>
              {createMutation.isLoading 
                ? (language === 'es' ? 'Guardando...' : 'Saving...') 
                : (language === 'es' ? 'Registrar Tiempo' : 'Log Time')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}