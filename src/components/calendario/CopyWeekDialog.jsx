import React, { useState } from 'react';
import { Copy, Calendar, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format, startOfWeek, endOfWeek, addWeeks, addDays, differenceInDays } from 'date-fns';

export default function CopyWeekDialog({ 
  open, 
  onOpenChange, 
  currentDate,
  shifts,
  onCopyWeek,
  language = 'en'
}) {
  const [targetWeeks, setTargetWeeks] = useState([1]);
  const [copying, setCopying] = useState(false);

  const sourceStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const sourceEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Get shifts for current week
  const sourceShifts = shifts.filter(s => {
    if (!s.date) return false;
    const shiftDate = new Date(s.date);
    return shiftDate >= sourceStart && shiftDate <= sourceEnd;
  });

  const toggleWeek = (weekOffset) => {
    setTargetWeeks(prev => 
      prev.includes(weekOffset) 
        ? prev.filter(w => w !== weekOffset)
        : [...prev, weekOffset].sort((a, b) => a - b)
    );
  };

  const handleCopy = async () => {
    if (targetWeeks.length === 0) return;
    
    setCopying(true);
    
    const newShifts = [];
    for (const weekOffset of targetWeeks) {
      for (const shift of sourceShifts) {
        const originalDate = new Date(shift.date);
        const dayOffset = differenceInDays(originalDate, sourceStart);
        const newDate = addDays(addWeeks(sourceStart, weekOffset), dayOffset);
        
        newShifts.push({
          ...shift,
          id: undefined,
          date: format(newDate, 'yyyy-MM-dd'),
          status: 'pending'
        });
      }
    }
    
    await onCopyWeek(newShifts);
    setCopying(false);
    onOpenChange(false);
  };

  const futureWeeks = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Copy className="w-5 h-5 text-[#3B9FF3]" />
            {language === 'es' ? 'Copiar Semana' : 'Copy Week'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source week */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
              {language === 'es' ? 'Semana origen:' : 'Source week:'}
            </p>
            <p className="font-medium text-blue-800 dark:text-blue-300">
              {format(sourceStart, 'MMM d')} - {format(sourceEnd, 'MMM d, yyyy')}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              {sourceShifts.length} {language === 'es' ? 'turnos' : 'shifts'}
            </p>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </div>

          {/* Target weeks */}
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {language === 'es' ? 'Copiar a semanas:' : 'Copy to weeks:'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {futureWeeks.map(weekOffset => {
                const weekStart = addWeeks(sourceStart, weekOffset);
                const weekEnd = addWeeks(sourceEnd, weekOffset);
                const isSelected = targetWeeks.includes(weekOffset);

                return (
                  <button
                    key={weekOffset}
                    onClick={() => toggleWeek(weekOffset)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-[#3B9FF3] bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          +{weekOffset} {language === 'es' ? 'sem' : 'wk'}
                        </p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {format(weekStart, 'MMM d')} - {format(weekEnd, 'd')}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#3B9FF3]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {targetWeeks.length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400">
                {language === 'es' 
                  ? `Se crearán ${sourceShifts.length * targetWeeks.length} turnos nuevos`
                  : `${sourceShifts.length * targetWeeks.length} new shifts will be created`
                }
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleCopy} 
            disabled={targetWeeks.length === 0 || sourceShifts.length === 0 || copying}
            className="bg-[#3B9FF3]"
          >
            <Copy className="w-4 h-4 mr-2" />
            {copying 
              ? (language === 'es' ? 'Copiando...' : 'Copying...') 
              : (language === 'es' ? 'Copiar' : 'Copy')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}