import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Modern employee page layout with hero header
 * Used for consistent styling across MCI Connect Employees pages
 */
export default function EmployeePageLayout({ 
  children, 
  title, 
  subtitle, 
  headerActions,
  stats,
  className = ""
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#181818]">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-900 dark:via-blue-800 dark:to-indigo-900">
        <div className="max-w-6xl mx-auto px-4 pt-8 pb-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-blue-200 text-sm mt-1">{subtitle}</p>}
            </div>
            {headerActions && (
              <div className="flex items-center gap-2">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area - overlaps header */}
      <div className={`max-w-6xl mx-auto px-4 -mt-12 pb-8 ${className}`}>
        {/* Stats Cards */}
        {stats && stats.length > 0 && (
          <div className={`grid grid-cols-2 md:grid-cols-${Math.min(stats.length, 4)} gap-4 mb-6`}>
            {stats.map((stat, index) => (
              <Card key={index} className="bg-white dark:bg-[#282828] shadow-lg border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {stat.icon && (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg || 'bg-blue-100 dark:bg-blue-900/50'}`}>
                        <stat.icon className={`w-5 h-5 ${stat.iconColor || 'text-blue-600 dark:text-blue-400'}`} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{stat.label}</p>
                    </div>
                  </div>
                  {stat.subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{stat.subtitle}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Content */}
        {children}
      </div>
    </div>
  );
}

/**
 * Modern card component for employee pages
 */
export function ModernCard({ children, title, icon: Icon, headerAction, className = "", noPadding = false }) {
  return (
    <Card className={`bg-white dark:bg-[#282828] shadow-sm border-slate-200 dark:border-slate-700 ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          </div>
          {headerAction}
        </div>
      )}
      <CardContent className={noPadding ? "p-0" : "p-4"}>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Modern stat display component
 */
export function StatDisplay({ value, label, icon: Icon, color = "blue" }) {
  const colorClasses = {
    blue: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400",
    purple: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
    amber: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
    red: "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400",
  };

  return (
    <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50">
      {Icon && (
        <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}