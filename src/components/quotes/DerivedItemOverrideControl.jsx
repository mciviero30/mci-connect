/**
 * ============================================================================
 * DERIVED ITEM OVERRIDE CONTROL (CAPA 4 - UI COMPONENT)
 * ============================================================================
 * 
 * Manages manual override UI for derived items (Hotel, Per-Diem, Travel Items)
 * Shows edit/recalculate controls depending on override state
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lock, Unlock, RotateCcw } from 'lucide-react';
import { hasManualOverride, validateDerivedItem } from '@/components/domain/quotes/manualOverrideHelpers';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function DerivedItemOverrideControl({
  item,
  onToggleOverride,
  onRecalculate,
  calculatedQuantity
}) {
  const { language } = useLanguage();
  
  if (!item.auto_calculated) {
    return null; // Only show for derived items
  }
  
  const isOverridden = hasManualOverride(item);
  const validation = validateDerivedItem(item);
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status Badge */}
      <Badge
        className={
          isOverridden
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-blue-100 text-blue-800 border-blue-300'
        }
      >
        {isOverridden ? (
          <>
            <Unlock className="w-3 h-3 mr-1" />
            {language === 'es' ? 'Override Manual' : 'Manual Override'}
          </>
        ) : (
          <>
            <Lock className="w-3 h-3 mr-1" />
            {language === 'es' ? 'Auto-Calculado' : 'Auto-Calculated'}
          </>
        )}
      </Badge>

      {/* Override Button */}
      <Button
        size="sm"
        variant={isOverridden ? 'outline' : 'default'}
        onClick={() => onToggleOverride(!isOverridden)}
        className={
          isOverridden
            ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
            : 'border-blue-300 text-blue-700 hover:bg-blue-50'
        }
      >
        {isOverridden ? (
          <>
            <Lock className="w-3 h-3 mr-1" />
            {language === 'es' ? 'Bloquear' : 'Lock'}
          </>
        ) : (
          <>
            <Unlock className="w-3 h-3 mr-1" />
            {language === 'es' ? 'Editar' : 'Edit'}
          </>
        )}
      </Button>

      {/* Recalculate Button (only show if overridden) */}
      {isOverridden && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRecalculate(calculatedQuantity)}
          className="border-green-300 text-green-700 hover:bg-green-50"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          {language === 'es' ? 'Recalcular' : 'Recalculate'}
        </Button>
      )}

      {/* Validation Warning */}
      {!validation.valid && (
        <div className="flex items-center gap-1 text-red-600 text-xs bg-red-50 px-2 py-1 rounded">
          <AlertCircle className="w-3 h-3" />
          {validation.warnings[0]}
        </div>
      )}
    </div>
  );
}