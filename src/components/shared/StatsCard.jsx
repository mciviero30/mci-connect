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

  // Color theme definitions with soft gradients
  const colorThemes = {
    blue: {
      gradient: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
      border: "border-2 border-blue-200 dark:border-blue-700",
      text: "text-blue-900 dark:text-blue-100",
      icon: "bg-blue-600 dark:bg-blue-500",
      iconColor: "text-white"
    },
    green: {
      gradient: "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20",
      border: "border-2 border-green-200 dark:border-green-700",
      text: "text-green-900 dark:text-green-100",
      icon: "bg-green-600 dark:bg-green-500",
      iconColor: "text-white"
    },
    purple: {
      gradient: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20",
      border: "border-2 border-purple-200 dark:border-purple-700",
      text: "text-purple-900 dark:text-purple-100",
      icon: "bg-purple-600 dark:bg-purple-500",
      iconColor: "text-white"
    },
    amber: {
      gradient: "from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20",
      border: "border-2 border-amber-200 dark:border-amber-700",
      text: "text-amber-900 dark:text-amber-100",
      icon: "bg-amber-600 dark:bg-amber-500",
      iconColor: "text-white"
    },
    red: {
      gradient: "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20",
      border: "border-2 border-red-200 dark:border-red-700",
      text: "text-red-900 dark:text-red-100",
      icon: "bg-red-600 dark:bg-red-500",
      iconColor: "text-white"
    },
    slate: {
      gradient: "from-slate-50 to-slate-100 dark:from-slate-800/20 dark:to-slate-700/20",
      border: "border-2 border-slate-200 dark:border-slate-700",
      text: "text-slate-900 dark:text-slate-100",
      icon: "bg-slate-600 dark:bg-slate-500",
      iconColor: "text-white"
    }
  };

  const theme = colorThemes[color] || colorThemes.blue;

  return (
    <Card className={`overflow-hidden shadow-lg relative group hover:scale-105 transition-transform duration-300 bg-gradient-to-br ${theme.gradient} ${theme.border}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-sm font-medium mb-2 ${theme.text} opacity-80`}>
              {title}
            </p>
            <h3 className={`text-3xl font-bold mb-1 ${theme.text}`}>
              {value}
            </h3>
            {subtitle && (
              <p className={`text-sm ${theme.text} opacity-70`}>
                {subtitle}
              </p>
            )}
          </div>
          {Icon && (
            <div className={`p-3 ${theme.icon} rounded-2xl shadow-lg`}>
              <Icon className={`w-6 h-6 ${theme.iconColor}`} />
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