import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { BookTemplate, Plus, Trash2, Copy, Check } from "lucide-react";

export default function QuoteTemplates({ onSelectTemplate }) {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['quoteTemplates'],
    queryFn: () => base44.entities.Quote.filter({ is_template: true }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.Quote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      toast.success(language === 'es' ? 'Plantilla eliminada' : 'Template deleted');
    }
  });

  const handleSelectTemplate = (template) => {
    const templateData = {
      customer_id: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      job_name: '',
      job_id: '',
      job_address: '',
      team_id: template.team_id,
      team_name: template.team_name,
      items: template.items,
      tax_rate: template.tax_rate,
      notes: template.notes,
      terms: template.terms,
    };
    onSelectTemplate(templateData);
    setOpen(false);
    toast.success(language === 'es' ? 'Plantilla aplicada' : 'Template applied');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white border-purple-300 text-purple-700 hover:bg-purple-50">
          <BookTemplate className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Plantillas' : 'Templates'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            {language === 'es' ? 'Plantillas de Estimados' : 'Quote Templates'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <BookTemplate className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{language === 'es' ? 'No hay plantillas guardadas' : 'No templates saved'}</p>
              <p className="text-sm mt-1">
                {language === 'es' 
                  ? 'Guarda un estimado como plantilla para reutilizarlo' 
                  : 'Save a quote as template to reuse it'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {templates.map(template => (
                <Card key={template.id} className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {template.template_name || template.job_name}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {template.items?.length || 0} {language === 'es' ? 'ítems' : 'items'} • 
                          ${template.total?.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSelectTemplate(template)}
                          className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {language === 'es' ? 'Usar' : 'Use'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SaveAsTemplateButton({ quoteData, onSave }) {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const templateData = {
        ...quoteData,
        is_template: true,
        template_name: templateName,
        quote_number: `TPL-${Date.now()}`,
        status: 'draft',
      };
      delete templateData.id;
      delete templateData.created_date;
      delete templateData.updated_date;
      delete templateData.created_by;
      return base44.entities.Quote.create(templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      toast.success(language === 'es' ? 'Plantilla guardada' : 'Template saved');
      setOpen(false);
      setTemplateName("");
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white border-purple-300 text-purple-700 hover:bg-purple-50">
          <BookTemplate className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Guardar como Plantilla' : 'Save as Template'}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            {language === 'es' ? 'Guardar como Plantilla' : 'Save as Template'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Nombre de la Plantilla' : 'Template Name'}
            </Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={language === 'es' ? 'Ej: Instalación Estándar' : 'Ex: Standard Installation'}
              className="mt-1"
            />
          </div>
          <Button
            onClick={() => saveTemplateMutation.mutate()}
            disabled={!templateName || saveTemplateMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            {saveTemplateMutation.isPending 
              ? (language === 'es' ? 'Guardando...' : 'Saving...') 
              : (language === 'es' ? 'Guardar Plantilla' : 'Save Template')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}