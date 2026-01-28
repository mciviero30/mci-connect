import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, FileCheck, CheckCircle, XCircle, Calendar, User, FileText, AlertCircle, Briefcase } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function WorkAuthorizations() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedAuth, setSelectedAuth] = useState(null);
  const [jobFormData, setJobFormData] = useState({
    name: '',
    description: '',
    address: '',
    team_id: '',
    status: 'active'
  });
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    authorization_type: 'fixed_price',
    approval_source: 'email',
    authorization_number: '',
    approved_amount: 0,
    approved_at: new Date().toISOString().split('T')[0],
    verification_notes: '',
    external_reference: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: authorizations = [], isLoading } = useQuery({
    queryKey: ['work-authorizations'],
    queryFn: () => base44.entities.WorkAuthorization.list('-created_date'),
    staleTime: 60000
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('first_name'),
    staleTime: 300000
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    staleTime: 300000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkAuthorization.create({
      ...data,
      verified_by_user_id: user.id,
      verified_by_email: user.email,
      verified_by_name: user.full_name,
      approved_at: new Date(data.approved_at).toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-authorizations'] });
      setShowForm(false);
      resetForm();
      toast.success(language === 'es' ? 'Autorización creada' : 'Authorization created');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkAuthorization.update(id, {
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: user.email,
      revoked_reason: 'Manual revocation'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-authorizations'] });
      toast.success(language === 'es' ? 'Autorización revocada' : 'Authorization revoked');
    }
  });

  const createJobMutation = useMutation({
    mutationFn: async (data) => {
      const { generateJobNumber } = await import('@/functions/generateJobNumber');
      const jobNumberResponse = await generateJobNumber({});
      const jobNumber = jobNumberResponse.data.job_number;

      return await base44.entities.Job.create({
        ...data,
        job_number: jobNumber
      });
    },
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setShowJobForm(false);
      setSelectedAuth(null);
      resetJobForm();
      toast.success(language === 'es' ? 'Job creado exitosamente' : 'Job created successfully');
      navigate(createPageUrl('Trabajos'));
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      customer_id: '',
      customer_name: '',
      authorization_type: 'fixed_price',
      approval_source: 'email',
      authorization_number: '',
      approved_amount: 0,
      approved_at: new Date().toISOString().split('T')[0],
      verification_notes: '',
      external_reference: ''
    });
  };

  const resetJobForm = () => {
    setJobFormData({
      name: '',
      description: '',
      address: '',
      team_id: '',
      status: 'active'
    });
  };

  const handleCreateJobFromAuth = (auth) => {
    setSelectedAuth(auth);
    setJobFormData({
      name: '',
      description: '',
      address: '',
      team_id: '',
      status: 'active'
    });
    setShowJobForm(true);
  };

  const handleJobSubmit = (e) => {
    e.preventDefault();
    
    if (!jobFormData.name) {
      toast.error(language === 'es' ? 'Nombre del trabajo requerido' : 'Job name required');
      return;
    }

    createJobMutation.mutate({
      name: jobFormData.name,
      description: jobFormData.description,
      address: jobFormData.address,
      customer_id: selectedAuth.customer_id,
      customer_name: selectedAuth.customer_name,
      authorization_id: selectedAuth.id,
      billing_type: selectedAuth.authorization_type,
      contract_amount: selectedAuth.approved_amount || 0,
      team_id: jobFormData.team_id,
      team_name: teams.find(t => t.id === jobFormData.team_id)?.team_name || '',
      status: jobFormData.status
    });
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      const displayName = customer.first_name && customer.last_name 
        ? `${customer.first_name} ${customer.last_name}`
        : customer.company || customer.email;
      
      setFormData({
        ...formData,
        customer_id: customerId,
        customer_name: displayName
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.authorization_number) {
      toast.error(language === 'es' ? 'Complete los campos requeridos' : 'Complete required fields');
      return;
    }

    createMutation.mutate(formData);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-6">
        <PageHeader
          title={language === 'es' ? 'Autorizaciones de Trabajo' : 'Work Authorizations'}
          description={language === 'es' 
            ? 'Registro de aprobaciones de clientes (PO, email, contratos)'
            : 'Client approval records (PO, email, contracts)'}
          icon={Shield}
          actions={
            isAdmin && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                {language === 'es' ? 'Nueva Autorización' : 'New Authorization'}
              </Button>
            )
          }
        />

        <div className="grid gap-4">
          {authorizations.map(auth => (
            <Card key={auth.id} className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      auth.status === 'approved' 
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {auth.status === 'approved' ? (
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-900 dark:text-white">
                        {auth.customer_name}
                      </CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {auth.authorization_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={
                      auth.status === 'approved'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-red-100 text-red-800 border-red-300'
                    }>
                      {auth.status}
                    </Badge>
                    {auth.backfill_auto_generated && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                        Auto-generated ({auth.backfill_confidence}%)
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Type</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {auth.authorization_type === 'fixed_price' ? 'Fixed Price' : 'T&M'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Source</p>
                    <p className="font-semibold text-slate-900 dark:text-white capitalize">
                      {auth.approval_source.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Amount</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      ${(auth.approved_amount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {auth.verification_notes && (
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400">{auth.verification_notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {auth.verified_by_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(auth.approved_at).toLocaleDateString()}
                  </div>
                </div>

                {isAdmin && auth.status === 'approved' && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleCreateJobFromAuth(auth)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Crear Job' : 'Create Job'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(language === 'es' 
                          ? '¿Revocar esta autorización? Los Jobs asociados quedarán bloqueados.'
                          : 'Revoke this authorization? Associated Jobs will be blocked.')) {
                          revokeMutation.mutate(auth.id);
                        }
                      }}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Revocar' : 'Revoke'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {authorizations.length === 0 && !isLoading && (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {language === 'es' ? 'No hay autorizaciones' : 'No authorizations'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {language === 'es' 
                  ? 'Crea una autorización para habilitar trabajos'
                  : 'Create an authorization to enable jobs'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create Job from Authorization Dialog */}
        <Dialog open={showJobForm} onOpenChange={setShowJobForm}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {language === 'es' ? 'Crear Job desde Autorización' : 'Create Job from Authorization'}
              </DialogTitle>
            </DialogHeader>
            {selectedAuth && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-semibold">{selectedAuth.customer_name}</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {selectedAuth.authorization_number} • {selectedAuth.authorization_type}
                </p>
              </div>
            )}
            <form onSubmit={handleJobSubmit} className="space-y-4">
              <div>
                <Label>{language === 'es' ? 'Nombre del Job' : 'Job Name'} *</Label>
                <Input
                  value={jobFormData.name}
                  onChange={(e) => setJobFormData({...jobFormData, name: e.target.value})}
                  placeholder="Project name..."
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label>{language === 'es' ? 'Descripción' : 'Description'}</Label>
                <Textarea
                  value={jobFormData.description}
                  onChange={(e) => setJobFormData({...jobFormData, description: e.target.value})}
                  placeholder="Project scope..."
                  className="mt-1.5 h-24"
                />
              </div>

              <div>
                <Label>{language === 'es' ? 'Dirección' : 'Address'}</Label>
                <Input
                  value={jobFormData.address}
                  onChange={(e) => setJobFormData({...jobFormData, address: e.target.value})}
                  placeholder="Project address..."
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>{language === 'es' ? 'Equipo' : 'Team'}</Label>
                <Select 
                  value={jobFormData.team_id} 
                  onValueChange={(val) => setJobFormData({...jobFormData, team_id: val})}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={language === 'es' ? 'Seleccionar equipo' : 'Select team'} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.team_name} - {team.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowJobForm(false)}>
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createJobMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {createJobMutation.isPending 
                    ? (language === 'es' ? 'Creando...' : 'Creating...') 
                    : (language === 'es' ? 'Crear Job' : 'Create Job')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Authorization Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {language === 'es' ? 'Nueva Autorización de Trabajo' : 'New Work Authorization'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div>
                <Label>{language === 'es' ? 'Cliente' : 'Customer'} *</Label>
                <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={language === 'es' ? 'Seleccionar cliente' : 'Select customer'} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} {c.company && `- ${c.company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'es' ? 'Tipo' : 'Type'} *</Label>
                  <Select 
                    value={formData.authorization_type} 
                    onValueChange={(val) => setFormData({...formData, authorization_type: val})}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_price">Fixed Price</SelectItem>
                      <SelectItem value="time_materials">Time & Materials</SelectItem>
                      <SelectItem value="not_to_exceed">Not to Exceed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{language === 'es' ? 'Fuente' : 'Source'} *</Label>
                  <Select 
                    value={formData.approval_source} 
                    onValueChange={(val) => setFormData({...formData, approval_source: val})}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email Approval</SelectItem>
                      <SelectItem value="po">Purchase Order</SelectItem>
                      <SelectItem value="verbal">Verbal Authorization</SelectItem>
                      <SelectItem value="signed_quote">Signed Quote</SelectItem>
                      <SelectItem value="contract">Signed Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'es' ? 'Número de Autorización' : 'Authorization Number'} *</Label>
                  <Input
                    value={formData.authorization_number}
                    onChange={(e) => setFormData({...formData, authorization_number: e.target.value})}
                    placeholder="PO-12345 or Email-Ref"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label>{language === 'es' ? 'Monto Aprobado' : 'Approved Amount'}</Label>
                  <Input
                    type="number"
                    value={formData.approved_amount}
                    onChange={(e) => setFormData({...formData, approved_amount: parseFloat(e.target.value) || 0})}
                    placeholder="25000"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label>{language === 'es' ? 'Fecha de Aprobación' : 'Approval Date'} *</Label>
                <Input
                  type="date"
                  value={formData.approved_at}
                  onChange={(e) => setFormData({...formData, approved_at: e.target.value})}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>{language === 'es' ? 'Referencia Externa' : 'External Reference'}</Label>
                <Input
                  value={formData.external_reference}
                  onChange={(e) => setFormData({...formData, external_reference: e.target.value})}
                  placeholder="Email subject, document URL, etc."
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>{language === 'es' ? 'Notas de Verificación' : 'Verification Notes'}</Label>
                <Textarea
                  value={formData.verification_notes}
                  onChange={(e) => setFormData({...formData, verification_notes: e.target.value})}
                  placeholder="Internal notes about how approval was verified..."
                  className="mt-1.5 h-24"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {createMutation.isPending 
                    ? (language === 'es' ? 'Creando...' : 'Creating...') 
                    : (language === 'es' ? 'Crear Autorización' : 'Create Authorization')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}