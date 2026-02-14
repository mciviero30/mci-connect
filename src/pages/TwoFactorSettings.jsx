import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/shared/PageHeader';
import TwoFactorSetup from '@/components/security/TwoFactorSetup';
import { Shield, CheckCircle2, XCircle, Key, AlertTriangle, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { disable2FA } from '@/functions/disable2FA';

export default function TwoFactorSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [password, setPassword] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: twoFactorConfig, isLoading } = useQuery({
    queryKey: ['2fa-config', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const configs = await base44.entities.TwoFactorAuth.filter({ user_id: user.id });
      return configs.length > 0 ? configs[0] : null;
    },
    enabled: !!user,
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const response = await disable2FA({ password });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['2fa-config']);
      setShowDisableDialog(false);
      setPassword('');
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Disable',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const is2FAEnabled = twoFactorConfig?.enabled === true;
  const backupCodesRemaining = twoFactorConfig?.backup_codes?.length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setShowSetup(false)}
            className="mb-6"
          >
            ← Back to Settings
          </Button>
          <TwoFactorSetup 
            onComplete={() => {
              setShowSetup(false);
              queryClient.invalidateQueries(['2fa-config']);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
          icon={Shield}
        />

        {/* Status Card */}
        <Card className={`border-2 ${
          is2FAEnabled 
            ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' 
            : 'border-slate-200'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  is2FAEnabled 
                    ? 'bg-gradient-to-br from-green-500 to-green-700' 
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-slate-900 dark:text-white">
                    2FA Status
                  </CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {is2FAEnabled ? 'Your account is protected' : 'Not enabled'}
                  </p>
                </div>
              </div>
              <Badge className={is2FAEnabled ? 'bg-green-600 text-white' : 'bg-slate-300 text-slate-700'}>
                {is2FAEnabled ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Enabled
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Disabled
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {is2FAEnabled ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Authenticator App</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Linked and active</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Backup Codes</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {backupCodesRemaining} remaining
                    </p>
                    {backupCodesRemaining < 3 && (
                      <Badge variant="outline" className="mt-2 text-xs bg-amber-50 text-amber-700 border-amber-300">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Low
                      </Badge>
                    )}
                  </div>
                </div>

                {twoFactorConfig?.last_verified_at && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Last verified: {new Date(twoFactorConfig.last_verified_at).toLocaleString()}
                  </div>
                )}

                <Button
                  onClick={() => setShowDisableDialog(true)}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Disable 2FA
                </Button>
              </>
            ) : (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Why enable 2FA?</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                    <li>• Protect against password theft</li>
                    <li>• Secure sensitive company data</li>
                    <li>• Meet compliance requirements</li>
                    <li>• Industry best practice</li>
                  </ul>
                </div>

                <Button
                  onClick={() => setShowSetup(true)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Enable Two-Factor Authentication
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p>1. Install an authenticator app (Google Authenticator, Authy, etc.)</p>
              <p>2. Scan the QR code we provide</p>
              <p>3. Enter the 6-digit code to verify</p>
              <p>4. Save backup codes for emergencies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended Apps</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p>• Google Authenticator (iOS/Android)</p>
              <p>• Authy (iOS/Android/Desktop)</p>
              <p>• Microsoft Authenticator</p>
              <p>• 1Password (with TOTP support)</p>
            </CardContent>
          </Card>
        </div>

        {/* Disable Dialog */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent className="bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">Disable 2FA</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-1">Security Warning</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-400">
                      Disabling 2FA will make your account less secure. Only disable if necessary.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Enter your password to confirm
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => disableMutation.mutate()}
                  disabled={!password || disableMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {disableMutation.isPending ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}