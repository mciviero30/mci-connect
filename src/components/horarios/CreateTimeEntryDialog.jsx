import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export default function CreateTimeEntryDialog({ open, onOpenChange }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    user_id: '',
    job_id: '',
    date: new Date(),
    check_in: '',
    check_out: '',
    work_type: 'normal',
    notes: ''
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-timeentry'],
    queryFn: async () => {
      const directory = await base44.entities.EmployeeDirectory.list('full_name', 100);
      console.log('👥 Loaded employees:', directory.length);
      return directory;
    },
    enabled: open,
    staleTime: 300000
  });

  // Fetch jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs-for-timeentry'],
    queryFn: async () => {
      const allJobs = await base44.entities.Job.list('name', 100);
      console.log('💼 Loaded jobs:', allJobs.length);
      return allJobs;
    },
    enabled: open,
    staleTime: 300000
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const employee = employees.find(e => e.user_id === data.user_id);
      
      // Calculate hours
      const [inH, inM] = data.check_in.split(':').map(Number);
      const [outH, outM] = data.check_out.split(':').map(Number);
      let inMinutes = inH * 60 + inM;
      let outMinutes = outH * 60 + outM;
      if (outMinutes < inMinutes) outMinutes += 24 * 60;
      const hours_worked = (outMinutes - inMinutes) / 60;

      const job = jobs.find(j => j.id === data.job_id);
      const dateStr = format(data.date, 'yyyy-MM-dd');

      // Create the time entry
      const timeEntry = await base44.entities.TimeEntry.create({
        user_id: data.user_id,
        employee_email: employee.employee_email,
        employee_name: employee.full_name,
        job_id: data.job_id,
        job_name: job?.name || '',
        date: dateStr,
        check_in: data.check_in,
        check_out: data.check_out,
        hours_worked,
        work_type: data.work_type,
        notes: data.notes,
        status: 'pending',
        geofence_validated: false,
        billable: true
      });

      // Auto-create calendar shift (fire-and-forget)
      try {
        const existing = await base44.entities.ScheduleShift.filter({
          user_id: data.user_id,
          job_id: data.job_id,
          date: dateStr
        });
        
        if (existing.length === 0) {
          await base44.entities.ScheduleShift.create({
            user_id: data.user_id,
            employee_email: employee.employee_email,
            employee_name: employee.full_name,
            job_id: data.job_id,
            job_name: job?.name || '',
            date: dateStr,
            start_time: data.check_in,
            end_time: data.check_out,
            shift_type: data.work_type === 'driving' ? 'appointment' : 'job_work',
            shift_title: data.work_type === 'driving' ? `Driving – ${job?.name}` : job?.name,
            status: 'confirmed',
            notes: 'auto_created_from_manual_entry'
          });
        }
      } catch (e) {
        console.warn('[AutoCalendar] Could not create shift from manual entry:', e);
      }

      return timeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      onOpenChange(false);
      setFormData({
        user_id: '',
        job_id: '',
        date: new Date(),
        check_in: '',
        check_out: '',
        work_type: 'normal',
        notes: ''
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-800 max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white text-xl font-bold">
            {language === 'es' ? 'Crear Entrada de Tiempo' : 'Create Time Entry'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                {language === 'es' ? 'Empleado *' : 'Employee *'}
              </Label>
              <Select value={formData.user_id} onValueChange={(value) => setFormData({...formData, user_id: value})}>
                <SelectTrigger className="bg-white dark:bg-slate-700 rounded-xl">
                  <SelectValue placeholder={language === 'es' ? 'Seleccionar empleado' : 'Select employee'} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 rounded-xl">
                  {employees.map(emp => (
                    <SelectItem key={emp.user_id} value={emp.user_id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                {language === 'es' ? 'Trabajo *' : 'Job *'}
              </Label>
              <Select value={formData.job_id} onValueChange={(value) => setFormData({...formData, job_id: value})}>
                <SelectTrigger className="bg-white dark:bg-slate-700 rounded-xl">
                  <SelectValue placeholder={language === 'es' ? 'Seleccionar trabajo' : 'Select job'} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 rounded-xl">
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                {language === 'es' ? 'Fecha *' : 'Date *'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl bg-white dark:bg-slate-700")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, 'PPP') : <span>{language === 'es' ? 'Seleccionar fecha' : 'Pick a date'}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-800 rounded-xl">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => setFormData({...formData, date: date || new Date()})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                {language === 'es' ? 'Tipo de Trabajo' : 'Work Type'}
              </Label>
              <Select value={formData.work_type} onValueChange={(value) => setFormData({...formData, work_type: value})}>
                <SelectTrigger className="bg-white dark:bg-slate-700 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 rounded-xl">
                  <SelectItem value="normal">{language === 'es' ? 'Normal' : 'Normal'}</SelectItem>
                  <SelectItem value="driving">{language === 'es' ? 'Manejo' : 'Driving'}</SelectItem>
                  <SelectItem value="setup">Setup</SelectItem>
                  <SelectItem value="cleanup">Cleanup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                {language === 'es' ? 'Hora de Entrada *' : 'Check In *'}
              </Label>
              <Input
                type="time"
                value={formData.check_in}
                onChange={(e) => setFormData({...formData, check_in: e.target.value})}
                className="bg-white dark:bg-slate-700 rounded-xl"
                required
              />
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                {language === 'es' ? 'Hora de Salida *' : 'Check Out *'}
              </Label>
              <Input
                type="time"
                value={formData.check_out}
                onChange={(e) => setFormData({...formData, check_out: e.target.value})}
                className="bg-white dark:bg-slate-700 rounded-xl"
                required
              />
            </div>

            <div className="col-span-2">
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                {language === 'es' ? 'Notas' : 'Notes'}
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="bg-white dark:bg-slate-700 rounded-xl"
                placeholder={language === 'es' ? 'Agregar notas adicionales...' : 'Add additional notes...'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || !formData.user_id || !formData.job_id || !formData.check_in || !formData.check_out}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md rounded-xl"
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {language === 'es' ? 'Creando...' : 'Creating...'}</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> {language === 'es' ? 'Crear Entrada' : 'Create Entry'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}