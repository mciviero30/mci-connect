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

export default function AssignmentDialog({ 
  open, 
  onOpenChange, 
  shift, 
  employees, 
  jobs, 
  onSubmit, 
  onDelete, 
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

  useEffect(() => {
    if (shift) {
      setSelectedEmployees(shift.employee_email ? [shift.employee_email] : []);
      setJobId(shift.job_id || '');
      setShiftTitle(shift.shift_title || '');
      setStartDate(shift.date || format(new Date(), 'yyyy-MM-dd'));
      setEndDate(shift.date || format(new Date(), 'yyyy-MM-dd'));
      setStartTime(shift.start_time || '07:00');
      setEndTime(shift.end_time || '15:00');
      setNotes(shift.notes || '');
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
      const shiftData = {
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
        status: shift.status || 'scheduled'
      };
      
      onSubmit(shiftData);
      return;
    }

    const shiftsToCreate = [];
    let currentDate = parseISO(startDate);
    const finalDate = parseISO(endDate);

    while (currentDate <= finalDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      if (isAppointment) {
        shiftsToCreate.push({
          employee_email: selectedEmployees[0] || '',
          employee_name: (employees || []).find(e => e.email === selectedEmployees[0])?.full_name || '',
          job_id: jobId || '',
          job_name: selectedJob?.name || '',
          shift_title: shiftTitle,
          shift_type: shiftType,
          date: dateStr,
          start_time: startTime,
          end_time: endTime,
          notes: notes,
          color: selectedJob?.color || '',
          status: 'scheduled'
        });
      } else {
        for (const email of selectedEmployees) {
          const employee = (employees || []).find(e => e.email === email);
          shiftsToCreate.push({
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
            status: 'scheduled'
          });
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }

    for (const shiftData of shiftsToCreate) {
      await onSubmit(shiftData);
    }
    
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (shift && window.confirm('Are you sure you want to delete this shift?')) {
      onDelete(shift.id);
    }
  };

  const selectedJob = (jobs || []).find(j => j.id === jobId);
  const shiftType = shift?.shift_type || selectedEventType || 'appointment';
  const isAppointment = shiftType === 'appointment';
  const isJobWork = shiftType === 'job_work';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              {isAppointment && <CalendarIcon className="w-6 h-6 text-[#3B9FF3]" />}
              {isJobWork && <Briefcase className="w-6 h-6 text-purple-500" />}
              {shift 
                ? (isAppointment ? 'Edit Appointment' : 'Edit Job Shift')
                : (isAppointment ? 'New Appointment' : 'New Job Shift')}
            </DialogTitle>
            {shift && (
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
          {isAppointment && (
            <div>
              <Label className="text-white mb-2 block">Event Title *</Label>
              <Input
                value={shiftTitle}
                onChange={(e) => setShiftTitle(e.target.value)}
                placeholder="e.g., Team Meeting, Client Call, Site Visit"
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>
          )}

          {isJobWork && (
            <div>
              <Label className="text-white mb-2 block">Job / Project *</Label>
              <Select value={jobId} onValueChange={setJobId} required>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {(jobs || []).map(job => (
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

          {isAppointment && (
            <div>
              <Label className="text-white mb-2 block">Related Job (Optional)</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Link to a job (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value={null} className="text-white">None</SelectItem>
                  {(jobs || []).map(job => (
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

          {isJobWork && (
            <div>
              <Label className="text-white mb-2 block">Shift Title (Optional)</Label>
              <Input
                value={shiftTitle}
                onChange={(e) => setShiftTitle(e.target.value)}
                placeholder="e.g., Morning Installation, Material Setup"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          )}

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

          <div>
            <Label className="text-white mb-2 block flex items-center gap-2">
              <Users className="w-4 h-4" />
              Employees {isJobWork && '*'}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-700 text-white h-auto min-h-10">
                  {selectedEmployees.length === 0 ? (
                    "Select employees..."
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedEmployees.map(email => {
                        const emp = (employees || []).find(e => e.email === email);
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
                    {(employees || []).filter(e => e.employment_status === 'active').map(emp => (
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

          <div>
            <Label className="text-white mb-2 block">Notes / Instructions</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional information..."
              className="bg-slate-800 border-slate-700 text-white h-24"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing} className="bg-slate-800 border-slate-700 text-white">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                isProcessing || 
                (isAppointment && !shiftTitle) || 
                (isJobWork && (!jobId || selectedEmployees.length === 0))
              } 
              className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isProcessing ? 'Saving...' : 'Save Shift'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}