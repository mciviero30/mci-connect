
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, MapPin, Users, Save, X, Trash2, Briefcase } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Card } from '@/components/ui/card';
import { notifyJobAssignment, notifyScheduleChange } from '../notifications/notificationHelpers';

export default function AssignmentDialog({ open, onOpenChange, assignment, employees, jobs, onSubmit, onDelete, isProcessing, selectedDate, selectedEventType }) {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [jobId, setJobId] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (assignment) {
      setSelectedEmployees(assignment.employee_email ? [assignment.employee_email] : []);
      setJobId(assignment.job_id || '');
      setEventTitle(assignment.event_title || '');
      setStartDate(assignment.date || format(new Date(), 'yyyy-MM-dd'));
      setEndDate(assignment.date || format(new Date(), 'yyyy-MM-dd'));
      setStartTime(assignment.start_time || '07:00');
      setEndTime(assignment.end_time || '15:00');
      setNotes(assignment.notes || '');
    } else if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setSelectedEmployees([]);
      setJobId('');
      setEventTitle('');
      setStartDate(dateStr);
      setEndDate(dateStr);
      setStartTime('07:00');
      setEndTime('15:00');
      setNotes('');
    } else {
      setSelectedEmployees([]);
      setJobId('');
      setEventTitle('');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
      setStartTime('07:00');
      setEndTime('15:00');
      setNotes('');
    }
  }, [assignment, selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Determine event type (editing an existing assignment uses its type, otherwise use the type passed for creation)
    const eventType = assignment?.event_type || selectedEventType || 'appointment';
    const isAppointment = eventType === 'appointment';
    const isJobMilestone = eventType === 'job_milestone';

    // Validation based on event type
    if (isAppointment && !eventTitle) {
      alert('Please enter an event title.');
      return;
    }
    
    if (isJobMilestone) {
      if (!jobId) {
        alert('Please select a job for a job milestone.');
        return;
      }
      if (selectedEmployees.length === 0) {
        alert('Please select at least one employee for a job milestone.');
        return;
      }
    }

    // Find the selected job (if any)
    const selectedJob = jobs.find(j => j.id === jobId);

    // If editing existing assignment
    if (assignment) {
      const employee = employees.find(e => e.email === selectedEmployees[0]);
      const assignmentData = {
        // Employee fields are only relevant for job_milestones, or if an appointment is assigned to an employee
        employee_email: isAppointment ? (selectedEmployees[0] || '') : (selectedEmployees[0] || ''),
        employee_name: isAppointment ? (employee?.full_name || '') : (employee?.full_name || selectedEmployees[0] || ''),
        // Job fields are relevant for job_milestones, and optional for appointments
        job_id: jobId || '',
        job_name: selectedJob?.name || '',
        event_title: eventTitle || '',
        event_type: eventType,
        date: startDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes
      };
      
      await onSubmit({ id: assignment.id, data: assignmentData });

      // Send notifications for an updated event
      try {
        if (employee) {
          await notifyScheduleChange(assignmentData, employee, 'updated');
        }
      } catch (error) {
        console.error('Failed to send notification for updated assignment:', error);
      }

      return;
    }

    // Create new assignments for each day and employee
    const assignmentsToCreate = [];
    let currentDate = parseISO(startDate);
    const finalDate = parseISO(endDate);

    while (currentDate <= finalDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      if (isAppointment) {
        // For appointments, create one event, employees are optional
        assignmentsToCreate.push({
          employee_email: selectedEmployees[0] || '', // If an employee was selected for an appointment
          employee_name: employees.find(e => e.email === selectedEmployees[0])?.full_name || '',
          job_id: jobId || '',
          job_name: selectedJob?.name || '',
          event_title: eventTitle,
          event_type: eventType,
          date: dateStr,
          start_time: startTime,
          end_time: endTime,
          notes: notes
        });
      } else { // This means it's a job_milestone
        // For job milestones, create for each selected employee
        for (const email of selectedEmployees) {
          const employee = employees.find(e => e.email === email);
          assignmentsToCreate.push({
            employee_email: email,
            employee_name: employee?.full_name || email,
            job_id: jobId,
            job_name: selectedJob.name,
            event_title: eventTitle || '', // Milestone title is optional
            event_type: eventType,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            notes: notes
          });
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }

    // Create all assignments/events and send notifications
    try {
      for (const assignmentData of assignmentsToCreate) {
        await onSubmit(assignmentData);
        
        // Send notifications for new assignments
        try {
          const employee = employees.find(emp => emp.email === assignmentData.employee_email);
          const job = jobs.find(j => j.id === assignmentData.job_id);
          
          if (employee && assignmentData.event_type === 'job_milestone') {
            await notifyJobAssignment(assignmentData, job, employee);
          }
          // Note: notifyScheduleChange is typically for *changes* to existing schedules,
          // not initial creation, unless business logic dictates otherwise.
          // The prompt only explicitly asks for notifyJobAssignment for new job_milestones.
        } catch (error) {
          console.error('Failed to send notification for new assignment:', error);
        }
      }
      
      // Close dialog after all created
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating assignments:', error);
      alert('Error creating assignments: ' + error.message);
    }
  };

  const handleDelete = () => {
    if (assignment && window.confirm('Are you sure you want to delete this assignment?')) {
      onDelete(assignment.id);
    }
  };

  const selectedJob = jobs.find(j => j.id === jobId);
  const eventType = assignment?.event_type || selectedEventType || 'appointment';
  const isAppointment = eventType === 'appointment';
  const isJobMilestone = eventType === 'job_milestone';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              {isAppointment && <CalendarIcon className="w-6 h-6 text-[#3B9FF3]" />}
              {isJobMilestone && <Briefcase className="w-6 h-6 text-purple-500" />}
              {assignment 
                ? (isAppointment ? 'Edit Appointment' : 'Edit Job Milestone')
                : (isAppointment ? 'New Appointment' : 'New Job Milestone')}
            </DialogTitle>
            {assignment && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Event Title (for appointments) */}
          {isAppointment && (
            <div>
              <Label className="text-white mb-2 block">Event Title *</Label>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g., Team Meeting, Client Call, Site Visit"
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>
          )}

          {/* Job Selection (for job milestones) */}
          {isJobMilestone && (
            <div>
              <Label className="text-white mb-2 block">Job / Project *</Label>
              <Select value={jobId} onValueChange={setJobId} required>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id} className="text-white">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-${job.color}-500`} />
                        {job.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Related Job (Optional for Appointments) */}
          {isAppointment && (
            <div>
              <Label className="text-white mb-2 block">Related Job (Optional)</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Link to a job (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value={null} className="text-white">None</SelectItem> {/* Allow unselecting job */}
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id} className="text-white">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-${job.color}-500`} />
                        {job.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Milestone Title (Optional for job milestones) */}
          {isJobMilestone && (
            <div>
              <Label className="text-white mb-2 block">Milestone Title (Optional)</Label>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g., Installation Deadline, Material Delivery"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          )}

          {/* Job Details Preview - only if a job is selected */}
          {selectedJob && (
            <Card className="p-4 bg-slate-800/50 border-slate-700">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#3B9FF3]" />
                Job Details
              </h3>
              <div className="space-y-2 text-sm">
                {selectedJob.address && (
                  <p className="text-slate-300"><span className="text-slate-500">Address:</span> {selectedJob.address}</p>
                )}
                {selectedJob.description && (
                  <p className="text-slate-300"><span className="text-slate-500">Description:</span> {selectedJob.description}</p>
                )}
              </div>
            </Card>
          )}

          {/* Employee Selection (Required for job milestones, Optional for appointments) */}
          {/* Always show for 'edit' if the event type was a job_milestone or an appointment with assigned employees */}
          {(!isAppointment || (isAppointment && (assignment?.employee_email || selectedEmployees.length > 0))) && (
            <div>
              <Label className="text-white mb-2 block flex items-center gap-2">
                <Users className="w-4 h-4" />
                Employees {!isAppointment && '*'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-700 text-white h-auto min-h-10">
                    {selectedEmployees.length === 0 ? (
                      "Select employees..."
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selectedEmployees.map(email => {
                          const emp = employees.find(e => e.email === email);
                          return (
                            <Badge key={email} variant="secondary" className="bg-[#3B9FF3] text-white">
                              {emp?.full_name || email}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-slate-900 border-slate-800">
                  <Command>
                    <CommandInput placeholder="Search employee..." className="text-white" />
                    <CommandEmpty className="text-slate-500 p-4">Not found.</CommandEmpty>
                    <CommandGroup>
                      {employees.filter(e => e.employment_status === 'active').map(emp => (
                        <CommandItem
                          key={emp.email}
                          onSelect={() => {
                            setSelectedEmployees(prev =>
                              prev.includes(emp.email)
                                ? prev.filter(e => e !== emp.email)
                                : [...prev, emp.email]
                            );
                          }}
                          className="text-white"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 ${selectedEmployees.includes(emp.email) ? 'bg-[#3B9FF3] border-[#3B9FF3]' : 'border-slate-600'}`} />
                            {emp.full_name}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white mb-2 block">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-white mb-2 block">End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white mb-2 block">Start Time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-white mb-2 block">End Time</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-white mb-2 block">Notes / Instructions</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional information..."
              className="bg-slate-800 border-slate-700 text-white h-24"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing} className="bg-slate-800 border-slate-700 text-white">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                isProcessing || 
                (isAppointment && !eventTitle) || 
                (isJobMilestone && (!jobId || selectedEmployees.length === 0))
              } 
              className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isProcessing ? 'Saving...' : 'Save Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
