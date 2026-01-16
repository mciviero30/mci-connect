import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * EmptyStateCard - Unified empty state for consistent UX
 * 
 * Usage:
 * <EmptyStateCard 
 *   icon={IconComponent} 
 *   title="No items found"
 *   description="Start by adding your first item"
 *   action={<Button>Add Item</Button>}
 * />
 */
export default function EmptyStateCard({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}) {
  return (
    <Card className={cn(
      "bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700",
      className
    )}>
      <CardContent className="p-12 text-center">
        {Icon && (
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Icon className="w-10 h-10 text-slate-400 dark:text-slate-600" />
          </div>
        )}
        {title && (
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        )}
        {description && (
          <p className="text-slate-500 dark:text-slate-400 mb-6">{description}</p>
        )}
        {action && <div>{action}</div>}
      </CardContent>
    </Card>
  );
}