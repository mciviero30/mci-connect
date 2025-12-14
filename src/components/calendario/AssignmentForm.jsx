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
                        {selected.length === 0 ? "Select employees..." : 
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
                    <CommandInput placeholder="Search employee..." />
                    <CommandEmpty>No employees found.</CommandEmpty>
                    <CommandGroup>
                        {isLoading ? <p className="p-4 text-sm text-center">Loading...</p> :
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

    const { data: employees = [], isLoading: loadingEmployees } = useQuery({ 
        queryKey: ['employees'], 
        queryFn: async () => {
            try {
                return await base44.entities.User.list();
            } catch (error) {
                console.error('Error loading employees:', error);
                return [];
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
    const { data: jobs = [], isLoading: loadingJobs } = useQuery({ 
        queryKey: ['activeJobs'], 
        queryFn: async () => {
            try {
                return await base44.entities.Job.filter({ status: 'active' });
            } catch (error) {
                console.error('Error loading jobs:', error);
                return [];
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });

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
                    title: '📅 New Assignment',
                    message: `You've been assigned to: ${newAssignment.event_title || newAssignment.job_name} on ${format(new Date(newAssignment.date), 'MMM dd, yyyy')}`,
                    actionUrl: '/Calendario',
                    relatedEntityType: 'assignment',
                    relatedEntityId: newAssignment.id,
                    sendEmail: true
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
                    title: '📅 Schedule Updated',
                    message: `Your assignment has been updated: ${updatedAssignment.event_title || updatedAssignment.job_name}`,
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
            toast.error("Please select at least one employee.");
            return;
        }
        if (!jobId) {
            toast.error("Please select a job.");
            return;
        }
        if (!startDate || !endDate) {
            toast.error("Please select start and end dates.");
            return;
        }
        if (!startTime || !endTime) {
            toast.error("Please select start and end times.");
            return;
        }

        const selectedJob = jobs?.find(j => j.id === jobId);
        if (!selectedJob) {
            toast.error("Selected job is not valid.");
            return;
        }
        
        if (existingAssignment) {
            // Handle update
            if (employeeEmails.length > 1) {
                toast.error("Can only update one employee's assignment at a time.");
                return;
            }
            if (startDate !== endDate) {
                toast.error("Can only update assignment for one date at a time.");
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
                    <Label htmlFor="employee-select">Employee(s)</Label>
                    <MultiSelectEmployees 
                        employees={employees} 
                        selected={employeeEmails} 
                        onSelect={handleEmployeeSelect} 
                        isLoading={loadingEmployees} 
                    />
                </div>
                <div>
                    <Label htmlFor="job-select">Job</Label>
                    <Select onValueChange={setJobId} required disabled={isProcessing} value={jobId}>
                        <SelectTrigger id="job-select"><SelectValue placeholder={isProcessing ? "Loading..." : "Select job"}/></SelectTrigger>
                        <SelectContent>
                            {jobs?.map(j => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                    </div>
                     <div>
                        <Label htmlFor="end-date">End Date</Label>
                        <Input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="start-time">From</Label>
                        <Input type="time" id="start-time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="end-time">To</Label>
                        <Input type="time" id="end-time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
                    <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
                <Button type="submit" disabled={isProcessing}>
                    <Save className="w-4 h-4 mr-2" /> {isProcessing ? "Saving..." : "Save Assignment"}
                </Button>
            </div>
        </form>
    );
}