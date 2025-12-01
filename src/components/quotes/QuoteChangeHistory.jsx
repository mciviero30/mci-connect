import React from "react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { History, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function QuoteChangeHistory({ history = [] }) {
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <History className="w-4 h-4" />
        {language === 'es' ? 'Historial de Cambios' : 'Change History'}
      </h4>

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            {language === 'es' ? 'No hay historial de cambios' : 'No change history'}
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
            {history.map((entry, idx) => (
              <div key={idx} className="relative pl-6 pb-4">
                <div className="absolute left-0 w-4 h-4 bg-cyan-500 rounded-full border-2 border-white dark:border-slate-900" />
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
                      {entry.changed_by_name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {format(new Date(entry.changed_at), 'MMM d, HH:mm', { 
                        locale: language === 'es' ? es : undefined 
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{entry.changes}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}