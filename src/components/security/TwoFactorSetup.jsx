import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Shield, Smartphone, Copy, Check, AlertTriangle, Download } from 'lucide-react';
import { setup2FA } from '@/functions/setup2FA';
import { verify2FA } from '@/functions/verify2FA';

export default function TwoFactorSetup({ onComplete }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1: Initial, 2: QR + Backup Codes, 3: Verify
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [backupsSaved, setBackupsSaved] = useState(false);

  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await setup2FA({});
      return response.data;
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep(2);
    },
    onError: (error) => {
      toast({
        title: 'Setup Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await verify2FA({ code: verificationCode, isSetup: true });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        toast({
          title: '2FA Enabled!',
          description: 'Two-factor authentication is now active',
          variant: 'success'
        });
        onComplete?.();
      }
    },
    onError: (error) => {
      toast({
        title: 'Invalid Code',
        description: 'The code you entered is incorrect',
        variant: 'destructive'
      });
    }
  });

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Secret Copied',
      variant: 'success'
    });
  };

  const downloadBackupCodes = () => {
    const text = `MCI Connect - Backup Codes\n\nSave these codes in a secure location.\n\n${backupCodes.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mci-connect-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    setBackupsSaved(true);
    toast({
      title: 'Backup Codes Downloaded',
      variant: 'success'
    });
  };

  if (step === 1) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-600" />
            Enable Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Enhanced Security</h4>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              2FA adds an extra layer of protection by requiring a code from your phone in addition to your password.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 dark:text-white">What you'll need:</h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                An authenticator app (Google Authenticator, Authy, etc.)
              </li>
              <li className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                A secure place to save backup codes
              </li>
            </ul>
          </div>

          <Button 
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {setupMutation.isPending ? 'Setting up...' : 'Begin Setup'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* QR Code Section */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700">
                <img src={qrCode} alt="2FA QR Code" className="w-full max-w-xs mx-auto" />
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Or enter manually:</p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded font-mono text-sm">
                    {secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copySecret}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Backup Codes Section */}
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-1">Save Backup Codes</h4>
                    <p className="text-xs text-amber-800 dark:text-amber-400">
                      Store these codes securely. Use them if you lose your phone.
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded p-3 font-mono text-sm space-y-1 max-h-48 overflow-y-auto">
                  {backupCodes.map((code, idx) => (
                    <div key={idx} className="text-slate-700 dark:text-slate-300">
                      {idx + 1}. {code}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={downloadBackupCodes}
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {backupsSaved ? 'Downloaded ✓' : 'Download Codes'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => setStep(3)}
              disabled={!backupsSaved}
              className="bg-blue-600 hover:bg-blue-700"
            >
              I've Saved My Backup Codes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 3) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Verify Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter the 6-digit code from your authenticator app to complete setup.
          </p>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Verification Code
            </label>
            <Input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              onClick={() => verifyMutation.mutate()}
              disabled={verificationCode.length !== 6 || verifyMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Enable 2FA'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}