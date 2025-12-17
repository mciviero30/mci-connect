import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
  gradient
}) {
  // If gradient is provided directly as a CSS string, use it
  if (gradient) {
    return (
      <Card 
        className="overflow-hidden border-none shadow-lg relative group hover:scale-105 transition-transform duration-300"
        style={{ 
          background: gradient,
          boxShadow: 'none'
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-white/90 text-sm font-medium mb-2">
                {title}
              </p>
              <h3 className="text-3xl font-bold text-white mb-1">
                {value}
              </h3>
              {subtitle && (
                <p className="text-white/80 text-sm">
                  {subtitle}
                </p>
              )}
            </div>
            {Icon && (
              <div className="p-3 bg-white/20 rounded-2xl">
                <Icon className="w-6 h-6 text-white" />
              </div>
            )}
            </div>
          {trend && (
            <div className="flex items-center gap-1 mt-3">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-white/90" />
              ) : (
                <TrendingDown className="w-4 h-4 text-white/90" />
              )}
              <span className="text-sm text-white/90 font-medium">
                {Math.abs(trend)}% {trend > 0 ? 'increase' : 'decrease'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Color theme definitions with Tailwind classes for dual theme support
  const colorThemes = {
    blue: {
      gradient: "from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800",
      icon: "bg-blue-500/20 dark:bg-blue-400/20",
      iconColor: "text-blue-100 dark:text-blue-200"
    },
    green: {
      gradient: "from-green-600 to-green-700 dark:from-green-700 dark:to-green-800",
      icon: "bg-green-500/20 dark:bg-green-400/20",
      iconColor: "text-green-100 dark:text-green-200"
    },
    purple: {
      gradient: "from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800",
      icon: "bg-purple-500/20 dark:bg-purple-400/20",
      iconColor: "text-purple-100 dark:text-purple-200"
    },
    amber: {
      gradient: "from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800",
      icon: "bg-amber-500/20 dark:bg-amber-400/20",
      iconColor: "text-amber-100 dark:text-amber-200"
    },
    red: {
      gradient: "from-red-600 to-red-700 dark:from-red-700 dark:to-red-800",
      icon: "bg-red-500/20 dark:bg-red-400/20",
      iconColor: "text-red-100 dark:text-red-200"
    },
    slate: {
      gradient: "from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900",
      icon: "bg-slate-500/20 dark:bg-slate-400/20",
      iconColor: "text-slate-100 dark:text-slate-200"
    }
  };

  const theme = colorThemes[color] || colorThemes.blue;

  return (
    <Card className={`overflow-hidden border-none shadow-sm relative group hover:scale-105 transition-transform duration-300 bg-gradient-to-br ${theme.gradient}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-white/90 text-sm font-medium mb-2">
              {title}
            </p>
            <h3 className="text-3xl font-bold text-white mb-1">
              {value}
            </h3>
            {subtitle && (
              <p className="text-white/80 text-sm">
                {subtitle}
              </p>
            )}
          </div>
          {Icon && (
            <div className={`p-3 ${theme.icon} rounded-2xl`}>
              <Icon className={`w-6 h-6 ${theme.iconColor}`} />
            </div>
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3">
            {trend > 0 ? (
              <TrendingUp className="w-4 h-4 text-white/90" />
            ) : (
              <TrendingDown className="w-4 h-4 text-white/90" />
            )}
            <span className="text-sm text-white/90 font-medium">
              {Math.abs(trend)}% {trend > 0 ? 'increase' : 'decrease'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}