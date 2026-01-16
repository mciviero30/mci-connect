import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * ModernCard - Unified card component for consistent design across the app
 * 
 * Usage:
 * <ModernCard title="Title" icon={IconComponent} gradient="blue">
 *   Content here
 * </ModernCard>
 */
export default function ModernCard({ 
  title, 
  description,
  icon: Icon, 
  children, 
  actions,
  gradient = "default",
  className,
  headerClassName,
  contentClassName,
  noPadding = false,
  noBorder = false
}) {
  const gradients = {
    default: "from-[#F0F4FF] to-[#EBF2FF]",
    blue: "from-blue-50/40 to-blue-100/30",
    green: "from-green-50/40 to-green-100/30",
    amber: "from-amber-50/40 to-amber-100/30",
    red: "from-red-50/40 to-red-100/30",
    purple: "from-purple-50/40 to-purple-100/30",
    white: "from-white to-white"
  };

  const borderColors = {
    default: "border-slate-200 dark:border-slate-700",
    blue: "border-blue-200/40 dark:border-blue-700/30",
    green: "border-green-200/40 dark:border-green-700/30",
    amber: "border-amber-200/40 dark:border-amber-700/30",
    red: "border-red-200/40 dark:border-red-700/30",
    purple: "border-purple-200/40 dark:border-purple-700/30",
    white: "border-slate-200 dark:border-slate-700"
  };

  return (
    <Card className={cn(
      "bg-white dark:bg-[#282828] shadow-lg hover:shadow-xl transition-all",
      noBorder ? "" : borderColors[gradient] || borderColors.default,
      className
    )}>
      {(title || Icon || actions) && (
        <CardHeader className={cn(
          "border-b border-slate-200 dark:border-slate-700",
          headerClassName
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={cn(
                  "p-2 rounded-lg bg-gradient-to-br",
                  gradients[gradient] || gradients.default
                )}>
                  <Icon className="w-5 h-5 text-[#507DB4] dark:text-[#6B9DD8]" />
                </div>
              )}
              <div>
                {title && (
                  <CardTitle className="text-slate-900 dark:text-white">{title}</CardTitle>
                )}
                {description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
                )}
              </div>
            </div>
            {actions && <div>{actions}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(
        noPadding ? "p-0" : "p-6",
        contentClassName
      )}>
        {children}
      </CardContent>
    </Card>
  );
}