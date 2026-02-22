import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function JobsEmptyState({
  isAdmin,
  hasAnyJobs,
  onShowAIWizard,
  onShowForm,
  language
}) {
  const { t } = useLanguage();

  return (
    <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
      <CardContent className="p-12 text-center">
        <Briefcase className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {hasAnyJobs ? (language === 'es' ? 'No se encontraron trabajos' : 'No jobs found') : t('noJobs')}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          {hasAnyJobs
            ? (language === 'es' ? 'Intenta ajustar los filtros' : 'Try adjusting your filters')
            : t('startByAddingJob')}
        </p>
        {isAdmin && !hasAnyJobs && (
          <div className="flex flex-col sm:flex-row justify-center gap-3 w-full sm:w-auto px-4 sm:px-0">
            <Button
              onClick={onShowAIWizard}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md min-h-[48px] w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {language === 'es' ? 'Crear con IA' : 'Create with AI'}
            </Button>
            <Button
              onClick={onShowForm}
              variant="outline"
              className="border-[#507DB4]/30 dark:border-[#507DB4]/40 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 min-h-[48px] w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t('createJob')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}