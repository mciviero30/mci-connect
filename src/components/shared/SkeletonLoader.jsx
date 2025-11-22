import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const StatsCardSkeleton = () => (
  <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 animate-pulse">
    <CardContent className="p-6">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
    </CardContent>
  </Card>
);

export const WidgetSkeleton = () => (
  <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 animate-pulse">
    <CardHeader>
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
      </div>
    </CardContent>
  </Card>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="space-y-2">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg animate-pulse">
        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 animate-pulse">
    <CardHeader>
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-40"></div>
    </CardHeader>
    <CardContent>
      <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
    </CardContent>
  </Card>
);

export const GoalCardSkeleton = () => (
  <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 animate-pulse">
    <CardContent className="p-4 space-y-3">
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
      <div className="flex gap-2">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
      </div>
    </CardContent>
  </Card>
);