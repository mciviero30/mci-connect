import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays as CalendarIcon, MapPin, Users, Save, X, Trash2, Briefcase, Copy, Check } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { SyncStatusBadge, useSyncStatus } from '@/components/feedback/SyncStatusBadge';

export default function AssignmentDialog({ 
  open, 
  onOpenChange, 
  shift, 
  employees, 
  jobs, 
  onSubmit, 
  onDelete,
  onDeleteAllForJob,
  onCopyShift,
  isProcessing, 
  selectedDate, 
  selectedTime,
  selectedEventType 
}) {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [jobId, setJobId] = useState('');
  const [shiftTitle, setShiftTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [notes, setNotes] = useState('');
  const [customColor, setCustomColor] = useState('');

  // Check sync status for existing shift
  const syncStatus = useSyncStatus('ScheduleShift', shift?.id);

  useEffect(() => {
    if (shift) {
      // Dual-key: prefer employee_email for picker (it stores emails), fallback gracefully
      const empEmail = shift.employee_email || '';
      setSelectedEmployees(empEmail ? [empEmail] : []);
      setJobId(shift.job_id || '');
      setShiftTitle(shift.shift_title || '');
      setStartDate(shift.date || format(new Date(), 'yyyy-MM-dd'));
      setEndDate(shift.date || format(new Date(), 'yyyy-MM-dd'));
      setStartTime(shift.start_time || '07:00');
      setEndTime(shift.end_time || '15:00');
      setNotes(shift.notes || '');
      setCustomColor(shift.custom_color || '');
    } else if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setSelectedEmployees([]);
      setJobId('');
      setShiftTitle('');
      setStartDate(dateStr);
      setEndDate(dateStr);
      setStartTime(selectedTime || '07:00');
      setEndTime(selectedTime ? format(new Date(`2000-01-01T${selectedTime}`).getTime() + 8*3600000, 'HH:mm') : '15:00');
      setNotes('');
    } else {
      setSelectedEmployees([]);
      setJobId('');
      setShiftTitle('');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
      setStartTime('07:00');
      setEndTime('15:00');
      setNotes('');
      setCustomColor('');
    }
  }, [shift, selectedDate, selectedTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const shiftType = shift?.shift_type || selectedEventType || 'appointment';
    const isAppointment = shiftType === 'appointment';
    const isJobWork = shiftType === 'job_work';

    if (isAppointment && !shiftTitle) {
      alert('Please enter an event title.');
      return;
    }
    
    if (isJobWork) {
      if (!jobId) {
        alert('Please select a job.');
        return;
      }
      if (selectedEmployees.length === 0) {
        alert('Please select at least one employee.');
        return;
      }
    }

    const selectedJob = (jobs || []).find(j => j.id === jobId);

    if (shift) {
      const employee = (employees || []).find(e => e.email === selectedEmployees[0]);
      
      // WRITE GUARD — user_id required for new records (legacy tolerated)
      const shiftData = {
        user_id: employee?.id, // NEW: Enforce user_id on update
        employee_email: selectedEmployees[0] || '',
        employee_name: employee?.full_name || selectedEmployees[0] || '',
        job_id: jobId || '',
        job_name: selectedJob?.name || '',
        shift_title: shiftTitle || '',
        shift_type: shiftType,
        date: startDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes,
        color: selectedJob?.color || '',
        custom_color: customColor,
        status: shift.status || 'scheduled'
      };
      
      if (!employee?.id && !shift.user_id) {
        console.warn('[WRITE GUARD] ⚠️ Updating ScheduleShift without user_id', {
          email: selectedEmployees[0]
        });
      }
      
      onSubmit(shiftData);
      
      // Send email notification for schedule update
      if (selectedEmployees[0] && jobId) {
        try {
          await base44.functions.invoke('sendCalendarNotification', {
            employeeEmail: selectedEmployees[0],
            employeeName: employee?.full_name || selectedEmployees[0],
            eventType: 'schedule_update',
            jobName: selectedJob?.name || '',
            date: startDate,
            startTime: startTime,
            endTime: endTime,
            notes: notes,
            assignmentId: shift.id
          });
        } catch (error) {
          console.error('Failed to send email notification:', error);
        }
      }
      
      return;
    }

    const shiftsToCreate = [];
    let currentDate = parseISO(startDate);
    const finalDate = parseISO(endDate);

    while (currentDate <= finalDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      if (isAppointment) {
        const employee = (employees || []).find(e => e.email === selectedEmployees[0]);
        
        // WRITE GUARD — user_id required for new records (legacy tolerated)
        shiftsToCreate.push({
          user_id: employee?.id, // NEW: Enforce user_id
          employee_email: selectedEmployees[0] || '',
          employee_name: employee?.full_name || '',
          job_id: jobId || '',
          job_name: selectedJob?.name || '',
          shift_title: shiftTitle,
          shift_type: shiftType,
          date: dateStr,
          start_time: startTime,
          end_time: endTime,
          notes: notes,
          color: selectedJob?.color || '',
          custom_color: customColor,
          status: 'scheduled'
        });
        
        if (!employee?.id) {
          console.warn('[WRITE GUARD] ⚠️ Creating ScheduleShift (appointment) without user_id', {
            email: selectedEmployees[0]
          });
        }
      } else {
        for (const email of selectedEmployees) {
          const employee = (employees || []).find(e => e.email === email);
          
          // WRITE GUARD — user_id required for new records (legacy tolerated)
          shiftsToCreate.push({
            user_id: employee?.id, // NEW: Enforce user_id
            employee_email: email,
            employee_name: employee?.full_name || email,
            job_id: jobId,
            job_name: selectedJob?.name || '',
            shift_title: shiftTitle || '',
            shift_type: shiftType,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            notes: notes,
            color: selectedJob?.color || '',
            custom_color: customColor,
            status: 'scheduled'
          });
          
          if (!employee?.id) {
            console.warn('[WRITE GUARD] ⚠️ Creating ScheduleShift (job work) without user_id', {
              email
            });
          }
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }

    for (const shiftData of shiftsToCreate) {
      await onSubmit(shiftData);
      
      // Send email notification for new assignment
      if (shiftData.employee_email && shiftData.job_id) {
        try {
          await base44.functions.invoke('sendCalendarNotification', {
            employeeEmail: shiftData.employee_email,
            employeeName: shiftData.employee_name,
            eventType: 'new_assignment',
            jobName: shiftData.job_name,
            date: shiftData.date,
            startTime: shiftData.start_time,
            endTime: shiftData.end_time,
            notes: shiftData.notes
          });
        } catch (error) {
          console.error('Failed to send email notification:', error);
        }
      }
    }
    
    onOpenChange(false);
  };

  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

  const handleDelete = () => {
    setShowDeleteOptions(true);
  };

  const handleDeleteSingle = () => {
    if (shift) {
      onDelete(shift.id);
      setShowDeleteOptions(false);
    }
  };

  const handleDeleteAllForProject = () => {
    if (shift && shift.job_id && onDeleteAllForJob) {
      onDeleteAllForJob(shift.job_id, shift.job_name);
      setShowDeleteOptions(false);
    }
  };

  const selectedJob = (jobs || []).find(j => j.id === jobId);
  const shiftType = shift?.shift_type || selectedEventType || 'appointment';
  const isAppointment = shiftType === 'appointment';
  const isJobWork = shiftType === 'job_work';

  const activeEmployees = (employees || []).filter(e => e.employment_status === 'active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-0 rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-3">
                {isAppointment && <CalendarIcon className="w-6 h-6 text-[#1E3A8A]" />}
                {isJobWork && <Briefcase className="w-6 h-6 text-[#1E3A8A]" />}
                {shift 
                  ? (isAppointment ? 'Edit Appointment' : 'Edit Job Shift')
                  : (isAppointment ? 'New Appointment' : 'New Job Shift')}
              </DialogTitle>
              {shift && (
                <SyncStatusBadge 
                  status={syncStatus}
                  onRetry={() => {
                    const queue = JSON.parse(localStorage.getItem('offline_mutation_queue') || '[]');
                    const updated = queue.map(op => 
                      op.entity === 'ScheduleShift' && op.entityId === shift.id
                        ? { ...op, status: 'pending', retryCount: 0 }
                        : op
                    );
                    localStorage.setItem('offline_mutation_queue', JSON.stringify(updated));
                    window.location.reload();
                  }}
                />
              )}
            </div>
            {shift && (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onCopyShift?.(shift);
                    onOpenChange(false);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/10"
                  title="Copy shift"
                >
                  <Copy className="w-5 h-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {isAppointment && (
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">Event Title *</Label>
              <Input
                value={shiftTitle}
                onChange={(e) => setShiftTitle(e.target.value)}
                placeholder="e.g., Team Meeting, Client Call, Site Visit"
                className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1E3A8A] focus:ring-[#1E3A8A]"
                required
              />
            </div>
          )}

          {isJobWork && (
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">Job / Project *</Label>
              <Select value={jobId} onValueChange={setJobId} required>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1E3A8A] focus:ring-[#1E3A8A]">
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-lg z-50" align="start">
                  {!jobs || jobs.length === 0 ? (
                    <div className="p-2 text-sm text-slate-500">
                      {!jobs ? 'Loading jobs...' : 'No jobs available'}
                    </div>
                  ) : (
                    jobs.map(job => {
                      if (!job || !job.id) return null;
                      const jobName = job.name || 'Unnamed';
                      const jobColor = job.color || 'blue';
                      return (
                        <SelectItem key={job.id} value={job.id} className="text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              jobColor === 'blue' ? 'bg-blue-600' :
                              jobColor === 'green' ? 'bg-green-600' :
                              jobColor === 'purple' ? 'bg-purple-600' :
                              jobColor === 'cyan' ? 'bg-cyan-600' :
                              jobColor === 'pink' ? 'bg-pink-600' :
                              jobColor === 'red' ? 'bg-red-600' :
                              'bg-slate-600'
                            }`} />
                            {jobName}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {isAppointment && (
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">Related Job (Optional)</Label>
              <Select value={jobId || '__none__'} onValueChange={(v) => setJobId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1E3A8A]">
                  <SelectValue placeholder="Link to a job (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-lg z-50" align="start">
                  <SelectItem value="__none__" className="text-slate-900">None</SelectItem>
                  {(jobs || []).map(job => (
                    <SelectItem key={job.id} value={job.id} className="text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          job.color === 'blue' ? 'bg-blue-600' :
                          job.color === 'green' ? 'bg-green-600' :
                          job.color === 'purple' ? 'bg-purple-600' :
                          job.color === 'cyan' ? 'bg-cyan-600' :
                          job.color === 'pink' ? 'bg-pink-600' :
                          job.color === 'red' ? 'bg-red-600' :
                          'bg-slate-600'
                        }`} />
                        {job.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isJobWork && (
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">Shift Title (Optional)</Label>
              <Input
                value={shiftTitle}
                onChange={(e) => setShiftTitle(e.target.value)}
                placeholder="e.g., Morning Installation, Material Setup"
                className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1E3A8A]"
              />
            </div>
          )}

          {selectedJob && (
            <Card className="p-3 bg-slate-50 border-slate-200 rounded-lg">
              <h3 className="font-semibold text-sm text-slate-900 mb-2 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#1E3A8A]" />
                Job Details
              </h3>
              <div className="space-y-1 text-xs">
                {selectedJob.address && (
                  <p className="text-slate-700"><span className="text-slate-500 font-medium">Address:</span> {selectedJob.address}</p>
                )}
                {selectedJob.description && (
                  <p className="text-slate-700 line-clamp-2"><span className="text-slate-500 font-medium">Description:</span> {selectedJob.description}</p>
                )}
              </div>
            </Card>
          )}

          <div>
            <Label className="text-slate-900 dark:text-white mb-2 block flex items-center gap-2">
              <Users className="w-4 h-4" />
              Employees {isJobWork && '*'}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white h-auto min-h-10">
                  {selectedEmployees.length === 0 ? (
                    "Select employees..."
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedEmployees.map(email => {
                        const emp = (employees || []).find(e => e.email === email);
                        const displayName = (() => {
                          if (!emp) return email;
                          if (emp.first_name && emp.last_name) {
                            return `${emp.first_name} ${emp.last_name}`.trim();
                          }
                          if (emp.full_name && !emp.full_name.includes('@')) {
                            return emp.full_name;
                          }
                          return email.split('@')[0].split('.').map(p => 
                            p.charAt(0).toUpperCase() + p.slice(1)
                          ).join(' ');
                        })();
                        
                        return (
                          <Badge key={email} variant="secondary" className="badge-soft-blue">
                            {displayName}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <Command className="bg-white dark:bg-slate-900">
                  <CommandInput placeholder="Search employee..." className="text-slate-900 dark:text-white" />
                  <CommandEmpty className="text-slate-500 p-4">Not found.</CommandEmpty>
                  <CommandGroup>
                    {(employees || [])
                      .filter(e => {
                        // Exclude deleted/archived
                        if (e.employment_status === 'deleted' || e.employment_status === 'archived') return false;
                        
                        // Exclude only Modern Components (mciviero30@yahoo.com)
                        if (e.email === 'mciviero30@yahoo.com') return false;
                        
                        return true;
                      })
                      .map(emp => {
                        // Display name logic: consistent with ModernEmployeeCard
                        const displayName = (() => {
                          if (emp.first_name && emp.last_name) {
                            return `${emp.first_name} ${emp.last_name}`.trim();
                          }
                          if (emp.full_name && !emp.full_name.includes('@')) {
                            return emp.full_name;
                          }
                          return emp.email.split('@')[0].split('.').map(p => 
                            p.charAt(0).toUpperCase() + p.slice(1)
                          ).join(' ');
                        })();

                        return (
                          <CommandItem
                            key={emp.email}
                            onSelect={() => {
                              setSelectedEmployees(prev =>
                                prev.includes(emp.email)
                                  ? prev.filter(e => e !== emp.email)
                                  : [...prev, emp.email]
                              );
                            }}
                            className="text-slate-900 dark:text-white"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border-2 ${selectedEmployees.includes(emp.email) ? 'soft-blue-bg' : 'border-slate-400 dark:border-slate-600'}`} />
                              {displayName}
                            </div>
                          </CommandItem>
                        );
                      })}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1E3A8A]" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1E3A8A]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">Start Time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1E3A8A]" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">End Time</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1E3A8A]" />
            </div>
          </div>

          <div>
            <Label className="text-slate-700 font-semibold mb-2 block text-sm">Notes / Instructions</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional information..."
              className="bg-slate-50 border-slate-200 text-slate-900 h-20 text-sm focus:border-[#1E3A8A]"
            />
          </div>

          {/* Enhanced Color Picker - Compact Design */}
          <div className="space-y-2 p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <Label className="text-slate-900 dark:text-white font-semibold text-sm flex items-center gap-2">
              <div className={`w-5 h-5 rounded-lg ${
                customColor === 'blue' ? 'bg-blue-600' :
                customColor === 'green' ? 'bg-green-600' :
                customColor === 'purple' ? 'bg-purple-600' :
                customColor === 'cyan' ? 'bg-cyan-600' :
                customColor === 'pink' ? 'bg-pink-600' :
                customColor === 'red' ? 'bg-red-600' :
                customColor === 'orange' ? 'bg-orange-600' :
                customColor === 'amber' ? 'bg-amber-600' :
                customColor === 'yellow' ? 'bg-yellow-500' :
                customColor === 'lime' ? 'bg-lime-600' :
                customColor === 'emerald' ? 'bg-emerald-600' :
                customColor === 'teal' ? 'bg-teal-600' :
                customColor === 'sky' ? 'bg-sky-600' :
                customColor === 'indigo' ? 'bg-indigo-600' :
                customColor === 'violet' ? 'bg-violet-600' :
                customColor === 'fuchsia' ? 'bg-fuchsia-600' :
                customColor === 'rose' ? 'bg-rose-600' :
                customColor === 'slate' ? 'bg-slate-600' :
                customColor === 'gray' ? 'bg-gray-600' :
                customColor === 'zinc' ? 'bg-zinc-600' :
                customColor === 'stone' ? 'bg-stone-600' :
                customColor === 'brown' ? 'bg-amber-800' :
                customColor === 'darkbrown' ? 'bg-yellow-900' :
                customColor === 'black' ? 'bg-black' :
                'bg-slate-300 dark:bg-slate-600'
              } shadow-md transition-all`} />
              Shift Color
              {customColor && <span className="text-xs font-normal text-slate-600 dark:text-slate-400">({customColor})</span>}
            </Label>
            <div className="grid grid-cols-10 gap-1">
              {[
                { name: 'blue', bg: 'bg-blue-600', hover: 'hover:bg-blue-700' },
                { name: 'green', bg: 'bg-green-600', hover: 'hover:bg-green-700' },
                { name: 'purple', bg: 'bg-purple-600', hover: 'hover:bg-purple-700' },
                { name: 'cyan', bg: 'bg-cyan-600', hover: 'hover:bg-cyan-700' },
                { name: 'pink', bg: 'bg-pink-600', hover: 'hover:bg-pink-700' },
                { name: 'red', bg: 'bg-red-600', hover: 'hover:bg-red-700' },
                { name: 'orange', bg: 'bg-orange-600', hover: 'hover:bg-orange-700' },
                { name: 'amber', bg: 'bg-amber-600', hover: 'hover:bg-amber-700' },
                { name: 'yellow', bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
                { name: 'lime', bg: 'bg-lime-600', hover: 'hover:bg-lime-700' },
                { name: 'emerald', bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700' },
                { name: 'teal', bg: 'bg-teal-600', hover: 'hover:bg-teal-700' },
                { name: 'sky', bg: 'bg-sky-600', hover: 'hover:bg-sky-700' },
                { name: 'indigo', bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700' },
                { name: 'violet', bg: 'bg-violet-600', hover: 'hover:bg-violet-700' },
                { name: 'fuchsia', bg: 'bg-fuchsia-600', hover: 'hover:bg-fuchsia-700' },
                { name: 'rose', bg: 'bg-rose-600', hover: 'hover:bg-rose-700' },
                { name: 'slate', bg: 'bg-slate-600', hover: 'hover:bg-slate-700' },
                { name: 'gray', bg: 'bg-gray-600', hover: 'hover:bg-gray-700' },
                { name: 'zinc', bg: 'bg-zinc-600', hover: 'hover:bg-zinc-700' },
                { name: 'stone', bg: 'bg-stone-600', hover: 'hover:bg-stone-700' },
                { name: 'brown', bg: 'bg-amber-800', hover: 'hover:bg-amber-900' },
                { name: 'darkbrown', bg: 'bg-yellow-900', hover: 'hover:bg-yellow-950' },
                { name: 'black', bg: 'bg-black', hover: 'hover:bg-gray-900' }
              ].map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setCustomColor(color.name)}
                  className={cn(
                    "h-6 rounded transition-all shadow-sm active:scale-90",
                    color.bg,
                    color.hover,
                    customColor === color.name 
                      ? 'ring-1 ring-[#1E3A8A] ring-offset-1 scale-105' 
                      : 'hover:scale-105'
                  )}
                  title={color.name}
                >
                  {customColor === color.name && (
                    <Check className="w-3 h-3 text-white mx-auto drop-shadow-lg" />
                  )}
                </button>
              ))}
            </div>
            {customColor && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCustomColor('')}
                className="w-full text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Color
              </Button>
            )}
          </div>

          {/* Delete Options Modal */}
          {showDeleteOptions && shift && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 mb-3 font-semibold">
                ¿Qué deseas eliminar? / What do you want to delete?
              </p>
              <div className="flex flex-col gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleDeleteSingle}
                  disabled={isProcessing}
                  className="justify-start border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Solo este turno / Only this shift
                </Button>
                {shift.job_id && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleDeleteAllForProject}
                    disabled={isProcessing}
                    className="justify-start border-red-400 text-red-800 hover:bg-red-100 bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Todos los turnos de "{shift.job_name || 'este proyecto'}" / All shifts for this project
                  </Button>
                )}
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDeleteOptions(false)}
                  className="justify-start text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar / Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-3 pt-4 border-t border-slate-100">
            {shift && !showDeleteOptions ? (
              <Button 
                type="button" 
                variant="outline"
                onClick={handleDelete} 
                disabled={isProcessing}
                className="border-2 border-red-200 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                disabled={isProcessing} 
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  isProcessing || 
                  (isAppointment && !shiftTitle) || 
                  (isJobWork && (!jobId || selectedEmployees.length === 0))
                } 
                className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shadow-md font-semibold"
              >
                <Save className="w-4 h-4 mr-2" />
                {isProcessing ? 'Saving...' : 'Save Shift'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}