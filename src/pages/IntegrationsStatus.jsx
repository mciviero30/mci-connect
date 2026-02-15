import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkIntegrationsHealth } from '@/functions/checkIntegrationsHealth';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Link2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  CreditCard,
  Mail,
  FileText,
  Map,
  HardDrive,
  Zap
} from 'lucide-react';
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/advanced/MicroInteractions';

const integrationIcons = {
  'Stripe': CreditCard,
  'SendGrid': Mail,
  'DocuSign': FileText,
  'Google Maps': Map,
  'Google Drive': HardDrive,
  'MCI Connect API': Zap
};

export default function IntegrationsStatus() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['integrations-health'],
    queryFn: () => checkIntegrationsHealth({}),
    refetchOnMount: true,
    staleTime: 30000 // 30 seconds
  });

  const integrations = data?.data?.integrations || [];
  const totalActive = data?.data?.active || 0;
  const totalErrors = data?.data?.errors || 0;
  const checkedAt = data?.data?.checked_at;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>;
      case 'configured':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Configured</Badge>;
      case 'missing_keys':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Missing Keys</Badge>;
      case 'invalid_key':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Invalid Key</Badge>;
      case 'not_connected':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">Not Connected</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Error</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'active') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (status === 'error') return <XCircle className="w-5 h-5 text-red-600" />;
    return <AlertTriangle className="w-5 h-5 text-amber-600" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-[#507DB4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-bold text-red-900 dark:text-red-200">Error checking integrations</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">{error.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <PageHeader
          title="Integrations Status"
          description="Monitor and manage all external service integrations"
          icon={Link2}
          actions={
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
            >
              {isFetching ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          }
        />

        {/* Summary Cards */}
        <FadeInUp delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Integrations</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{integrations.length}</p>
                  </div>
                  <Link2 className="w-10 h-10 text-[#507DB4] opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-1">Active</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">{totalActive}</p>
                  </div>
                  <CheckCircle2 className="w-10 h-10 text-green-600 opacity-40" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-1">Issues</p>
                    <p className="text-3xl font-bold text-red-900 dark:text-red-100">{totalErrors}</p>
                  </div>
                  <XCircle className="w-10 h-10 text-red-600 opacity-40" />
                </div>
              </CardContent>
            </Card>
          </div>
        </FadeInUp>

        {/* Integrations List */}
        <StaggerContainer staggerDelay={0.05}>
          <div className="grid gap-4">
            {integrations.map((integration, idx) => {
              const IntegrationIcon = integrationIcons[integration.name] || Link2;
              
              return (
                <StaggerItem key={idx}>
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-xl shadow-lg shadow-[#507DB4]/30">
                            <IntegrationIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-slate-900 dark:text-white mb-1">
                              {integration.name}
                            </CardTitle>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {integration.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(integration.status)}
                          {getStatusBadge(integration.status)}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {integration.details && (
                      <CardContent>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase">
                            Configuration Details
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(integration.details).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {integration.error && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-700 dark:text-red-300">
                              <span className="font-bold">Error:</span> {integration.error}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </StaggerItem>
              );
            })}
          </div>
        </StaggerContainer>

        {/* Last Check Info */}
        {checkedAt && (
          <FadeInUp delay={0.3}>
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last checked: {new Date(checkedAt).toLocaleString()}
              </p>
            </div>
          </FadeInUp>
        )}
      </div>
    </div>
  );
}