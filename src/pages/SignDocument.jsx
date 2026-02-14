import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import SignaturePad from '@/components/client/SignaturePad';
import { FileText, CheckCircle2, XCircle, AlertCircle, Download, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { processDocumentSignature } from '@/functions/processDocumentSignature';

export default function SignDocument() {
  const { toast } = useToast();
  const [signature, setSignature] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [signerName, setSignerName] = useState('');

  // Get signature ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const signatureId = urlParams.get('id');

  // Fetch signature request
  const { data: signatureRequest, isLoading } = useQuery({
    queryKey: ['signature-request', signatureId],
    queryFn: async () => {
      const requests = await base44.entities.DocumentSignature.filter({ id: signatureId });
      if (requests.length === 0) throw new Error('Signature request not found');
      
      // Mark as viewed
      const request = requests[0];
      if (request.status === 'pending') {
        const viewCount = (request.view_count || 0) + 1;
        const auditTrail = request.audit_trail || [];
        auditTrail.push({
          action: 'viewed',
          timestamp: new Date().toISOString(),
          ip_address: 'client'
        });

        await base44.entities.DocumentSignature.update(signatureId, {
          status: 'viewed',
          viewed_at: new Date().toISOString(),
          view_count: viewCount,
          audit_trail: auditTrail
        });
      }
      
      return requests[0];
    },
    enabled: !!signatureId,
  });

  // Auto-fill signer name
  useEffect(() => {
    if (signatureRequest && !signerName) {
      setSignerName(signatureRequest.signer_name || '');
    }
  }, [signatureRequest, signerName]);

  const signMutation = useMutation({
    mutationFn: async () => {
      const response = await processDocumentSignature({
        signature_id: signatureId,
        action: 'sign',
        signature_data_url: signature,
        signer_name: signerName,
        ip_address: 'client'
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Document Signed!',
        description: 'Your signature has been recorded',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const response = await processDocumentSignature({
        signature_id: signatureId,
        action: 'decline',
        decline_reason: declineReason,
        signer_name: signerName,
        ip_address: 'client'
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Document Declined',
        description: 'Your decision has been recorded',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-slate-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!signatureRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Document Not Found</h3>
            <p className="text-slate-600">
              This signature request is invalid or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if expired
  const isExpired = new Date(signatureRequest.expires_at) < new Date();

  // Check if already processed
  const isProcessed = signatureRequest.status === 'signed' || signatureRequest.status === 'declined';

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Request Expired</h3>
            <p className="text-slate-600">
              This signature request expired on {format(new Date(signatureRequest.expires_at), 'MMMM dd, yyyy')}.
            </p>
            <p className="text-sm text-slate-500 mt-4">
              Please contact {signatureRequest.requested_by_name} for a new request.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isProcessed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            {signatureRequest.status === 'signed' ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Already Signed</h3>
                <p className="text-slate-600">
                  You signed this document on {format(new Date(signatureRequest.signed_at), 'MMMM dd, yyyy')}.
                </p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Document Declined</h3>
                <p className="text-slate-600">
                  You declined this document on {format(new Date(signatureRequest.declined_at), 'MMMM dd, yyyy')}.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showDeclineForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle>Decline to Sign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-400">
                Please provide a reason so the team can address your concerns.
              </p>
            </div>

            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Please explain why you're declining..."
              rows={4}
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeclineForm(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => declineMutation.mutate()}
                disabled={!declineReason.trim() || declineMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {declineMutation.isPending ? 'Processing...' : 'Submit Decline'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Document Info */}
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-slate-900 mb-2">
                    {signatureRequest.document_title}
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    Requested by {signatureRequest.requested_by_name} • {' '}
                    {format(new Date(signatureRequest.requested_at), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <Badge className="bg-amber-500 text-white">
                Pending Signature
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {signatureRequest.message_to_signer && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message:</p>
                <p className="text-slate-600 dark:text-slate-400">{signatureRequest.message_to_signer}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Shield className="w-4 h-4" />
              <span>
                Expires on {format(new Date(signatureRequest.expires_at), 'MMMM dd, yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Document Preview (if PDF available) */}
        {signatureRequest.document_pdf_url && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Document Preview</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={signatureRequest.document_pdf_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <iframe
                src={signatureRequest.document_pdf_url}
                className="w-full h-[600px] border border-slate-200 rounded-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Signature Section */}
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle>Sign Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-400">
                By signing, you acknowledge that you have reviewed and agree to the terms outlined in this document.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Your Full Name
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                placeholder="Enter your full name"
              />
            </div>

            <SignaturePad
              label="Your Signature"
              value={signature}
              onChange={setSignature}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowDeclineForm(true)}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 min-h-[48px]"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Decline to Sign
              </Button>
              <Button
                onClick={() => signMutation.mutate()}
                disabled={!signature || !signerName.trim() || signMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 min-h-[48px]"
              >
                {signMutation.isPending ? 'Processing...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Sign Document
                  </>
                )}
              </Button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
              <Shield className="w-3 h-3 inline mr-1" />
              Your signature is legally binding and will be securely stored
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}