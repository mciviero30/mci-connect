/**
 * Centralized Dashboard data fetching hooks
 * Reduces code duplication and improves maintainability
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { startOfWeek, endOfWeek, startOfYear } from 'date-fns';

export const useMyTimeEntries = (userEmail, enabled = true) => {
  return useQuery({
    queryKey: ['myTimeEntries', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.TimeEntry.filter(
        { employee_email: userEmail, status: 'approved' },
        '-date',
        100
      );
    },
    enabled: !!userEmail && enabled,
    staleTime: 600000,
    gcTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });
};

export const useMyExpenses = (userEmail, isAdmin, enabled = true) => {
  return useQuery({
    queryKey: ['myExpenses', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      if (isAdmin) {
        return base44.entities.Expense.list('-date', 200);
      }
      return base44.entities.Expense.filter(
        { employee_email: userEmail },
        '-date',
        50
      );
    },
    enabled: !!userEmail && enabled,
    staleTime: 600000,
    gcTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });
};

export const useMyDrivingLogs = (userEmail, enabled = true) => {
  return useQuery({
    queryKey: ['myDrivingLogs', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.DrivingLog.filter(
        { employee_email: userEmail, status: 'approved' },
        '-date',
        50
      );
    },
    enabled: !!userEmail && enabled,
    staleTime: 600000,
    gcTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });
};

export const useActiveJobs = (user, isAdmin, enabled = true) => {
  return useQuery({
    queryKey: ['activeJobs'],
    queryFn: async () => {
      const allJobs = await base44.entities.Job.filter({ status: 'active' }, 'name');
      if (isAdmin) return allJobs;
      return allJobs.filter(j => {
        const assigned = (j.assigned_team_field || []).includes(user?.email) || 
                        j.team_id === user?.team_id;
        return assigned;
      });
    },
    enabled: !!user && enabled,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    initialData: [],
  });
};

export const useWeeklyPayCalculations = (timeEntries, drivingLogs, hourlyRate = 25) => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const yearStart = startOfYear(today);

  let currentWeekHours = 0;
  let currentWeekPay = 0;
  let yearHours = 0;
  let drivingHoursThisWeek = 0;
  let drivingPayThisWeek = 0;

  if (timeEntries && timeEntries.length > 0) {
    const weekEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    currentWeekHours = weekEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
    const normalHours = Math.min(currentWeekHours, 40);
    const overtimeHours = Math.max(0, currentWeekHours - 40);
    currentWeekPay = (normalHours * hourlyRate) + (overtimeHours * hourlyRate * 1.5);

    const yearEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= yearStart;
    });
    yearHours = yearEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);

    if (drivingLogs && drivingLogs.length > 0) {
      const weekDriving = drivingLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= weekStart && logDate <= weekEnd;
      });
      drivingHoursThisWeek = weekDriving.reduce((sum, log) => sum + (log.hours || 0), 0);
      drivingPayThisWeek = weekDriving.reduce((sum, log) => sum + ((log.hours || 0) * hourlyRate), 0);
    }
  }

  const weekProgress = (currentWeekHours / 40) * 100;

  return {
    currentWeekHours,
    currentWeekPay,
    yearHours,
    drivingHoursThisWeek,
    drivingPayThisWeek,
    weekProgress
  };
};