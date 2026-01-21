import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { getErrorMessage } from "./useResilientQuery";

/**
 * Reusable error state component for query failures
 * Shows human-readable message with retry option
 * 
 * Usage:
 * {isError && (
 *   <QueryErrorState
 *     error={error}
 *     onRetry={retry}
 *     context="your expenses"
 *     language={language}
 *   />
 * )}
 */
export default function QueryErrorState({ 
  error, 
  onRetry, 
  context = '', 
  language = 'en',
  className = '',
  compact = false 
}) {
  const isNetworkError = !navigator.onLine || 
    error?.message?.includes('network') || 
    error?.message?.includes('fetch');

  const errorMessage = getErrorMessage(error, context, language);

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isNetworkError ? (
            <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <p className="text-sm text-red-800 dark:text-red-300 font-medium truncate">{errorMessage}</p>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0 ml-2"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            {language === 'es' ? 'Reintentar' : 'Retry'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Alert className={`bg-red-50/50 dark:bg-red-900/20 border-red-300 dark:border-red-700 ${className}`}>
      {isNetworkError ? (
        <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
      )}
      <AlertTitle className="text-red-900 dark:text-red-200 font-bold">
        {language === 'es' ? 'Error de carga' : 'Loading Error'}
      </AlertTitle>
      <AlertDescription className="text-red-800 dark:text-red-300">
        <p className="mb-3">{errorMessage}</p>
        {onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Reintentar' : 'Retry'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Inline error state for small sections
 */
export function InlineErrorState({ error, onRetry, context = '', language = 'en' }) {
  return (
    <div className="flex items-center justify-center py-8 text-center">
      <div className="max-w-sm">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-700 dark:text-red-400 mb-3">
          {getErrorMessage(error, context, language)}
        </p>
        {onRetry && (
          <Button onClick={onRetry} size="sm" variant="outline" className="border-red-300 text-red-700">
            <RefreshCw className="w-3 h-3 mr-1" />
            {language === 'es' ? 'Reintentar' : 'Retry'}
          </Button>
        )}
      </div>
    </div>
  );
}