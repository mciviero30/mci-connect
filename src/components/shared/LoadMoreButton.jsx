import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';

export default function LoadMoreButton({ 
  onLoadMore, 
  hasMore, 
  isLoading, 
  totalLoaded,
  language = 'en' 
}) {
  if (!hasMore) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {language === 'es' 
            ? `✓ Todos los registros cargados (${totalLoaded})` 
            : `✓ All records loaded (${totalLoaded})`}
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <Button
        onClick={onLoadMore}
        disabled={isLoading}
        variant="outline"
        className="min-w-[200px] border-[#507DB4]/30 dark:border-[#507DB4]/40 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {language === 'es' ? 'Cargando...' : 'Loading...'}
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Cargar más' : 'Load more'}
          </>
        )}
      </Button>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
        {language === 'es' 
          ? `${totalLoaded} registros cargados` 
          : `${totalLoaded} records loaded`}
      </p>
    </div>
  );
}