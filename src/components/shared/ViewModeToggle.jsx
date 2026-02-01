import React from "react";
import { Button } from "@/components/ui/button";
import { Grid3x3, List } from "lucide-react";

export default function ViewModeToggle({ viewMode, onViewModeChange }) {
  return (
    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className={`h-8 px-3 ${
          viewMode === 'grid' 
            ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <Grid3x3 className="w-4 h-4" />
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('list')}
        className={`h-8 px-3 ${
          viewMode === 'list' 
            ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  );
}