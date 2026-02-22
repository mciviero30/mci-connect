import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import AIJobWizard from "@/components/trabajos/AIJobWizard";
import JobForm from "@/components/trabajos/JobForm";

export default function JobsDialogs({
  showAIWizard,
  onAIWizardOpenChange,
  onWizardComplete,
  onWizardCancel,
  showForm,
  onFormOpenChange,
  editingJob,
  onFormSubmit,
  onFormCancel,
  isFormProcessing
}) {
  const { t, language } = useLanguage();

  return (
    <>
      {/* AI Wizard Dialog */}
      <Dialog open={showAIWizard} onOpenChange={onAIWizardOpenChange}>
        <DialogContent className="max-w-4xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#507DB4]" />
              {language === 'es' ? 'Crear Proyecto con Asistente IA' : 'Create Project with AI Assistant'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <AIJobWizard
              onComplete={onWizardComplete}
              onCancel={onWizardCancel}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Regular Form Dialog */}
      <Dialog open={showForm} onOpenChange={onFormOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-900 dark:text-white">
              {editingJob ? t('editJob') : t('newJob')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <JobForm
              job={editingJob}
              onSubmit={onFormSubmit}
              onCancel={onFormCancel}
              isProcessing={isFormProcessing}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}