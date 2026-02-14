import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, KeyRound, AlertCircle } from 'lucide-react';
import { verify2FA } from '@/functions/verify2FA';

export default function TwoFactorVerification({ user, onVerified, onCancel }) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await verify2FA({ code, isSetup: false });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        // Store verification in sessionStorage
        sessionStorage.setItem('2fa_verified', 'true');
        sessionStorage.setItem('2fa_verified_at', new Date().toISOString());
        onVerified?.();
      } else {
        setError('Invalid code. Please try again.');
      }
    },
    onError: (error) => {
      setError(error.message || 'Verification failed');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!useBackupCode && code.length !== 6) {
      setError('Code must be 6 digits');
      return;
    }
    
    if (useBackupCode && code.length !== 10) {
      setError('Backup code must be 10 characters');
      return;
    }

    verifyMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader>
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-center text-2xl">Two-Factor Authentication</CardTitle>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            Enter the code from your authenticator app
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!useBackupCode ? (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    6-Digit Code
                  </label>
                  <Input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest font-mono"
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(true);
                    setCode('');
                    setError('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Use backup code instead
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Backup Code
                  </label>
                  <Input
                    type="text"
                    maxLength={10}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="XXXXXXXXXX"
                    className="text-center text-xl tracking-wider font-mono"
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(false);
                    setCode('');
                    setError('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Use authenticator code instead
                </button>
              </>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={!code || verifyMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {verifyMutation.isPending ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}