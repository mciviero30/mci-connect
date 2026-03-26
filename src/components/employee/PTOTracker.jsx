import React from 'react';
import { formatDate } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, Umbrella, Heart, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PTOTracker({ user }) {
  const currentYear = new Date().getFullYear();

  const { data: balance, isLoading } = useQuery({
    queryKey: ['timeOffBalance', user?.email, currentYear],
    queryFn: async () => {
      if (!user?.email) return null;
      const balances = await base44.entities.TimeOffBalance.filter({
        employee_email: user.email,
        year: currentYear
      });
      return balances[0] || null;
    },
    enabled: !!user?.email,
  });

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg">PTO Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!balance) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            PTO Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No PTO data available for {currentYear}. Contact HR to set up your balance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalDaysOff = balance.vacation_balance + balance.sick_balance + balance.personal_balance;
  const totalAccrued = balance.vacation_accrued + balance.sick_accrued + balance.personal_accrued;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Time Off Balance {currentYear}
          </CardTitle>
          <Badge className="bg-blue-600 text-white">
            {totalDaysOff.toFixed(1)} days available
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vacation */}
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Umbrella className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-slate-900 dark:text-white">Vacation</span>
            </div>
            <span className="text-lg font-bold text-green-600">
              {balance.vacation_balance.toFixed(1)}
            </span>
          </div>
          <Progress 
            value={(balance.vacation_balance / balance.vacation_accrued) * 100} 
            className="h-2 bg-slate-200 dark:bg-slate-700"
          />
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-2">
            <span>Accrued: {balance.vacation_accrued.toFixed(1)}</span>
            <span>Used: {balance.vacation_used.toFixed(1)}</span>
          </div>
        </div>

        {/* Sick Days */}
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-600" />
              <span className="font-semibold text-slate-900 dark:text-white">Sick Days</span>
            </div>
            <span className="text-lg font-bold text-red-600">
              {balance.sick_balance.toFixed(1)}
            </span>
          </div>
          <Progress 
            value={(balance.sick_balance / (balance.sick_accrued || 1)) * 100} 
            className="h-2 bg-slate-200 dark:bg-slate-700"
          />
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-2">
            <span>Accrued: {balance.sick_accrued.toFixed(1)}</span>
            <span>Used: {balance.sick_used.toFixed(1)}</span>
          </div>
        </div>

        {/* Personal Days */}
        {balance.personal_accrued > 0 && (
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-slate-900 dark:text-white">Personal Days</span>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {balance.personal_balance.toFixed(1)}
              </span>
            </div>
            <Progress 
              value={(balance.personal_balance / balance.personal_accrued) * 100} 
              className="h-2 bg-slate-200 dark:bg-slate-700"
            />
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-2">
              <span>Accrued: {balance.personal_accrued.toFixed(1)}</span>
              <span>Used: {balance.personal_used.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Accrual Info */}
        <div className="text-xs text-slate-600 dark:text-slate-400 bg-white/40 dark:bg-slate-800/40 rounded-lg p-3">
          <p className="font-semibold mb-1">Accrual Rate:</p>
          <p>{balance.accrual_rate_per_month} days per month ({balance.accrual_rate_per_month * 12} days/year)</p>
          {balance.last_accrual_date && (
            <p className="mt-1 text-[10px]">Last accrued: {formatDate(balance.last_accrual_date)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}