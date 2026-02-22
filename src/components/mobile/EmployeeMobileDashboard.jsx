import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, MapPin, Receipt, Car, Banknote, 
  CheckCircle2, AlertCircle, PlayCircle, 
  StopCircle, ChevronRight, Calendar,
  Bell, FileText, Zap
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { motion } from 'framer-motion';

export default function EmployeeMobileDashboard({ user }) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Today's active time entry (clocked in)
  const { data: todayEntries = [] } = useQuery({
    queryKey: ['todayTimeEntries', user?.email, todayStr],
    queryFn: () => base44.entities.TimeEntry.filter({ employee_email: user.email, date: todayStr }, '-check_in'),
    enabled: !!user?.email,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Today's job assignments
  const { data: todayAssignments = [] } = useQuery({
    queryKey: ['todayAssignments', user?.email, todayStr],
    queryFn: () => base44.entities.JobAssignment.filter({ employee_email: user.email, date: todayStr }),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  // Pending expenses count
  const { data: pendingExpenses = [] } = useQuery({
    queryKey: ['pendingExpensesMobile', user?.email],
    queryFn: () => base44.entities.Expense.filter({ employee_email: user.email, status: 'pending' }),
    enabled: !!user?.email,
    staleTime: 120000,
  });

  // Week hours
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data: weekEntries = [] } = useQuery({
    queryKey: ['weekEntriesMobile', user?.email, weekStart],
    queryFn: async () => {
      const entries = await base44.entities.TimeEntry.filter({ employee_email: user.email, status: 'approved' }, '-date', 50);
      return entries.filter(e => e.date >= weekStart && e.date <= weekEnd);
    },
    enabled: !!user?.email,
    staleTime: 120000,
  });

  const isClockedIn = todayEntries.some(e => e.check_in && !e.check_out);
  const activeEntry = todayEntries.find(e => e.check_in && !e.check_out);
  const todayHours = todayEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const weekHours = weekEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const todayJob = todayAssignments[0];

  // Calculate time since clock-in
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!activeEntry?.check_in) return;
    const update = () => {
      const [h, m, s] = activeEntry.check_in.split(':').map(Number);
      const checkInDate = new Date();
      checkInDate.setHours(h, m, s || 0);
      const diffMs = Date.now() - checkInDate.getTime();
      if (diffMs < 0) return;
      const diffH = Math.floor(diffMs / 3600000);
      const diffM = Math.floor((diffMs % 3600000) / 60000);
      setElapsed(`${diffH}h ${diffM}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [activeEntry?.check_in]);

  const quickActions = [
    { title: 'Clock In/Out', icon: Clock, url: createPageUrl('TimeTracking'), color: 'from-blue-500 to-blue-600', active: isClockedIn },
    { title: 'My Expenses', icon: Receipt, url: createPageUrl('MisGastos'), color: 'from-amber-500 to-orange-500', badge: pendingExpenses.length || null },
    { title: 'Mileage', icon: Car, url: createPageUrl('Manejo'), color: 'from-green-500 to-emerald-600' },
    { title: 'My Payroll', icon: Banknote, url: createPageUrl('MyPayroll'), color: 'from-purple-500 to-purple-600' },
    { title: 'Field', icon: MapPin, url: createPageUrl('Field'), color: 'from-teal-500 to-cyan-600' },
    { title: 'Schedule', icon: Calendar, url: createPageUrl('Calendario'), color: 'from-indigo-500 to-indigo-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Clock Status Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Link to={createPageUrl('TimeTracking')}>
          <Card className={`p-4 border-2 cursor-pointer transition-all active:scale-[0.98] touch-manipulation ${
            isClockedIn 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 dark:from-green-900/30 dark:to-emerald-900/30 dark:border-green-600' 
              : 'bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200 dark:from-slate-800 dark:to-slate-700 dark:border-slate-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                  isClockedIn ? 'bg-green-500' : 'bg-slate-400 dark:bg-slate-600'
                }`}>
                  {isClockedIn 
                    ? <StopCircle className="w-6 h-6 text-white" /> 
                    : <PlayCircle className="w-6 h-6 text-white" />
                  }
                </div>
                <div>
                  <p className={`font-bold text-base ${isClockedIn ? 'text-green-800 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {isClockedIn ? '● Clocked In' : 'Not Clocked In'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isClockedIn 
                      ? `${elapsed} elapsed • ${activeEntry?.job_name || 'No job assigned'}`
                      : `Today: ${todayHours.toFixed(1)}h • Week: ${weekHours.toFixed(1)}h`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isClockedIn && (
                  <Badge className="bg-green-500 text-white text-xs animate-pulse">LIVE</Badge>
                )}
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Today's Job Assignment */}
      {todayJob && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <Link to={createPageUrl(`JobDetails?id=${todayJob.job_id}`)}>
            <Card className="p-4 border-2 border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 cursor-pointer active:scale-[0.98] touch-manipulation">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Today's Job</p>
                  <p className="font-bold text-slate-900 dark:text-white truncate">{todayJob.job_name}</p>
                  {todayJob.start_time && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{todayJob.start_time} – {todayJob.end_time || 'TBD'}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </div>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* Pending Alerts */}
      {pendingExpenses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Link to={createPageUrl('MisGastos')}>
            <Card className="p-3 border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 cursor-pointer active:scale-[0.98] touch-manipulation">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex-1">
                  {pendingExpenses.length} expense{pendingExpenses.length > 1 ? 's' : ''} pending approval
                </p>
                <ChevronRight className="w-4 h-4 text-amber-500" />
              </div>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* Quick Action Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Quick Access
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          {quickActions.map((action, idx) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.15 + idx * 0.04 }}
            >
              <Link to={action.url}>
                <div className={`relative bg-gradient-to-br ${action.color} rounded-2xl p-3.5 flex flex-col items-center gap-2 shadow-md active:scale-95 transition-transform touch-manipulation min-h-[80px] justify-center`}>
                  {action.badge ? (
                    <span className="absolute top-2 right-2 bg-white text-red-600 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
                      {action.badge}
                    </span>
                  ) : null}
                  {action.active && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-300 rounded-full animate-pulse" />
                  )}
                  <action.icon className="w-6 h-6 text-white" />
                  <span className="text-white text-[11px] font-semibold text-center leading-tight">{action.title}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Week Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.35 }}>
        <Card className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">This Week</h3>
            <Link to={createPageUrl('MisHoras')}>
              <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">View all →</span>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{weekHours.toFixed(1)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Hours</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{todayHours.toFixed(1)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Today</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{weekEntries.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Entries</p>
            </div>
          </div>
          {/* Progress bar toward 40h */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Weekly progress</span>
              <span>{Math.min(Math.round((weekHours / 40) * 100), 100)}% of 40h</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((weekHours / 40) * 100, 100)}%` }}
              />
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}