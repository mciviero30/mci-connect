import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/i18n/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, X, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CrearChangeOrderPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    job_id: '',
    job_name: '',
    customer_id: '',
    customer_name: '',
    title: '',
    description: '',
    reason: 'client_request',
    request_date: new Date().toISOString().split('T')[0],
    items: [],
    original_contract_amount: 0,
    change_amount: 0,
    days_impact: 0,
    new_completion_date: '',
    notes: '',
    impact_on_job: {
      risk_level: 'low'
    },
    financial_impact: {
      revenue_impact: 0,
      cost_impact: 0,
      profit_impact: 0,
      margin_change: 0
    }
  });

  const [attachments, setAttachments] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }, 'name'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Get change order number
      const { change_order_number } = await base44.functions.invoke('generateChangeOrderNumber');

      // Upload attachments
      const uploadedAttachments = await Promise.all(
        attachments.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return {
            url: file_url,
            name: file.name,
            type: file.type,
          };
        })
      );

      // WRITE GUARD — user_id required for new records (legacy tolerated)
      const writeData = {
        ...data,
        change_order_number,
        requested_by_user_id: user?.id, // NEW: Enforce user_id
        requested_by: user.email,
        requested_by_name: user.full_name,
        attachments: uploadedAttachments,
      };

      if (!user?.id) {
        console.warn('[WRITE GUARD] ⚠️ Creating ChangeOrder without user_id', {
          email: user?.email,
          change_order_number
        });
      }

      return base44.entities.ChangeOrder.create(writeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      toast({
        title: 'Change Order creado exitosamente',
        variant: 'success'
      });
      navigate(createPageUrl('ChangeOrders'));
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleJobChange = (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setFormData({
        ...formData,
        job_id: jobId,
        job_name: job.name,
        customer_id: job.customer_id,
        customer_name: job.customer_name,
        original_contract_amount: job.contract_amount || 0,
      });
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_name: '', description: '', quantity: 1, unit: 'unit', unit_price: 0, total: 0 },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Calculate total
    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].unit_price) || 0;
      newItems[index].total = qty * price;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Calculate change amount and financial impact
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const newTotal = formData.original_contract_amount + total;
    
    // Estimate cost impact (assuming 60% cost ratio)
    const estimatedCostImpact = total * 0.6;
    const profitImpact = total - estimatedCostImpact;
    
    // Calculate margin change
    const originalProfit = formData.original_contract_amount * 0.4; // Assuming 40% margin
    const newProfit = originalProfit + profitImpact;
    const originalMargin = (originalProfit / formData.original_contract_amount) * 100;
    const newMargin = (newProfit / newTotal) * 100;
    const marginChange = newMargin - originalMargin;
    
    setFormData((prev) => ({
      ...prev,
      change_amount: total,
      new_contract_amount: newTotal,
      financial_impact: {
        revenue_impact: total,
        cost_impact: estimatedCostImpact,
        profit_impact: profitImpact,
        margin_change: marginChange
      }
    }));
  }, [formData.items, formData.original_contract_amount]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.job_id || !formData.title || !formData.description) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive'
      });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <PageHeader
        title="Crear Change Order"
        description="Nueva orden de cambio"
        icon={FileText}
        showBack={true}
      />

      <form onSubmit={handleSubmit}>
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Trabajo *</Label>
              <Select value={formData.job_id} onValueChange={handleJobChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar trabajo" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <Input value={formData.customer_name} disabled className="bg-slate-100" />
              </div>
              <div>
                <Label>Monto Original del Contrato</Label>
                <Input
                  type="number"
                  value={formData.original_contract_amount}
                  disabled
                  className="bg-slate-100"
                />
              </div>
            </div>

            <div>
              <Label>Título del Cambio *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="ej: Agregar puertas adicionales"
                required
              />
            </div>

            <div>
              <Label>Descripción *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el cambio en detalle..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Razón del Cambio</Label>
                <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_request">Solicitud del Cliente</SelectItem>
                    <SelectItem value="design_change">Cambio de Diseño</SelectItem>
                    <SelectItem value="site_conditions">Condiciones del Sitio</SelectItem>
                    <SelectItem value="material_substitution">Sustitución de Material</SelectItem>
                    <SelectItem value="scope_addition">Adición de Alcance</SelectItem>
                    <SelectItem value="unforeseen_work">Trabajo Imprevisto</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fecha de Solicitud</Label>
                <Input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Impacto en Días</Label>
                <Input
                  type="number"
                  value={formData.days_impact}
                  onChange={(e) => setFormData({ ...formData, days_impact: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Nueva Fecha de Completación</Label>
                <Input
                  type="date"
                  value={formData.new_completion_date}
                  onChange={(e) => setFormData({ ...formData, new_completion_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Nivel de Riesgo</Label>
                <Select 
                  value={formData.impact_on_job?.risk_level || 'low'} 
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    impact_on_job: { ...formData.impact_on_job, risk_level: value } 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bajo</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Items del Cambio</h3>
              <Button type="button" onClick={handleAddItem} size="sm" className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Item
              </Button>
            </div>

            {formData.items.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay items agregados</p>
            ) : (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Nombre del Item</Label>
                        <Input
                          value={item.item_name}
                          onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                          placeholder="ej: Puertas adicionales"
                        />
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Detalles..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label>Precio Unitario</Label>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <Input value={`$${item.total.toFixed(2)}`} disabled className="bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Resumen Financiero</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Contrato Original:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ${formData.original_contract_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Monto del Cambio:</span>
                <span className={`font-bold ${formData.change_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formData.change_amount >= 0 ? '+' : ''}${formData.change_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-bold text-slate-900 dark:text-white">Nuevo Total del Contrato:</span>
                <span className="font-bold text-lg text-[#507DB4]">
                  ${formData.new_contract_amount?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            {/* Real-time Financial Impact */}
            {formData.financial_impact && formData.change_amount !== 0 && (
              <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">Impacto Financiero Proyectado</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">Revenue Impact</p>
                    <p className={`font-bold ${formData.financial_impact.revenue_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formData.financial_impact.revenue_impact >= 0 ? '+' : ''}${formData.financial_impact.revenue_impact?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">Est. Cost Impact</p>
                    <p className={`font-bold ${formData.financial_impact.cost_impact >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      +${formData.financial_impact.cost_impact?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">Est. Profit Impact</p>
                    <p className={`font-bold ${formData.financial_impact.profit_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formData.financial_impact.profit_impact >= 0 ? '+' : ''}${formData.financial_impact.profit_impact?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">Margin Change</p>
                    <p className={`font-bold ${formData.financial_impact.margin_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formData.financial_impact.margin_change >= 0 ? '+' : ''}{formData.financial_impact.margin_change?.toFixed(2) || 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Documentos Adjuntos</h3>
              <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById('fileInput').click()}>
                <Upload className="w-4 h-4 mr-2" />
                Subir Archivo
              </Button>
              <input
                id="fileInput"
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf"
              />
            </div>

            {attachments.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No hay archivos adjuntos</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6">
            <Label>Notas Adicionales</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas internas..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(createPageUrl('ChangeOrders'))}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear Change Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}