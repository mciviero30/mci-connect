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
  // If gradient is provided directly as a Tailwind classes string
  if (gradient) {
    return (
      <Card className={`overflow-hidden border-[#E0E7FF] dark:border-slate-700 shadow-md relative group hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${gradient}`}>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[#507DB4] dark:text-[#6B9DD8] text-sm font-bold mb-2 tracking-wide uppercase opacity-90">
                {title}
              </p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                {value}
              </h3>
              {subtitle && (
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                  {subtitle}
                </p>
              )}
            </div>
            {Icon && (
              <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-2xl shadow-lg shadow-[#507DB4]/30">
                <Icon className="w-6 h-6 text-white" />
              </div>
            )}
            </div>
          {trend && (
            <div className="flex items-center gap-1 mt-3">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-[#507DB4] dark:text-[#6B9DD8]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#507DB4] dark:text-[#6B9DD8]" />
              )}
              <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold">
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