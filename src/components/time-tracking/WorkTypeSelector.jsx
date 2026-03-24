import React from 'react';
import { Button } from '@/components/ui/button';

export default function WorkTypeSelector({ workType, onWorkTypeChange, language }) {
  return (
    <div className="space-y-4">
      <p className="text-xl font-bold text-slate-900 dark:text-white text-center">
        {language === 'es' ? '¿Tipo de Trabajo?' : 'Type of Work?'}
      </p>
      
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => onWorkTypeChange('normal')}
          className={`flex-1 py-4 px-4 rounded-2xl font-bold text-white transition-all ${
            workType === 'normal'
              ? 'bg-blue-600 shadow-lg scale-105'
              : 'bg-slate-300 hover:bg-slate-400'
          }`}
        >
          {language === 'es' ? 'Trabajo Normal' : 'Work Time'}
        </button>
        
        <button
          onClick={() => onWorkTypeChange('driving')}
          className={`flex-1 py-4 px-4 rounded-2xl font-bold text-white transition-all ${
            workType === 'driving'
              ? 'bg-orange-500 shadow-lg scale-105'
              : 'bg-slate-300 hover:bg-slate-400'
          }`}
        >
          {language === 'es' ? 'Manejo' : 'Driving Time'}
        </button>
      </div>
    </div>
  );
}