import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, RefreshCw, Trash2, CheckCircle, AlertCircle, XCircle, Plus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function BankSync() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linkToken, setLinkToken] = useState(null);
  const [plaidHandler, setPlaidHandler] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bankAccounts = [], isLoading } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => base44.entities.BankAccount.list(),
    initialData: [],
  });

  // Create link token mutation
  const createLinkTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('plaid-create-link-token', {});
      return response.data;
    },
    onSuccess: (data) => {
      setLinkToken(data.link_token);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initialize bank connection',
        variant: 'destructive',
      });
    },
  });

  // Exchange token mutation
  const exchangeTokenMutation = useMutation({
    mutationFn: async (publicToken) => {
      const response = await base44.functions.invoke('plaid-exchange-token', { public_token: publicToken });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['bankAccounts']);
      toast({
        title: language === 'es' ? '✓ Cuenta Conectada' : '✓ Account Connected',
        description: data.message,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect account',
        variant: 'destructive',
      });
    },
  });

  // Sync transactions mutation
  const syncTransactionsMutation = useMutation({
    mutationFn: async (accountId) => {
      const response = await base44.functions.invoke('plaid-sync-transactions', { account_id: accountId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['bankAccounts']);
      queryClient.invalidateQueries(['transactions']);
      toast({
        title: language === 'es' ? '✓ Sincronización Completa' : '✓ Sync Complete',
        description: data.message,
        variant: 'success',
      });
    },
    onError: (error) => {
      if (error.message?.includes('login required')) {
        toast({
          title: language === 'es' ? 'Reconexión Requerida' : 'Reconnection Required',
          description: language === 'es' 
            ? 'Por favor reconecta tu cuenta bancaria' 
            : 'Please reconnect your bank account',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to sync transactions',
          variant: 'destructive',
        });
      }
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: (accountId) => base44.entities.BankAccount.delete(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries(['bankAccounts']);
      toast({
        title: language === 'es' ? 'Cuenta Eliminada' : 'Account Deleted',
        variant: 'success',
      });
    },
  });

  // Load Plaid Link script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize Plaid Link when token is available
  useEffect(() => {
    if (linkToken && window.Plaid) {
      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: (public_token) => {
          exchangeTokenMutation.mutate(public_token);
        },
        onExit: (err) => {
          if (err) {
            console.error('Plaid Link error:', err);
          }
        },
      });
      setPlaidHandler(handler);
    }
  }, [linkToken]);

  const handleConnectBank = () => {
    if (plaidHandler) {
      plaidHandler.open();
    } else {
      createLinkTokenMutation.mutate();
    }
  };

  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Active' },
    disconnected: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Disconnected' },
    error: { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Error' },
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">
              {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
            </h2>
            <p className="text-red-700">
              {language === 'es' 
                ? 'Solo administradores pueden gestionar conexiones bancarias.'
                : 'Only administrators can manage bank connections.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Sincronización Bancaria' : 'Bank Sync'}
          description={language === 'es' 
            ? 'Conecta tus cuentas bancarias para sincronizar transacciones automáticamente'
            : 'Connect your bank accounts to sync transactions automatically'}
          icon={Building2}
        />

        <div className="mb-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-600">
              {language === 'es' 
                ? 'Sincronización segura mediante Plaid (Sandbox para pruebas)'
                : 'Secure sync via Plaid (Sandbox for testing)'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'es' 
                ? 'Use user_good / pass_good para pruebas'
                : 'Use user_good / pass_good for testing'}
            </p>
          </div>
          <Button
            onClick={handleConnectBank}
            disabled={createLinkTokenMutation.isPending}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {createLinkTokenMutation.isPending 
              ? (language === 'es' ? 'Cargando...' : 'Loading...') 
              : (language === 'es' ? 'Conectar Cuenta' : 'Connect Account')}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : bankAccounts.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {language === 'es' ? 'No hay cuentas conectadas' : 'No accounts connected'}
              </h3>
              <p className="text-slate-600 mb-6">
                {language === 'es' 
                  ? 'Conecta tu primera cuenta bancaria para comenzar'
                  : 'Connect your first bank account to get started'}
              </p>
              <Button onClick={handleConnectBank} disabled={createLinkTokenMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Conectar Cuenta Bancaria' : 'Connect Bank Account'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {bankAccounts.map((account) => {
              const config = statusConfig[account.status] || statusConfig.active;
              const StatusIcon = config.icon;

              return (
                <Card key={account.id} className="shadow-lg border-slate-200">
                  <CardHeader className="border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                          {account.institution_name?.[0] || 'B'}
                        </div>
                        <div>
                          <CardTitle className="text-slate-900 mb-1">{account.account_name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span>{account.institution_name}</span>
                            <span>•</span>
                            <span>****{account.account_mask}</span>
                            <span>•</span>
                            <Badge variant="outline" className="capitalize">
                              {account.account_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${config.bgColor} ${config.color} border-0`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">
                          {language === 'es' ? 'Balance Actual' : 'Current Balance'}
                        </p>
                        <p className="text-2xl font-bold text-slate-900">
                          ${(account.current_balance || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-1">
                          {language === 'es' ? 'Balance Disponible' : 'Available Balance'}
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          ${(account.available_balance || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-1">
                          {language === 'es' ? 'Última Sincronización' : 'Last Synced'}
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {account.last_sync 
                            ? format(new Date(account.last_sync), 'MMM d, yyyy HH:mm')
                            : language === 'es' ? 'Nunca' : 'Never'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => syncTransactionsMutation.mutate(account.id)}
                        disabled={syncTransactionsMutation.isPending || account.status !== 'active'}
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${syncTransactionsMutation.isPending ? 'animate-spin' : ''}`} />
                        {syncTransactionsMutation.isPending 
                          ? (language === 'es' ? 'Sincronizando...' : 'Syncing...') 
                          : (language === 'es' ? 'Sincronizar' : 'Sync Now')}
                      </Button>
                      
                      {account.status === 'disconnected' && (
                        <Button
                          onClick={handleConnectBank}
                          size="sm"
                          variant="outline"
                          className="border-blue-500 text-blue-600 hover:bg-blue-50"
                        >
                          {language === 'es' ? 'Reconectar' : 'Reconnect'}
                        </Button>
                      )}

                      <Button
                        onClick={() => {
                          if (confirm(language === 'es' 
                            ? '¿Eliminar esta cuenta? Las transacciones existentes no se eliminarán.'
                            : 'Delete this account? Existing transactions will not be deleted.')) {
                            deleteAccountMutation.mutate(account.id);
                          }
                        }}
                        disabled={deleteAccountMutation.isPending}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Eliminar' : 'Delete'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}