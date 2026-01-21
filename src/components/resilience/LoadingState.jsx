import React from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Skeleton loader for initial data loading
 * Maintains layout structure to prevent shift
 */
export function QuerySkeleton({ count = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Inline loading indicator for background fetches
 */
export function InlineLoader({ message = 'Loading...', language = 'en' }) {
  const text = language === 'es' ? 'Cargando...' : message;
  
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

/**
 * Background fetch indicator (non-blocking)
 */
export function BackgroundFetchIndicator({ language = 'en' }) {
  return (
    <div className="absolute top-2 right-2 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
      <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
      <span className="text-xs text-blue-700 dark:text-blue-300">
        {language === 'es' ? 'Actualizando...' : 'Updating...'}
      </span>
    </div>
  );
}