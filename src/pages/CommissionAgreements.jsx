import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  DollarSign,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { canManageAllAgreements, canViewOwnAgreement, canAccessAgreement, canSignAgreement } from '@/components/commission/commissionPermissions';
import AgreementSignatureDialog from '@/components/commission/AgreementSignatureDialog';
import { useLanguage } from '@/components/i18n/LanguageContext';
import useEmployeeProfile from '@/components/hooks/useEmployeeProfile';

export default function CommissionAgreements() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [showSignDialog, setShowSignDialog] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { profile: userProfile } = useEmployeeProfile(currentUser?.email, currentUser);

  // Check permissions
  const canManageAll = canManageAllAgreements(userProfile);
  const canViewOwn = canViewOwnAgreement(userProfile);

  // Fetch agreements based on permissions
  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['commissionAgreements', userProfile?.email],
    queryFn: async () => {
      if (canManageAll) {
        // CEO/Admin see all agreements
        return base44.entities.CommissionAgreement.list('-created_date', 100);
      } else if (canViewOwn) {
        // Manager sees only their own
        return base44.entities.CommissionAgreement.filter({
          employee_email: userProfile.email
        });
      }
      return [];
    },
    enabled: !!userProfile && (canManageAll || canViewOwn),
  });

  // Sign agreement mutation
  const signAgreementMutation = useMutation({
    mutationFn: async ({ agreementId, signature_data }) => {
      return base44.entities.CommissionAgreement.update(agreementId, {
        signed: true,
        signed_date: new Date().toISOString(),
        signed_by_employee: userProfile.email,
        signature_data,
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissionAgreements'] });
      setShowSignDialog(false);
      setSelectedAgreement(null);
    },
  });

  const handleSignAgreement = (agreement) => {
    setSelectedAgreement(agreement);
    setShowSignDialog(true);
  };

  const handleSign = async (signatureData) => {
    if (!selectedAgreement) return;
    await signAgreementMutation.mutateAsync({
      agreementId: selectedAgreement.id,
      signature_data: signatureData.signature_data,
    });
  };

  // Access denied for employees
  if (currentUser && !canManageAll && !canViewOwn) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              You do not have permission to view commission agreements. 
              Only Managers, CEOs, and Administrators can access this section.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading agreements...</p>
        </div>
      </div>
    );
  }

  const pendingAgreements = agreements.filter(a => a.status === 'pending' && !a.signed);
  const activeAgreements = agreements.filter(a => a.status === 'active');
  const suspendedAgreements = agreements.filter(a => a.status === 'suspended');

  const getStatusBadge = (agreement) => {
    if (agreement.status === 'active' && agreement.signed) {
      return <Badge className="bg-green-600 text-white">Active</Badge>;
    }
    if (agreement.status === 'pending') {
      return <Badge className="bg-yellow-600 text-white">Pending Signature</Badge>;
    }
    if (agreement.status === 'suspended') {
      return <Badge className="bg-red-600 text-white">Suspended</Badge>;
    }
    return <Badge variant="outline">{agreement.status}</Badge>;
  };

  const getAgreementTypeName = (type) => {
    if (type === 'manager_variable_comp') return 'Manager Variable Compensation';
    if (type === 'foreman_variable_comp') return 'Foreman Variable Compensation';
    return type;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Commission Agreements</h1>
          <p className="text-slate-600">
            {canManageAll 
              ? 'Manage commission agreements for all employees'
              : 'View and sign your commission agreement'
            }
          </p>
        </div>

        {/* Pending Agreements Alert */}
        {pendingAgreements.length > 0 && !canManageAll && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>Action Required:</strong> You have {pendingAgreements.length} pending agreement(s) that require your signature.
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Agreements */}
        {pendingAgreements.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pending Signature
            </h2>
            <div className="grid gap-4">
              {pendingAgreements.map((agreement) => (
                <Card key={agreement.id} className="border-yellow-200 bg-yellow-50/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          {getAgreementTypeName(agreement.agreement_type)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {agreement.employee_name} ({agreement.employee_email})
                        </CardDescription>
                      </div>
                      {getStatusBadge(agreement)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Base Salary</p>
                        <p className="font-semibold text-lg">${agreement.base_salary?.toLocaleString()}/year</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Commission Rate</p>
                        <p className="font-semibold text-lg">{agreement.commission_rate}%</p>
                      </div>
                    </div>
                    
                    {canSignAgreement(userProfile, agreement) && (
                      <Button 
                        onClick={() => handleSignAgreement(agreement)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Review and Sign Agreement
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Agreements */}
        {activeAgreements.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Active Agreements
            </h2>
            <div className="grid gap-4">
              {activeAgreements.map((agreement) => (
                <Card key={agreement.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          {getAgreementTypeName(agreement.agreement_type)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {agreement.employee_name} ({agreement.employee_email})
                        </CardDescription>
                      </div>
                      {getStatusBadge(agreement)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Base Salary</p>
                        <p className="font-semibold">${agreement.base_salary?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Commission Rate</p>
                        <p className="font-semibold">{agreement.commission_rate}%</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Signed Date</p>
                        <p className="font-semibold">
                          {agreement.signed_date 
                            ? new Date(agreement.signed_date).toLocaleDateString() 
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Effective Date</p>
                        <p className="font-semibold">
                          {agreement.effective_date 
                            ? new Date(agreement.effective_date).toLocaleDateString() 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {agreements.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Agreements Found</h3>
              <p className="text-slate-600">
                {canManageAll 
                  ? 'No commission agreements have been created yet.'
                  : 'You do not have any commission agreements assigned to you.'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Suspended Agreements (Admin only) */}
        {canManageAll && suspendedAgreements.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Suspended Agreements
            </h2>
            <div className="grid gap-4">
              {suspendedAgreements.map((agreement) => (
                <Card key={agreement.id} className="border-red-200 bg-red-50/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {getAgreementTypeName(agreement.agreement_type)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {agreement.employee_name} ({agreement.employee_email})
                        </CardDescription>
                      </div>
                      {getStatusBadge(agreement)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {agreement.suspension_reason && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-900">
                          <strong>Suspension Reason:</strong> {agreement.suspension_reason}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signature Dialog */}
      {selectedAgreement && (
        <AgreementSignatureDialog
          agreement={selectedAgreement}
          open={showSignDialog}
          onClose={() => {
            setShowSignDialog(false);
            setSelectedAgreement(null);
          }}
          onSign={handleSign}
        />
      )}
    </div>
  );
}