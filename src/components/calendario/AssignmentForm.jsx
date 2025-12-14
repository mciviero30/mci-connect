
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Save, X, Users, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useNotificationService } from '../notifications/NotificationService';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next'; // Assuming i18n for 't' and 'language'

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
    const { t, i18n } = useTranslation();
    const language = i18n.language;
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

    const { data: employees, isLoading: loadingEmployees } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.User.list() });
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
            // NEW: Send notification to assigned employee
            if (newAssignment.employee_email && newAssignment.employee_name) {
                await sendNotification({
                    recipientEmail: newAssignment.employee_email,
                    recipientName: newAssignment.employee_name,
                    type: 'assignment_new',
                    priority: 'high',
                    title: language === 'es' ? '📅 Nueva Asignación' : '📅 New Assignment',
                    message: language === 'es'
                        ? `Has sido asignado a: ${newAssignment.event_title || newAssignment.job_name} el ${format(new Date(newAssignment.date), 'MMM dd, yyyy')}`
                        : `You've been assigned to: ${newAssignment.event_title || newAssignment.job_name} on ${format(new Date(newAssignment.date), 'MMM dd, yyyy')}`,
                    actionUrl: '/Calendario',
                    relatedEntityType: 'assignment',
                    relatedEntityId: newAssignment.id,
                    sendEmail: true // Send email for assignments
                });
            }
            // toast.success(t('assignmentCreated')); // Moved to handleSubmit for batch/single control
            // onClose(); // Moved to handleSubmit for batch/single control
        },
        onError: (error) => {
            console.error("Error creating assignment:", error);
            // toast.error(`Error: ${error.message}`); // Moved to handleSubmit for batch/single control
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.JobAssignment.update(id, data),
        onSuccess: async (updatedAssignment) => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            
            // NEW: Send notification about schedule update
            if (updatedAssignment.employee_email && updatedAssignment.employee_name) {
                await sendNotification({
                    recipientEmail: updatedAssignment.employee_email,
                    recipientName: updatedAssignment.employee_name,
                    type: 'schedule_update',
                    priority: 'medium',
                    title: language === 'es' ? '📅 Horario Actualizado' : '📅 Schedule Updated',
                    message: language === 'es'
                        ? `Tu asignación ha sido actualizada: ${updatedAssignment.event_title || updatedAssignment.job_name}`
                        : `Your assignment has been updated: ${updatedAssignment.event_title || updatedAssignment.job_name}`,
                    actionUrl: '/Calendario',
                    relatedEntityType: 'assignment',
                    relatedEntityId: updatedAssignment.id
                });
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
                end_time: endTime
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
                        end_time: endTime
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
