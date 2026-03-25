import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Users, Map, ShieldX } from "lucide-react";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import GeolocationAuditMap from "@/components/time-tracking/GeolocationAuditMap";
import { format } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";

export default function ManagerApprovalView() {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState('pending');
  const [mapEntry, setMapEntry] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
  });

  // STRICT: Only admin and CEO can approve/reject
  const canApprove = currentUser?.role === 'admin' || currentUser?.role === 'ceo';

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
    mutationFn: (entryId) => {
      if (!canApprove) throw new Error('Unauthorized');
      return base44.entities.TimeEntry.update(entryId, { status: 'approved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerPendingEntries'] });
      toast.success(language === 'es' ? 'Registro aprobado' : 'Entry approved');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (entryId) => {
      if (!canApprove) throw new Error('Unauthorized');
      return base44.entities.TimeEntry.update(entryId, { status: 'rejected' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerPendingEntries'] });
      toast.success(language === 'es' ? 'Registro rechazado' : 'Entry rejected');
    },
  });

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const groupedEntries = pendingEntries.reduce((acc, entry) => {
    // Group by user_id if available, otherwise fallback to email
    const key = entry.user_id || entry.employee_email;
    if (!acc[key]) {
      acc[key] = {
        employee_name: entry.employee_name,
        employee_email: entry.employee_email,
        user_id: entry.user_id,
        entries: []
      };
    }
    acc[key].entries.push(entry);
    return acc;
  }, {});

  // Block non-admins/managers entirely
  if (currentUser && !canApprove) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldX className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-300">
            {language === 'es' ? 'Acceso Restringido' : 'Access Restricted'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {language === 'es'
              ? 'Solo administradores y managers pueden aprobar horas.'
              : 'Only admins and managers can approve time entries.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {mapEntry && (
        <GeolocationAuditMap
          entry={mapEntry}
          language={language}
          onClose={() => setMapEntry(null)}
        />
      )}
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
                          {(entry.check_in_latitude || entry.check_out_latitude) && (
                            <button
                              onClick={() => setMapEntry(entry)}
                              className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                              <Map className="w-3 h-3" />
                              {language === 'es' ? 'Ver ubicación' : 'View location'}
                              {entry.requires_location_review && (
                                <span className="ml-1 text-amber-500 text-[10px] font-bold">⚠️ Review needed</span>
                              )}
                            </button>
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