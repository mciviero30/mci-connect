import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, Save, X, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, differenceInHours, parseISO } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TimeOffRequestDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  
  const [formData, setFormData] = useState({
    time_off_type: 'unpaid',
    time_scope: 'full_day',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

  const [validationError, setValidationError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeOffRequest.create({
      ...data,
      employee_email: user.email,
      employee_name: user.full_name,
      team_id: user.team_id || '',
      team_name: user.team_name || '',
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
      onOpenChange(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      time_off_type: 'unpaid',
      time_scope: 'full_day',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      reason: ''
    });
    setValidationError('');
  };

  // Calculate days or hours
  const calculateDuration = () => {
    if (!formData.start_date || !formData.end_date) return { days: 0, hours: 0 };

    if (formData.time_scope === 'full_day') {
      const days = differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1;
      return { days, hours: 0 };
    } else {
      // Partial day
      if (!formData.start_time || !formData.end_time) return { days: 0, hours: 0 };

      const startDateTime = parseISO(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = parseISO(`${formData.end_date}T${formData.end_time}`);
      const hours = differenceInHours(endDateTime, startDateTime);
      
      return { days: 0, hours: Math.max(0, hours) };
    }
  };

  const { days, hours } = calculateDuration();

  // Get current balance
  const getBalance = () => {
    if (!user) return null;

    switch (formData.time_off_type) {
      case 'vacation':
        return user.vacation_days_balance || 0;
      case 'sick':
        return user.sick_days_balance || 0;
      case 'personal':
        return user.personal_days_balance || 0;
      default:
        return null; // Unpaid doesn't have balance
    }
  };

  const balance = getBalance();

  // Validate balance in real-time
  useEffect(() => {
    if (balance === null) {
      setValidationError('');
      return;
    }

    const requestedDays = formData.time_scope === 'full_day' ? days : hours / 8; // Convert hours to days

    if (requestedDays > balance) {
      setValidationError(`⚠️ Insufficient balance! You have ${balance} days remaining, but requesting ${requestedDays.toFixed(1)} days.`);
    } else {
      setValidationError('');
    }
  }, [formData, days, hours, balance]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Final validation
    if (validationError) {
      alert('Please correct the balance issue before submitting.');
      return;
    }

    const duration = calculateDuration();

    createMutation.mutate({
      ...formData,
      total_days: duration.days,
      total_hours: duration.hours,
      days_remaining_at_request: balance
    });
  };

  const isSubmitDisabled = createMutation.isPending || !!validationError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <CalendarClock className="w-5 h-5 text-purple-600" />
            Request Time-Off
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Time-Off Type */}
            <div className="space-y-2">
              <Label className="text-slate-900">Time-Off Type *</Label>
              <Select 
                value={formData.time_off_type} 
                onValueChange={(value) => setFormData({ ...formData, time_off_type: value })}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal Day</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              {balance !== null && (
                <p className="text-xs text-slate-600">
                  Available: <strong className="text-[#3B9FF3]">{balance} days</strong>
                </p>
              )}
            </div>

            {/* NEW: Time Scope */}
            <div className="space-y-2">
              <Label className="text-slate-900">Time Scope *</Label>
              <Select 
                value={formData.time_scope} 
                onValueChange={(value) => setFormData({ ...formData, time_scope: value })}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="full_day">Full Day</SelectItem>
                  <SelectItem value="partial_day">Partial Day (Hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-900">Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="bg-white border-slate-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-900">End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.start_date}
                  className="bg-white border-slate-300"
                  required
                />
              </div>
            </div>

            {/* NEW: Time Range (only for partial days) */}
            {formData.time_scope === 'partial_day' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900">Start Time *</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="bg-white border-slate-300"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900">End Time *</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="bg-white border-slate-300"
                    required
                  />
                </div>
              </div>
            )}

            {/* Duration Display */}
            {(days > 0 || hours > 0) && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">
                  {formData.time_scope === 'full_day' 
                    ? `Total: ${days} day${days > 1 ? 's' : ''}`
                    : `Total: ${hours} hour${hours !== 1 ? 's' : ''} (${(hours / 8).toFixed(1)} days)`
                  }
                </p>
              </div>
            )}

            {/* NEW: Real-time Validation Alert */}
            {validationError && (
              <Alert className="bg-red-50 border-red-300">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Insufficient Balance</AlertTitle>
                <AlertDescription className="text-red-700">
                  {validationError}
                </AlertDescription>
              </Alert>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-slate-900">Reason *</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Family emergency, Medical appointment, Personal matters..."
                className="h-24 bg-white border-slate-300 text-slate-900"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={createMutation.isPending}
              className="bg-white border-slate-300 text-slate-700"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className={`${validationError ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}