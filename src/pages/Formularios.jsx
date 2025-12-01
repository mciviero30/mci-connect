import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import PageHeader from "../components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function Formularios() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedForm, setSelectedForm] = useState(null);
  const [responses, setResponses] = useState({});

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const isAdmin = user?.role === 'admin';

  const { data: templates, isLoading } = useQuery({
    queryKey: ['formTemplates'],
    queryFn: () => base44.entities.FormTemplate.list(),
    initialData: [],
  });

  const { data: submissions } = useQuery({
    queryKey: ['formSubmissions'],
    queryFn: () => base44.entities.FormSubmission.list('-submission_date'),
    initialData: [],
  });

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.FormSubmission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formSubmissions'] });
      setSelectedForm(null);
      setResponses({});
      toast.success(t('success'));
    }
  });

  const handleSubmit = () => {
    const requiredFields = selectedForm.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !responses[f.id]);

    if (missingFields.length > 0) {
      toast.error(t('error'));
      return;
    }

    submitMutation.mutate({
      template_id: selectedForm.id,
      template_name: selectedForm.name,
      submitted_by_email: user.email,
      submitted_by_name: user.full_name,
      submission_date: new Date().toISOString(),
      responses
    });
  };

  const mySubmissions = submissions.filter(s => s.submitted_by_email === user?.email);

  const availableTemplates = templates.filter(t => 
    t.active && (!t.assigned_to || t.assigned_to.includes(user?.email) || isAdmin)
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('forms')}
          description={`${availableTemplates.length} ${t('forms').toLowerCase()}`}
          icon={ClipboardList}
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {availableTemplates.map(template => {
            const mySubmissionsForThisForm = mySubmissions.filter(s => s.template_id === template.id);

            return (
              <Card key={template.id} className="bg-white dark:bg-[#282828] shadow-lg hover:shadow-xl transition-all border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">{template.name}</h3>
                      <Badge className="bg-[#3B9FF3]/20 text-[#3B9FF3] border-[#3B9FF3]">
                        {t(template.type)}
                      </Badge>
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{template.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {mySubmissionsForThisForm.length > 0 ? (
                        <div className="flex items-center gap-1 text-[#3B9FF3]">
                          <CheckCircle className="w-4 h-4" />
                          <span>{t('completed')} {mySubmissionsForThisForm.length}x</span>
                        </div>
                      ) : (
                        <span>{t('pending')}</span>
                      )}
                    </div>
                    <Button onClick={() => setSelectedForm(template)} size="sm" className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/30">
                      {t('view')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {availableTemplates.length === 0 && (
          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <ClipboardList className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">{t('noForms')}</p>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card shadow-xl border-slate-800">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">{t('completed')}</h2>
            <div className="space-y-3">
              {mySubmissions.slice(0, 10).map(submission => (
                <div key={submission.id} className="p-4 bg-slate-800/50 rounded-lg flex items-center justify-between border border-slate-700">
                  <div>
                    <p className="font-semibold text-white">{submission.template_name}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(submission.submission_date), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-[#3B9FF3]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!selectedForm} onOpenChange={() => setSelectedForm(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">{selectedForm?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {selectedForm?.fields.map(field => (
                <div key={field.id}>
                  <Label className="block font-medium text-slate-300 mb-2">
                    {field.label} {field.required && <span className="text-[#3B9FF3]">*</span>}
                  </Label>
                  
                  {field.type === 'text' && (
                    <Input
                      value={responses[field.id] || ''}
                      onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  )}

                  {field.type === 'textarea' && (
                    <Textarea
                      value={responses[field.id] || ''}
                      onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
                      rows={4}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  )}

                  {field.type === 'number' && (
                    <Input
                      type="number"
                      value={responses[field.id] || ''}
                      onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  )}

                  {field.type === 'checkbox' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={responses[field.id] || false}
                        onChange={(e) => setResponses({ ...responses, [field.id]: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-300">{field.label}</span>
                    </div>
                  )}

                  {field.type === 'select' && (
                    <select
                      value={responses[field.id] || ''}
                      onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-slate-800 border-slate-700 text-white"
                    >
                      <option value="">{t('select')}</option>
                      {field.options?.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setSelectedForm(null)} className="bg-slate-800 border-slate-700 text-slate-300">
                  {t('cancel')}
                </Button>
                <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/30">
                  {submitMutation.isPending ? t('loading') : t('submit')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}