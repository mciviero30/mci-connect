import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthorizationSelector({ 
  customerId, 
  customerName,
  value, 
  onChange, 
  language = 'en',
  required = true 
}) {
  const queryClient = useQueryClient();
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickAuthData, setQuickAuthData] = useState({
    authorization_type: 'fixed_price',
    approval_source: 'email',
    authorization_number: '',
    approved_amount: 0,
    approved_at: new Date().toISOString().split('T')[0],
    verification_notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Load authorizations for selected customer
  const { data: authorizations = [] } = useQuery({
    queryKey: ['customer-authorizations', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      return await base44.entities.WorkAuthorization.filter({ 
        customer_id: customerId,
        status: 'approved'
      }, '-created_date');
    },
    enabled: !!customerId,
    staleTime: 60000
  });

  const createAuthMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkAuthorization.create({
      ...data,
      customer_id: customerId,
      customer_name: customerName,
      verified_by_user_id: user.id,
      verified_by_email: user.email,
      verified_by_name: user.full_name,
      approved_at: new Date(data.approved_at).toISOString()
    }),
    onSuccess: (newAuth) => {
      queryClient.invalidateQueries({ queryKey: ['customer-authorizations', customerId] });
      onChange(newAuth.id);
      setShowQuickCreate(false);
      resetQuickForm();
      toast.success(language === 'es' ? 'Autorización creada' : 'Authorization created');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const resetQuickForm = () => {
    setQuickAuthData({
      authorization_type: 'fixed_price',
      approval_source: 'email',
      authorization_number: '',
      approved_amount: 0,
      approved_at: new Date().toISOString().split('T')[0],
      verification_notes: ''
    });
  };

  const handleQuickCreate = (e) => {
    e.preventDefault();
    
    if (!quickAuthData.authorization_number) {
      toast.error(language === 'es' ? 'Número de autorización requerido' : 'Authorization number required');
      return;
    }

    createAuthMutation.mutate(quickAuthData);
  };

  if (!customerId) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-semibold">
            {language === 'es' ? 'Selecciona un cliente primero' : 'Select a customer first'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
        <Shield className="w-4 h-4 text-green-600" />
        {language === 'es' ? 'Autorización de Trabajo' : 'Work Authorization'}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
            <SelectValue placeholder={
              authorizations.length === 0
                ? (language === 'es' ? 'Sin autorizaciones - crear una' : 'No authorizations - create one')
                : (language === 'es' ? 'Seleccionar autorización' : 'Select authorization')
            } />
          </SelectTrigger>
          <SelectContent>
            {authorizations.map(auth => (
              <SelectItem key={auth.id} value={auth.id}>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {auth.authorization_type === 'fixed_price' ? 'Fixed' : 'T&M'}
                  </Badge>
                  {auth.authorization_number}
                  {auth.approved_amount > 0 && (
                    <span className="text-slate-500 text-xs">
                      - ${auth.approved_amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          onClick={() => setShowQuickCreate(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          {language === 'es' ? 'Nueva' : 'New'}
        </Button>
      </div>

      {value && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
          <p className="text-xs text-green-800 dark:text-green-400 font-semibold flex items-center gap-1">
            <Shield className="w-3 h-3" />
            {language === 'es' ? 'Autorización vinculada' : 'Authorization linked'}
          </p>
        </div>
      )}

      {/* Quick Create Authorization Dialog */}
      <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              {language === 'es' ? 'Crear Autorización' : 'Create Authorization'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickCreate} className="space-y-4 pt-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-400 font-semibold">
                {language === 'es' ? 'Cliente:' : 'Customer:'} {customerName}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>{language === 'es' ? 'Tipo' : 'Type'}</Label>
                <Select 
                  value={quickAuthData.authorization_type} 
                  onValueChange={(val) => setQuickAuthData({...quickAuthData, authorization_type: val})}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_price">Fixed Price</SelectItem>
                    <SelectItem value="time_materials">T&M</SelectItem>
                    <SelectItem value="not_to_exceed">Not to Exceed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{language === 'es' ? 'Fuente' : 'Source'}</Label>
                <Select 
                  value={quickAuthData.approval_source} 
                  onValueChange={(val) => setQuickAuthData({...quickAuthData, approval_source: val})}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="po">PO</SelectItem>
                    <SelectItem value="verbal">Verbal</SelectItem>
                    <SelectItem value="signed_quote">Signed Quote</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>
                {language === 'es' ? 'Número/Referencia' : 'Number/Reference'} *
              </Label>
              <Input
                value={quickAuthData.authorization_number}
                onChange={(e) => setQuickAuthData({...quickAuthData, authorization_number: e.target.value})}
                placeholder="PO-2026-001"
                className="mt-1.5"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>{language === 'es' ? 'Monto' : 'Amount'}</Label>
                <Input
                  type="number"
                  value={quickAuthData.approved_amount}
                  onChange={(e) => setQuickAuthData({...quickAuthData, approved_amount: parseFloat(e.target.value) || 0})}
                  placeholder="25000"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>{language === 'es' ? 'Fecha' : 'Date'}</Label>
                <Input
                  type="date"
                  value={quickAuthData.approved_at}
                  onChange={(e) => setQuickAuthData({...quickAuthData, approved_at: e.target.value})}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label>{language === 'es' ? 'Notas' : 'Notes'}</Label>
              <Textarea
                value={quickAuthData.verification_notes}
                onChange={(e) => setQuickAuthData({...quickAuthData, verification_notes: e.target.value})}
                placeholder="How was approval verified..."
                className="mt-1.5 h-20"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowQuickCreate(false)}>
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button 
                type="submit" 
                disabled={createAuthMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-500"
              >
                {createAuthMutation.isPending 
                  ? (language === 'es' ? 'Creando...' : 'Creating...') 
                  : (language === 'es' ? 'Crear' : 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}