import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";

export default function ManagerApprovalView() {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState('pending');

  const { data: pendingEntries = [], isLoading } = useQuery({
    queryKey: ['managerPendingEntries', selectedFilter],
    queryFn: async () => {
      if (selectedFilter === 'all') {
        return await base44.entities.TimeEntry.list('-date', 100);
      }
      return await base44.entities.TimeEntry.filter({ status: selectedFilter }, '-date', 100);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (entryId) => base44.entities.TimeEntry.update(entryId, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerPendingEntries'] });
      toast.success(language === 'es' ? 'Registro aprobado' : 'Entry approved');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (entryId) => base44.entities.TimeEntry.update(entryId, { status: 'rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerPendingEntries'] });
      toast.success(language === 'es' ? 'Registro rechazado' : 'Entry rejected');
    },
  });

  const groupedEntries = pendingEntries.reduce((acc, entry) => {
    const key = entry.employee_email;
    if (!acc[key]) {
      acc[key] = {
        employee_name: entry.employee_name,
        employee_email: entry.employee_email,
        entries: []
      };
    }
    acc[key].entries.push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {language === 'es' ? 'Aprobar Horas de Equipo' : 'Approve Team Hours'}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={selectedFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('pending')}
              >
                {language === 'es' ? 'Pendientes' : 'Pending'}
              </Button>
              <Button
                size="sm"
                variant={selectedFilter === 'approved' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('approved')}
              >
                {language === 'es' ? 'Aprobados' : 'Approved'}
              </Button>
              <Button
                size="sm"
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('all')}
              >
                {language === 'es' ? 'Todos' : 'All'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">
              {language === 'es' ? 'Cargando...' : 'Loading...'}
            </div>
          ) : Object.keys(groupedEntries).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {language === 'es' ? 'No hay registros para revisar' : 'No entries to review'}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(groupedEntries).map((employeeGroup) => (
                <div key={employeeGroup.employee_email} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{employeeGroup.employee_name}</h4>
                      <p className="text-sm text-slate-600">{employeeGroup.employee_email}</p>
                    </div>
                    <Badge variant="secondary">
                      {employeeGroup.entries.length} {language === 'es' ? 'registros' : 'entries'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {employeeGroup.entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-medium">{format(new Date(entry.date), 'MMM d, yyyy')}</p>
                            <Badge
                              variant={
                                entry.status === 'approved' ? 'default' :
                                entry.status === 'rejected' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {entry.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            {entry.check_in} - {entry.check_out || language === 'es' ? 'En curso' : 'Active'}
                            {' • '}
                            <span className="font-semibold text-blue-600">{entry.hours_worked?.toFixed(2) || '0.00'}h</span>
                          </p>
                          {entry.job_name && (
                            <p className="text-sm text-slate-500">{entry.job_name}</p>
                          )}
                        </div>

                        {entry.status === 'pending' && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveMutation.mutate(entry.id)}
                              disabled={approveMutation.isPending}
                              className="text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {language === 'es' ? 'Aprobar' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectMutation.mutate(entry.id)}
                              disabled={rejectMutation.isPending}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              {language === 'es' ? 'Rechazar' : 'Reject'}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}