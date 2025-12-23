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

  // Color theme definitions - ALL using soft blue gradient from logo
  const colorThemes = {
    blue: {
      gradient: "from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10",
      border: "border border-blue-200/40 dark:border-blue-700/30",
      text: "text-slate-900 dark:text-slate-100",
      icon: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]",
      iconColor: "text-white"
    },
    green: {
      gradient: "from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10",
      border: "border border-blue-200/40 dark:border-blue-700/30",
      text: "text-slate-900 dark:text-slate-100",
      icon: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]",
      iconColor: "text-white"
    },
    purple: {
      gradient: "from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10",
      border: "border border-blue-200/40 dark:border-blue-700/30",
      text: "text-slate-900 dark:text-slate-100",
      icon: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]",
      iconColor: "text-white"
    },
    amber: {
      gradient: "from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10",
      border: "border border-blue-200/40 dark:border-blue-700/30",
      text: "text-slate-900 dark:text-slate-100",
      icon: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]",
      iconColor: "text-white"
    },
    red: {
      gradient: "from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10",
      border: "border border-blue-200/40 dark:border-blue-700/30",
      text: "text-slate-900 dark:text-slate-100",
      icon: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]",
      iconColor: "text-white"
    },
    slate: {
      gradient: "from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10",
      border: "border border-blue-200/40 dark:border-blue-700/30",
      text: "text-slate-900 dark:text-slate-100",
      icon: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]",
      iconColor: "text-white"
    }
  };

  const theme = colorThemes[color] || colorThemes.blue;

  return (
    <Card className={`overflow-hidden shadow-sm relative group hover:shadow-md transition-all duration-300 bg-gradient-to-br ${theme.gradient} ${theme.border}`}>
      <CardContent className="p-4 sm:p-5 md:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${theme.text} opacity-80`}>
              {title}
            </p>
            <h3 className={`text-2xl sm:text-3xl font-bold mb-0.5 sm:mb-1 ${theme.text}`}>
              {value}
            </h3>
            {subtitle && (
              <p className={`text-xs sm:text-sm ${theme.text} opacity-70`}>
                {subtitle}
              </p>
            )}
          </div>
          {Icon && (
            <div className={`p-2 sm:p-2.5 md:p-3 ${theme.icon} rounded-xl sm:rounded-2xl shadow-md flex-shrink-0`}>
              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.iconColor}`} />
            </div>
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3">
            {trend > 0 ? (
              <TrendingUp className={`w-4 h-4 ${theme.text}`} />
            ) : (
              <TrendingDown className={`w-4 h-4 ${theme.text}`} />
            )}
            <span className={`text-sm font-medium ${theme.text}`}>
              {Math.abs(trend)}% {trend > 0 ? 'increase' : 'decrease'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}