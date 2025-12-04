import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays, parseISO, isWithinInterval } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, Plus, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const REASON_LABELS = {
  vacation: { label: 'Vacation', color: 'blue' },
  sick: { label: 'Sick Leave', color: 'red' },
  personal: { label: 'Personal', color: 'purple' },
  holiday: { label: 'Holiday', color: 'green' },
  other: { label: 'Other', color: 'slate' },
};

export default function EmployeeAvailabilityManager({ 
  open, 
  onOpenChange, 
  employee, 
  isAdmin = false 
}) {
  const [activeTab, setActiveTab] = useState('weekly');
  const [newTimeOff, setNewTimeOff] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    reason: 'personal',
    notes: ''
  });
  
  const queryClient = useQueryClient();

  // Fetch weekly availability
  const { data: availability = [] } = useQuery({
    queryKey: ['employee-availability', employee?.email],
    queryFn: () => base44.entities.EmployeeAvailability.filter({ 
      employee_email: employee?.email 
    }),
    enabled: !!employee?.email && open,
  });

  // Fetch time off requests
  const { data: timeOffs = [] } = useQuery({
    queryKey: ['employee-timeoff', employee?.email],
    queryFn: () => base44.entities.EmployeeTimeOff.filter({ 
      employee_email: employee?.email 
    }, '-start_date'),
    enabled: !!employee?.email && open,
  });

  // Mutations
  const saveAvailabilityMutation = useMutation({
    mutationFn: async (data) => {
      const existing = availability.find(a => a.day_of_week === data.day_of_week);
      if (existing) {
        return base44.entities.EmployeeAvailability.update(existing.id, data);
      } else {
        return base44.entities.EmployeeAvailability.create({
          ...data,
          employee_email: employee.email,
          employee_name: employee.full_name,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-availability'] });
      toast.success('Availability updated');
    },
  });

  const createTimeOffMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeTimeOff.create({
      ...data,
      employee_email: employee.email,
      employee_name: employee.full_name,
      status: isAdmin ? 'approved' : 'pending',
      admin_override: isAdmin,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-timeoff'] });
      setNewTimeOff({
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        reason: 'personal',
        notes: ''
      });
      toast.success('Time off added');
    },
  });

  const updateTimeOffMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmployeeTimeOff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-timeoff'] });
      toast.success('Time off updated');
    },
  });

  const deleteTimeOffMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeTimeOff.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-timeoff'] });
      toast.success('Time off deleted');
    },
  });

  const getAvailabilityForDay = (dayOfWeek) => {
    return availability.find(a => a.day_of_week === dayOfWeek) || {
      day_of_week: dayOfWeek,
      is_available: true,
      start_time: '08:00',
      end_time: '17:00',
    };
  };

  const handleDayToggle = (dayOfWeek, isAvailable) => {
    const current = getAvailabilityForDay(dayOfWeek);
    saveAvailabilityMutation.mutate({
      ...current,
      day_of_week: dayOfWeek,
      is_available: isAvailable,
    });
  };

  const handleTimeChange = (dayOfWeek, field, value) => {
    const current = getAvailabilityForDay(dayOfWeek);
    saveAvailabilityMutation.mutate({
      ...current,
      day_of_week: dayOfWeek,
      [field]: value,
    });
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <User className="w-5 h-5 text-blue-500" />
            {employee.full_name} - Availability
            {isAdmin && <Badge className="bg-purple-500 text-white">Admin Mode</Badge>}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="weekly" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              <Clock className="w-4 h-4 mr-2" />
              Weekly Hours
            </TabsTrigger>
            <TabsTrigger value="timeoff" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              <Calendar className="w-4 h-4 mr-2" />
              Time Off
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4">
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => {
                const dayAvail = getAvailabilityForDay(day.value);
                const isWeekend = day.value === 0 || day.value === 6;
                
                return (
                  <Card 
                    key={day.value} 
                    className={`p-4 ${isWeekend ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800'} border-slate-200 dark:border-slate-700`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-24">
                          <p className="font-medium text-slate-900 dark:text-white">{day.label}</p>
                        </div>
                        <Switch
                          checked={dayAvail.is_available}
                          onCheckedChange={(checked) => handleDayToggle(day.value, checked)}
                        />
                        <span className={`text-sm ${dayAvail.is_available ? 'text-green-600' : 'text-slate-400'}`}>
                          {dayAvail.is_available ? 'Available' : 'Not Available'}
                        </span>
                      </div>
                      
                      {dayAvail.is_available && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={dayAvail.start_time}
                            onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                            className="w-28 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600"
                          />
                          <span className="text-slate-400">to</span>
                          <Input
                            type="time"
                            value={dayAvail.end_time}
                            onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                            className="w-28 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="timeoff" className="mt-4 space-y-4">
            {/* Add New Time Off */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Request Time Off
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600 dark:text-slate-300">Start Date</Label>
                  <Input
                    type="date"
                    value={newTimeOff.start_date}
                    onChange={(e) => setNewTimeOff({...newTimeOff, start_date: e.target.value})}
                    className="mt-1 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 dark:text-slate-300">End Date</Label>
                  <Input
                    type="date"
                    value={newTimeOff.end_date}
                    onChange={(e) => setNewTimeOff({...newTimeOff, end_date: e.target.value})}
                    className="mt-1 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 dark:text-slate-300">Reason</Label>
                  <Select value={newTimeOff.reason} onValueChange={(v) => setNewTimeOff({...newTimeOff, reason: v})}>
                    <SelectTrigger className="mt-1 bg-white dark:bg-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REASON_LABELS).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-600 dark:text-slate-300">Notes</Label>
                  <Input
                    value={newTimeOff.notes}
                    onChange={(e) => setNewTimeOff({...newTimeOff, notes: e.target.value})}
                    placeholder="Optional notes..."
                    className="mt-1 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <Button 
                onClick={() => createTimeOffMutation.mutate(newTimeOff)}
                disabled={createTimeOffMutation.isPending}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isAdmin ? 'Add Time Off' : 'Submit Request'}
              </Button>
            </Card>

            {/* Time Off List */}
            <div className="space-y-2">
              <h4 className="font-medium text-slate-900 dark:text-white">Scheduled Time Off</h4>
              {timeOffs.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No time off scheduled</p>
              ) : (
                timeOffs.map((timeOff) => {
                  const reason = REASON_LABELS[timeOff.reason] || REASON_LABELS.other;
                  const isPast = new Date(timeOff.end_date) < new Date();
                  
                  return (
                    <Card 
                      key={timeOff.id} 
                      className={`p-4 ${isPast ? 'opacity-50' : ''} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`bg-${reason.color}-100 text-${reason.color}-700 dark:bg-${reason.color}-900/30 dark:text-${reason.color}-300`}>
                            {reason.label}
                          </Badge>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {format(parseISO(timeOff.start_date), 'MMM d')} - {format(parseISO(timeOff.end_date), 'MMM d, yyyy')}
                            </p>
                            {timeOff.notes && (
                              <p className="text-sm text-slate-500">{timeOff.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {timeOff.status === 'pending' && (
                            <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                          )}
                          {timeOff.status === 'approved' && (
                            <Badge className="bg-green-100 text-green-700">Approved</Badge>
                          )}
                          {timeOff.status === 'rejected' && (
                            <Badge className="bg-red-100 text-red-700">Rejected</Badge>
                          )}
                          
                          {isAdmin && timeOff.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateTimeOffMutation.mutate({ id: timeOff.id, data: { status: 'approved' }})}
                                className="text-green-600 hover:bg-green-50"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateTimeOffMutation.mutate({ id: timeOff.id, data: { status: 'rejected' }})}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          
                          {(isAdmin || timeOff.status === 'pending') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteTimeOffMutation.mutate(timeOff.id)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Utility function to check if employee is available
export function checkEmployeeAvailability(availability, timeOffs, date, startTime, endTime) {
  const dayOfWeek = date.getDay();
  const dayAvail = availability.find(a => a.day_of_week === dayOfWeek);
  
  // Check weekly availability
  if (dayAvail && !dayAvail.is_available) {
    return { available: false, reason: 'Not available on this day' };
  }
  
  if (dayAvail && startTime && endTime) {
    if (startTime < dayAvail.start_time || endTime > dayAvail.end_time) {
      return { 
        available: false, 
        reason: `Only available ${dayAvail.start_time} - ${dayAvail.end_time}` 
      };
    }
  }
  
  // Check time off
  const approvedTimeOffs = timeOffs.filter(t => t.status === 'approved');
  for (const timeOff of approvedTimeOffs) {
    const start = parseISO(timeOff.start_date);
    const end = parseISO(timeOff.end_date);
    if (isWithinInterval(date, { start, end })) {
      return { 
        available: false, 
        reason: `On ${REASON_LABELS[timeOff.reason]?.label || 'time off'}` 
      };
    }
  }
  
  return { available: true };
}