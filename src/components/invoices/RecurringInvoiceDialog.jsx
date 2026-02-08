import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import LineItemsEditor from '../documentos/LineItemsEditor';

export default function RecurringInvoiceDialog({ open, onOpenChange, template, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    template_name: '',
    customer_id: '',
    customer_name: '',
    customer_email: '',
    job_id: '',
    job_name: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    payment_terms: 'net_30',
    items: [],
    subtotal: 0,
    tax_rate: 0,
    tax_amount: 0,
    total: 0,
    notes: '',
    terms: '',
    auto_send: false
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('name'),
  });

  useEffect(() => {
    if (template) {
      setFormData({
        template_name: template.template_name,
        customer_id: template.customer_id,
        customer_name: template.customer_name,
        customer_email: template.customer_email,
        job_id: template.job_id || '',
        job_name: template.job_name || '',
        frequency: template.frequency,
        start_date: template.start_date,
        end_date: template.end_date || '',
        payment_terms: template.payment_terms,
        items: template.items || [],
        subtotal: template.subtotal,
        tax_rate: template.tax_rate,
        tax_amount: template.tax_amount,
        total: template.total,
        notes: template.notes || '',
        terms: template.terms || '',
        auto_send: template.auto_send || false
      });
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (template) {
        return base44.entities.RecurringInvoice.update(template.id, data);
      } else {
        return base44.entities.RecurringInvoice.create({
          ...data,
          next_invoice_date: data.start_date,
          invoices_generated: 0,
          status: 'active'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
      onSuccess();
    }
  });

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email
      });
    }
  };

  const handleItemsChange = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = subtotal * (formData.tax_rate / 100);
    const total = subtotal + taxAmount;

    setFormData({
      ...formData,
      items,
      subtotal,
      tax_amount: taxAmount,
      total
    });
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Recurring Template' : 'New Recurring Invoice'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Name */}
          <div>
            <Label>Template Name</Label>
            <Input
              value={formData.template_name}
              onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
              placeholder="e.g., Monthly Maintenance - Publix"
            />
          </div>

          {/* Customer Selection */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Customer</Label>
              <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Job Name (Optional)</Label>
              <Input
                value={formData.job_name}
                onChange={(e) => setFormData({ ...formData, job_name: e.target.value })}
                placeholder="e.g., Monthly Service"
              />
            </div>
          </div>

          {/* Frequency & Dates */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Frequency</Label>
              <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date (Optional)</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <Label>Payment Terms</Label>
            <Select value={formData.payment_terms} onValueChange={(v) => setFormData({ ...formData, payment_terms: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                <SelectItem value="net_15">Net 15</SelectItem>
                <SelectItem value="net_30">Net 30</SelectItem>
                <SelectItem value="net_45">Net 45</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Line Items */}
          <div>
            <Label>Invoice Items</Label>
            <LineItemsEditor
              items={formData.items}
              onChange={handleItemsChange}
            />
          </div>

          {/* Tax */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => {
                  const taxRate = parseFloat(e.target.value) || 0;
                  const taxAmount = formData.subtotal * (taxRate / 100);
                  setFormData({
                    ...formData,
                    tax_rate: taxRate,
                    tax_amount: taxAmount,
                    total: formData.subtotal + taxAmount
                  });
                }}
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal:</span>
                <span className="font-medium">${formData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span>Tax:</span>
                <span className="font-medium">${formData.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-green-600">${formData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Default notes for invoices..."
                rows={3}
              />
            </div>
            <div>
              <Label>Terms</Label>
              <Textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                placeholder="Payment terms and conditions..."
                rows={3}
              />
            </div>
          </div>

          {/* Auto-Send Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Auto-Send Invoices</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Email invoices automatically when generated</p>
            </div>
            <Switch
              checked={formData.auto_send}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_send: checked })}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !formData.template_name || !formData.customer_name}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            >
              {saveMutation.isPending ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}