import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import ExcelExporter, { transformJobsForExport } from "@/components/shared/ExcelExporter";

export default function JobsActionBar({
  isAdmin,
  filteredJobs,
  onShowAIWizard,
  onShowForm,
  language
}) {
  const { t } = useLanguage();

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
      <ExcelExporter
        data={filteredJobs}
        filename="jobs"
        sheetName="Jobs"
        transformData={transformJobsForExport}
        buttonText={language === 'es' ? 'Excel' : 'Excel'}
        variant="outline"
        size="sm"
        className="h-10 border-green-200 text-green-600 hover:bg-green-50"
      />
      <Button
        onClick={onShowAIWizard}
        className="h-10 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A]/90 hover:to-[#3B82F6]/90 text-white shadow-md px-4"
      >
        <Plus className="w-4 h-4 mr-2" />
        {language === 'es' ? 'Crear con IA' : 'Create with AI'}
      </Button>
      <Button
        onClick={onShowForm}
        variant="outline"
        className="h-10 border-[#507DB4]/30 dark:border-[#507DB4]/40 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 px-4"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        <span className="hidden sm:inline">{language === 'es' ? 'Creación Rápida' : 'Quick Create'}</span>
        <span className="sm:hidden">{language === 'es' ? 'Rápido' : 'Quick'}</span>
      </Button>
    </div>
  );
}