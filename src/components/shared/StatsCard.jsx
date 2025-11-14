import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function StatsCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend, 
  trendValue,
  color = 'blue',
  loading = false,
  className = ''
}) {
  // Updated color system with proper gradient support
  const isGradient = color.includes('from-');
  
  if (isGradient) {
    // For gradient colors passed directly
    return (
      <Card className={`bg-gradient-to-br ${color} shadow-lg border-0 hover:shadow-xl transition-all ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-white/90 mb-1">{title}</p>
              <p className="text-3xl font-bold text-white">{loading ? '...' : value}</p>
              {subtitle && (
                <p className="text-xs text-white/80 mt-1">{subtitle}</p>
              )}
              {(trend || trendValue) && (
                <div className="flex items-center gap-2 mt-2">
                  {trend && (
                    <span className={`text-xs font-medium ${trend === 'up' ? 'text-white/90' : 'text-white/70'}`}>
                      {trend === 'up' ? '↑' : '↓'}
                    </span>
                  )}
                  {trendValue && (
                    <span className="text-xs text-white/80">{trendValue}</span>
                  )}
                </div>
              )}
            </div>
            {Icon && (
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Icon className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Legacy named color support with better contrast
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      text: 'text-white',
      subtitle: 'text-white/90',
      icon: 'bg-white/20'
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      text: 'text-white',
      subtitle: 'text-white/90',
      icon: 'bg-white/20'
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600',
      text: 'text-white',
      subtitle: 'text-white/90',
      icon: 'bg-white/20'
    },
    amber: {
      gradient: 'from-amber-500 to-amber-600',
      text: 'text-white',
      subtitle: 'text-white/90',
      icon: 'bg-white/20'
    },
    red: {
      gradient: 'from-red-500 to-red-600',
      text: 'text-white',
      subtitle: 'text-white/90',
      icon: 'bg-white/20'
    },
    slate: {
      gradient: 'from-slate-600 to-slate-700',
      text: 'text-white',
      subtitle: 'text-white/90',
      icon: 'bg-white/20'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <Card className={`bg-gradient-to-br ${colors.gradient} shadow-lg border-0 hover:shadow-xl transition-all ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`text-sm font-semibold ${colors.subtitle} mb-1`}>{title}</p>
            <p className={`text-3xl font-bold ${colors.text}`}>{loading ? '...' : value}</p>
            {subtitle && (
              <p className={`text-xs ${colors.subtitle} mt-1`}>{subtitle}</p>
            )}
            {(trend || trendValue) && (
              <div className="flex items-center gap-2 mt-2">
                {trend && (
                  <span className={`text-xs font-medium ${trend === 'up' ? colors.text : colors.subtitle}`}>
                    {trend === 'up' ? '↑' : '↓'}
                  </span>
                )}
                {trendValue && (
                  <span className={`text-xs ${colors.subtitle}`}>{trendValue}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className={`p-3 ${colors.icon} rounded-2xl backdrop-blur-sm`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}