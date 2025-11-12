import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  color = 'blue',
  className = ''
}) {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      shadow: 'shadow-blue-500/20'
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      shadow: 'shadow-green-500/20'
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      shadow: 'shadow-purple-500/20'
    },
    amber: {
      gradient: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      shadow: 'shadow-amber-500/20'
    },
    red: {
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      shadow: 'shadow-red-500/20'
    },
    slate: {
      gradient: 'from-slate-600 to-slate-700',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      shadow: 'shadow-slate-500/20'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <Card className={`bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300 hover:shadow-xl ${colors.shadow} ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {(trend || trendValue) && (
              <div className="flex items-center gap-2 mt-2">
                {trend && (
                  <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {trend === 'up' ? '↑' : '↓'}
                  </span>
                )}
                {trendValue && (
                  <span className="text-xs text-slate-400">{trendValue}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className={`p-3 bg-gradient-to-br ${colors.gradient} rounded-2xl shadow-lg ${colors.shadow}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}