import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/i18n/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { FileText, CheckCircle, XCircle, Download, User, Calendar, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function VerChangeOrderPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const changeOrderId = urlParams.get('id');

  const { data: changeOrder, isLoading } = useQuery({
    queryKey: ['changeOrder', changeOrderId],
    queryFn: async () => {
      const orders = await base44.entities.ChangeOrder.filter({ id: changeOrderId });
      return orders[0];
    },
    enabled: !!changeOrderId,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.ChangeOrder.update(changeOrderId, {
        status: 'approved',
        approval_status: 'approved',
        approved_by_internal: user.email,
        approved_by_internal_name: user.full_name,
        internal_approval_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrder'] });
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      toast({
        title: 'Change Order aprobado',
        variant: 'success'
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason) => {
      return base44.entities.ChangeOrder.update(changeOrderId, {
        status: 'rejected',
        approval_status: 'rejected',
        rejected_by: user.email,
        rejection_date: new Date().toISOString(),
        rejection_reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrder'] });
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      toast({
        title: 'Change Order rechazado',
        variant: 'success'
      });
    },
  });

  const handleReject = () => {
    const reason = prompt('Razón del rechazo:');
    if (reason) {
      rejectMutation.mutate(reason);
    }
  };

  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    pending_approval: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800' },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Cargando...</p>
      </div>
    );
  }

  if (!changeOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Change Order no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <PageHeader
        title={changeOrder.change_order_number}
        description={changeOrder.title}
        icon={FileText}
        showBack={true}
      />

      {/* Header Info */}
      <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{changeOrder.title}</h2>
            <Badge className={statusConfig[changeOrder.status]?.color}>
              {statusConfig[changeOrder.status]?.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">Job:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{changeOrder.job_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">Fecha:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {new Date(changeOrder.request_date || changeOrder.created_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">Monto:</span>
              <span className="font-bold text-green-600">${changeOrder.change_amount?.toLocaleString() || 0}</span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <p className="text-slate-700 dark:text-slate-300">{changeOrder.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Resumen Financiero</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Contrato Original:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                ${changeOrder.original_contract_amount?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Monto del Cambio:</span>
              <span className={`font-bold ${changeOrder.change_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {changeOrder.change_amount >= 0 ? '+' : ''}${changeOrder.change_amount?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-bold text-slate-900 dark:text-white">Nuevo Total:</span>
              <span className="font-bold text-xl text-[#507DB4]">
                ${changeOrder.new_contract_amount?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          {/* Financial Impact Analysis */}
          {changeOrder.financial_impact && (
            <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Impacto Financiero
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">Revenue Impact</p>
                  <p className={`font-bold ${changeOrder.financial_impact.revenue_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {changeOrder.financial_impact.revenue_impact >= 0 ? '+' : ''}${changeOrder.financial_impact.revenue_impact?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">Cost Impact</p>
                  <p className={`font-bold ${changeOrder.financial_impact.cost_impact >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {changeOrder.financial_impact.cost_impact >= 0 ? '+' : ''}${changeOrder.financial_impact.cost_impact?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">Profit Impact</p>
                  <p className={`font-bold ${changeOrder.financial_impact.profit_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {changeOrder.financial_impact.profit_impact >= 0 ? '+' : ''}${changeOrder.financial_impact.profit_impact?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">Margin Change</p>
                  <p className={`font-bold ${changeOrder.financial_impact.margin_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {changeOrder.financial_impact.margin_change >= 0 ? '+' : ''}{changeOrder.financial_impact.margin_change?.toFixed(2) || 0}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Schedule & Resource Impact */}
          {changeOrder.impact_on_job && (
            <div className="mt-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                Impacto en el Proyecto
              </h4>
              <div className="space-y-2 text-sm">
                {changeOrder.days_impact !== 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Impacto en Cronograma:</span>
                    <span className={`font-semibold ${changeOrder.days_impact > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {changeOrder.days_impact > 0 ? '+' : ''}{changeOrder.days_impact} días
                    </span>
                  </div>
                )}
                {changeOrder.impact_on_job.risk_level && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Nivel de Riesgo:</span>
                    <Badge className={
                      changeOrder.impact_on_job.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                      changeOrder.impact_on_job.risk_level === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {changeOrder.impact_on_job.risk_level === 'high' ? 'Alto' :
                       changeOrder.impact_on_job.risk_level === 'medium' ? 'Medio' : 'Bajo'}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      {changeOrder.items && changeOrder.items.length > 0 && (
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-slate-600 dark:text-slate-400">Item</th>
                    <th className="text-right py-2 text-slate-600 dark:text-slate-400">Cantidad</th>
                    <th className="text-right py-2 text-slate-600 dark:text-slate-400">Precio Unit.</th>
                    <th className="text-right py-2 text-slate-600 dark:text-slate-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {changeOrder.items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 text-slate-900 dark:text-white">{item.item_name}</td>
                      <td className="text-right text-slate-900 dark:text-white">{item.quantity}</td>
                      <td className="text-right text-slate-900 dark:text-white">${item.unit_price}</td>
                      <td className="text-right font-semibold text-slate-900 dark:text-white">${item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {changeOrder.status === 'pending_approval' && user?.role === 'admin' && (
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleReject} className="border-red-300 text-red-600">
            <XCircle className="w-4 h-4 mr-2" />
            Rechazar
          </Button>
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="bg-gradient-to-r from-green-500 to-green-600"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {approveMutation.isPending ? 'Aprobando...' : 'Aprobar'}
          </Button>
        </div>
      )}
    </div>
  );
}