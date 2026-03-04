import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Save, X, Users, Calendar as CalendarIcon, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useNotificationService } from '../notifications/NotificationService';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/components/i18n/LanguageContext';

const MultiSelectEmployees = ({ employees, selected, onSelect, isLoading }) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start h-auto min-h-10">
                    <Users className="mr-2 h-4 w-4" />
                    <div className="flex flex-wrap gap-1">
                        {selected.length === 0 ? "Seleccionar empleados..." : 
                         selected.map(email => {
                            const emp = employees?.find(e => e.email === email);
                            return (
                                <Badge key={email} variant="secondary">
                                    {emp?.full_name || email}
                                    <X className="ml-1 h-3 w-3 cursor-pointer" onClick={(e) => {
                                        e.stopPropagation(); // Prevent popover from closing
                                        onSelect(email);
                                    }} />
                                </Badge>
                            );
                         })
                        }
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder="Buscar empleado..." />
                    <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                    <CommandGroup>
                        {isLoading ? <p className="p-4 text-sm text-center">Cargando...</p> :
                         employees?.map(employee => (
                            <CommandItem
                                key={employee.email}
                                onSelect={() => onSelect(employee.email)}
                                className={selected.includes(employee.email) ? "bg-accent text-accent-foreground" : ""}
                            >
                                {employee.full_name}
                                {selected.includes(employee.email) && <X className="ml-auto h-4 w-4 opacity-70" />}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


export default function AssignmentForm({ onClose, existingAssignment, selectedDate }) {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    const [employeeEmails, setEmployeeEmails] = useState(
        existingAssignment ? [existingAssignment.employee_email] : []
    );
    const [jobId, setJobId] = useState(existingAssignment ? existingAssignment.job_id : '');
    const [startDate, setStartDate] = useState(
        existingAssignment ? format(new Date(existingAssignment.date), 'yyyy-MM-dd') : 
        (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    );
    const [endDate, setEndDate] = useState(
        existingAssignment ? format(new Date(existingAssignment.date), 'yyyy-MM-dd') : 
        (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    );
    const [startTime, setStartTime] = useState(existingAssignment ? existingAssignment.start_time : '07:00');
    const [endTime, setEndTime] = useState(existingAssignment ? existingAssignment.end_time : '15:00');
    const [enforceHours, setEnforceHours] = useState(existingAssignment?.enforce_scheduled_hours || false);
    const [scheduledStart, setScheduledStart] = useState(existingAssignment?.scheduled_start_time || '07:00');
    const [scheduledEnd, setScheduledEnd] = useState(existingAssignment?.scheduled_end_time || '17:00');
    const [gracePeriod, setGracePeriod] = useState(existingAssignment?.early_clockout_grace_minutes || 5);
    const [breakMinutes, setBreakMinutes] = useState(existingAssignment?.scheduled_break_minutes || 60);
    const [maxHours, setMaxHours] = useState(existingAssignment?.max_daily_hours || 8);

    // SSOT: EmployeeDirectory is the only source for employee listings
    const { data: employees, isLoading: loadingEmployees } = useQuery({ 
      queryKey: ['employees'], 
      queryFn: async () => {
        const directory = await base44.entities.EmployeeDirectory.filter({ status: 'active' });
        return directory.map(d => ({
          id: d.user_id || d.id,
          email: d.employee_email,
          full_name: d.full_name
        }));
      }
    });
    const { data: jobs, isLoading: loadingJobs } = useQuery({ queryKey: ['activeJobs'], queryFn: () => base44.entities.Job.filter({ status: 'active' }) });

    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
        staleTime: Infinity
    });

    const { sendNotification } = useNotificationService(currentUser);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.JobAssignment.create(data),
        onSuccess: async (newAssignment) => {
            // Create notification for the assigned employee
            if (newAssignment.employee_email && newAssignment.employee_name) {
                try {
                    await base44.entities.Notification.create({
                        recipient_email: newAssignment.employee_email,
                        recipient_name: newAssignment.employee_name,
                        title: language === 'es' ? '📅 Nueva Asignación de Trabajo' : '📅 New Job Assignment',
                        message: language === 'es'
                            ? `Asignado a: ${newAssignment.job_name || newAssignment.event_title} - ${format(new Date(newAssignment.date), 'dd/MM/yyyy')} ${newAssignment.start_time || ''}`
                            : `Assigned to: ${newAssignment.job_name || newAssignment.event_title} - ${format(new Date(newAssignment.date), 'MM/dd/yyyy')} ${newAssignment.start_time || ''}`,
                        type: 'job_assignment',
                        priority: 'high',
                        link: '/page/Calendario',
                        related_entity_id: newAssignment.id,
                        related_entity_type: 'assignment',
                        read: false
                    });

                    // Send browser notification
                    if (Notification.permission === 'granted') {
                        new Notification(language === 'es' ? '📅 Nueva Asignación' : '📅 New Job Assignment', {
                            body: `${newAssignment.job_name} - ${format(new Date(newAssignment.date), 'MMM dd')}`,
                            icon: '/logo192.png',
                            badge: '/badge-icon.png',
                            tag: `assignment_${newAssignment.id}`,
                            requireInteraction: false,
                            vibrate: [200, 100, 200]
                        });
                    }
                } catch (error) {
                    console.error('Failed to create notification:', error);
                }
            }
        },
        onError: (error) => {
            console.error("Error creating assignment:", error);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.JobAssignment.update(id, data),
        onSuccess: async (updatedAssignment) => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            
            // Send notification about schedule update
            if (updatedAssignment.employee_email && updatedAssignment.employee_name) {
                try {
                    await base44.entities.Notification.create({
                        recipient_email: updatedAssignment.employee_email,
                        recipient_name: updatedAssignment.employee_name,
                        title: language === 'es' ? '🔄 Horario Actualizado' : '🔄 Schedule Updated',
                        message: language === 'es'
                            ? `Tu asignación ha sido modificada: ${updatedAssignment.job_name || updatedAssignment.event_title} - ${format(new Date(updatedAssignment.date), 'dd/MM/yyyy')}`
                            : `Your assignment has been updated: ${updatedAssignment.job_name || updatedAssignment.event_title} - ${format(new Date(updatedAssignment.date), 'MM/dd/yyyy')}`,
                        type: 'schedule_change',
                        priority: 'high',
                        link: '/page/Calendario',
                        related_entity_id: updatedAssignment.id,
                        related_entity_type: 'assignment',
                        read: false
                    });

                    // Send browser notification
                    if (Notification.permission === 'granted') {
                        new Notification(language === 'es' ? '🔄 Horario Actualizado' : '🔄 Schedule Updated', {
                            body: `${updatedAssignment.job_name} - ${format(new Date(updatedAssignment.date), 'MMM dd')}`,
                            icon: '/logo192.png',
                            badge: '/badge-icon.png',
                            tag: `schedule_update_${updatedAssignment.id}`,
                            vibrate: [200, 100, 200]
                        });
                    }
                } catch (error) {
                    console.error('Failed to create notification:', error);
                }
            }
            
            toast.success(t('assignmentUpdated'));
            onClose();
        },
        onError: (error) => {
            console.error("Error updating assignment:", error);
            toast.error(`Error: ${error.message}`);
        },
    });


    const handleEmployeeSelect = (email) => {
        setEmployeeEmails(prev => 
            prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (employeeEmails.length === 0) {
            toast.error("Por favor, seleccione al menos un empleado.");
            return;
        }
        if (!jobId) {
            toast.error("Por favor, seleccione un trabajo.");
            return;
        }
        if (!startDate || !endDate) {
            toast.error("Por favor, seleccione las fechas de inicio y fin.");
            return;
        }
        if (!startTime || !endTime) {
            toast.error("Por favor, seleccione las horas de inicio y fin.");
            return;
        }

        const selectedJob = jobs?.find(j => j.id === jobId);
        if (!selectedJob) {
            toast.error("El trabajo seleccionado no es válido.");
            return;
        }
        
        if (existingAssignment) {
            // Handle update
            if (employeeEmails.length > 1) {
                toast.error("Solo se puede actualizar la asignación de un empleado a la vez.");
                return;
            }
            if (startDate !== endDate) {
                toast.error("Solo se puede actualizar la asignación para una fecha a la vez.");
                return;
            }

            const updatedAssignmentData = {
                employee_email: employeeEmails[0],
                employee_name: employees?.find(e => e.email === employeeEmails[0])?.full_name || employeeEmails[0],
                job_id: jobId,
                job_name: selectedJob.name,
                date: startDate,
                start_time: startTime,
                end_time: endTime,
                enforce_scheduled_hours: enforceHours,
                scheduled_start_time: enforceHours ? scheduledStart : null,
                scheduled_end_time: enforceHours ? scheduledEnd : null,
                early_clockout_grace_minutes: enforceHours ? gracePeriod : 5,
                scheduled_break_minutes: enforceHours ? breakMinutes : 60,
                max_daily_hours: enforceHours ? maxHours : 8,
            };
            updateMutation.mutate({ id: existingAssignment.id, data: updatedAssignmentData });
        } else {
            // Handle create - potentially multiple assignments
            const assignmentsToCreate = [];
            let currentDate = new Date(startDate);
            const finalDate = new Date(endDate);
            
            while(currentDate <= finalDate) {
                employeeEmails.forEach(email => {
                    const employee = employees?.find(e => e.email === email);
                    assignmentsToCreate.push({
                        employee_email: email,
                        employee_name: employee?.full_name || email,
                        job_id: jobId,
                        job_name: selectedJob.name,
                        date: format(currentDate, 'yyyy-MM-dd'),
                        start_time: startTime,
                        end_time: endTime,
                        enforce_scheduled_hours: enforceHours,
                        scheduled_start_time: enforceHours ? scheduledStart : null,
                        scheduled_end_time: enforceHours ? scheduledEnd : null,
                        early_clockout_grace_minutes: enforceHours ? gracePeriod : 5,
                        scheduled_break_minutes: enforceHours ? breakMinutes : 60,
                        max_daily_hours: enforceHours ? maxHours : 8,
                    });
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }

            try {
                // Use mutateAsync for each assignment to allow notifications per assignment
                // and then handle success/error/closing after all are processed.
                const creationPromises = assignmentsToCreate.map(assignment => createMutation.mutateAsync(assignment));
                await Promise.all(creationPromises);

                queryClient.invalidateQueries({ queryKey: ['assignments'] });
                toast.success(t('assignmentCreated'));
                onClose();
            } catch (error) {
                toast.error(`Error: ${error.message}`);
            }
        }
    };

    const isProcessing = createMutation.isPending || updateMutation.isPending || loadingEmployees || loadingJobs;

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
                <div>
                    <Label htmlFor="employee-select">Empleado(s)</Label>
                    <MultiSelectEmployees 
                        employees={employees} 
                        selected={employeeEmails} 
                        onSelect={handleEmployeeSelect} 
                        isLoading={loadingEmployees} 
                    />
                </div>
                <div>
                    <Label htmlFor="job-select">Trabajo</Label>
                    <Select onValueChange={setJobId} required disabled={isProcessing} value={jobId}>
                        <SelectTrigger id="job-select"><SelectValue placeholder={isProcessing ? "Cargando..." : "Seleccionar trabajo"}/></SelectTrigger>
                        <SelectContent>
                            {jobs?.map(j => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="start-date">Fecha de Inicio</Label>
                        <Input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                    </div>
                     <div>
                        <Label htmlFor="end-date">Fecha de Fin</Label>
                        <Input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="start-time">Desde</Label>
                        <Input type="time" id="start-time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="end-time">Hasta</Label>
                        <Input type="time" id="end-time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                    </div>
                </div>

                {/* Shift Time Control */}
                <div className="border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 bg-blue-50 dark:bg-blue-950">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <Label className="text-sm font-bold text-blue-900 dark:text-blue-100">
                        {language === 'es' ? 'Control de Horas Programadas' : 'Scheduled Hours Control'}
                      </Label>
                    </div>
                    <Switch checked={enforceHours} onCheckedChange={setEnforceHours} />
                  </div>

                  {enforceHours && (
                    <div className="space-y-3 mt-4">
                      <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 p-2 rounded">
                        {language === 'es' 
                          ? '🔒 Las horas de entrada y salida se ajustarán automáticamente según este horario programado.'
                          : '🔒 Clock in/out times will be automatically adjusted to this scheduled shift.'}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-700 dark:text-slate-300">
                            {language === 'es' ? 'Inicio Programado' : 'Scheduled Start'}
                          </Label>
                          <Input 
                            type="time" 
                            value={scheduledStart} 
                            onChange={e => setScheduledStart(e.target.value)} 
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-700 dark:text-slate-300">
                            {language === 'es' ? 'Fin Programado' : 'Scheduled End'}
                          </Label>
                          <Input 
                            type="time" 
                            value={scheduledEnd} 
                            onChange={e => setScheduledEnd(e.target.value)} 
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-700 dark:text-slate-300">
                            {language === 'es' ? 'Gracia Salida (min)' : 'Early Out Grace (min)'}
                          </Label>
                          <Input 
                            type="number" 
                            value={gracePeriod} 
                            onChange={e => setGracePeriod(parseInt(e.target.value))} 
                            min="0"
                            max="30"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-700 dark:text-slate-300">
                            {language === 'es' ? 'Pausa (min)' : 'Break (min)'}
                          </Label>
                          <Input 
                            type="number" 
                            value={breakMinutes} 
                            onChange={e => setBreakMinutes(parseInt(e.target.value))} 
                            min="0"
                            max="120"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-slate-700 dark:text-slate-300">
                          {language === 'es' ? 'Máximo Horas Diarias' : 'Max Daily Hours'}
                        </Label>
                        <Input 
                          type="number" 
                          value={maxHours} 
                          onChange={e => setMaxHours(parseFloat(e.target.value))} 
                          min="1"
                          max="16"
                          step="0.5"
                          className="mt-1"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {language === 'es' ? 'El reloj se cerrará automáticamente al alcanzar este límite' : 'Clock will auto-stop when this limit is reached'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
                    <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
                <Button type="submit" disabled={isProcessing}>
                    <Save className="w-4 h-4 mr-2" /> {isProcessing ? "Guardando..." : "Guardar Asignación"}
                </Button>
            </div>
        </form>
    );
}