import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Filter, X } from 'lucide-react';
import FieldBottomSheet from './FieldBottomSheet';

export default function FiltersBottomSheet({ 
  open, 
  onOpenChange,
  filters,
  onFiltersChange,
  filterOptions = {}
}) {
  const [localFilters, setLocalFilters] = React.useState(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, open]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const clearedFilters = Object.keys(localFilters).reduce((acc, key) => {
      acc[key] = 'all';
      return acc;
    }, {});
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onOpenChange(false);
  };

  return (
    <FieldBottomSheet 
      open={open} 
      onOpenChange={onOpenChange}
      title="Filters"
      maxHeight="70vh"
    >
      <div className="space-y-5">
        {/* Status Filter */}
        {filterOptions.status && (
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Status
            </Label>
            <Select 
              value={localFilters.status || 'all'} 
              onValueChange={(v) => setLocalFilters({ ...localFilters, status: v })}
            >
              <SelectTrigger className="min-h-[52px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="min-h-[48px]">All Status</SelectItem>
                {filterOptions.status.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="min-h-[48px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Priority Filter */}
        {filterOptions.priority && (
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Priority
            </Label>
            <Select 
              value={localFilters.priority || 'all'} 
              onValueChange={(v) => setLocalFilters({ ...localFilters, priority: v })}
            >
              <SelectTrigger className="min-h-[52px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="min-h-[48px]">All Priorities</SelectItem>
                {filterOptions.priority.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="min-h-[48px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Type Filter */}
        {filterOptions.type && (
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Type
            </Label>
            <Select 
              value={localFilters.type || 'all'} 
              onValueChange={(v) => setLocalFilters({ ...localFilters, type: v })}
            >
              <SelectTrigger className="min-h-[52px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="min-h-[48px]">All Types</SelectItem>
                {filterOptions.type.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="min-h-[48px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Action Buttons - Safe spacing for gloves */}
        <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              handleClear();
            }}
            variant="outline"
            className="flex-1 min-h-[60px] touch-manipulation active:scale-95 font-semibold border-2 active:bg-slate-50 dark:active:bg-slate-700"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <X className="w-5 h-5 mr-2" />
            Clear
          </Button>
          <Button 
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              handleApply();
            }}
            className="flex-1 bg-gradient-to-r from-orange-600 to-yellow-500 text-black min-h-[60px] touch-manipulation active:scale-95 font-bold shadow-lg active:shadow-xl"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Filter className="w-5 h-5 mr-2" />
            Apply
          </Button>
        </div>
      </div>
    </FieldBottomSheet>
  );
}