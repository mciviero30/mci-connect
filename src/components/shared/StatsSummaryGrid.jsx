import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function StatsSummaryGrid({ stats, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800">
            <CardContent className="p-6">
              <div className="h-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={idx} 
            className={`${stat.gradient || 'bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10'} border ${stat.borderColor || 'border-blue-200/40 dark:border-blue-700/30'} shadow-sm hover:shadow-md transition-shadow`}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">{stat.label}</p>
                {Icon && <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-700 dark:text-slate-300 opacity-30" />}
              </div>
              <p className={`text-2xl sm:text-3xl font-bold ${stat.valueColor || 'text-slate-900 dark:text-slate-100'}`}>
                {stat.value}
              </p>
              {stat.subtitle && (
                <p className="text-[10px] sm:text-xs mt-1 text-slate-600 dark:text-slate-400">
                  {stat.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}