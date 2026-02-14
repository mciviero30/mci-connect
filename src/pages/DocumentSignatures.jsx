import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/shared/PageHeader';
import { FileSignature, Send, CheckCircle2, Clock, XCircle, Copy, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sendDocumentForSignature } from '@/functions/sendDocumentForSignature';

export default function DocumentSignatures() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('quote');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerName, setSignerName] = useState('');
  const [message, setMessage] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  // Fetch signature requests
  const { data: signatures = [] } = useQuery({
    queryKey: ['document-signatures'],
    queryFn: () => base44.entities.DocumentSignature.list('-requested_at', 100),
    enabled: isAdmin,
  });

  // Fetch quotes for selection
  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes-for-signature'],
    queryFn: () => base44.entities.Quote.filter({ status: 'sent' }),
    enabled: isAdmin && selectedDocType === 'quote',
  });

  // Fetch change orders
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders-for-signature'],
    queryFn: () => base44.entities.ChangeOrder.filter({ approval_status: 'pending_approval' }),
    enabled: isAdmin && selectedDocType === 'change_order',
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await sendDocumentForSignature({
        document_type: selectedDocType,
        document_id: selectedDocId,
        signer_email: signerEmail,
        signer_name: signerName,
        message_to_signer: message
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['document-signatures']);
      setShowSendDialog(false);
      setSelectedDocId('');
      setSignerEmail('');
      setSignerName('');
      setMessage('');
      
      // Copy signature URL
      if (data.signature_url) {
        navigator.clipboard.writeText(data.signature_url);
        toast({
          title: 'Signature Request Sent!',
          description: 'Link copied to clipboard',
          variant: 'success'
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const pendingSignatures = signatures.filter(s => s.status === 'pending' || s.status === 'viewed');
  const completedSignatures = signatures.filter(s => s.status === 'signed');
  const declinedSignatures = signatures.filter(s => s.status === 'declined');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h3>
            <p className="text-slate-600">
              Only administrators can manage document signatures.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="E-Signature Manager"
          description={`${pendingSignatures.length} pending, ${completedSignatures.length} signed`}
          icon={FileSignature}
          actions={
            <Button onClick={() => setShowSendDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4 mr-2" />
              Send for Signature
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-amber-50 border-2 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-sm text-amber-700">Pending</p>
                  <p className="text-3xl font-bold text-amber-900">{pendingSignatures.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-700">Signed</p>
                  <p className="text-3xl font-bold text-green-900">{completedSignatures.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-2 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-red-700">Declined</p>
                  <p className="text-3xl font-bold text-red-900">{declinedSignatures.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <FileSignature className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700">Total</p>
                  <p className="text-3xl font-bold text-blue-900">{signatures.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Signatures */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-bold">Awaiting Signatures</h3>
          </CardHeader>
          <CardContent>
            {pendingSignatures.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No pending signatures</div>
            ) : (
              <div className="space-y-3">
                {pendingSignatures.map((sig) => (
                  <div key={sig.id} className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{sig.document_title}</p>
                        <p className="text-sm text-slate-600 mb-2">{sig.signer_name} ({sig.signer_email})</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>Sent: {format(new Date(sig.requested_at), 'MMM dd, yyyy')}</span>
                          <span>Expires: {format(new Date(sig.expires_at), 'MMM dd')}</span>
                          {sig.view_count > 0 && (
                            <span className="text-blue-600 font-semibold">Viewed {sig.view_count}x</span>
                          )}
                        </div>
                      </div>
                      <Badge className={sig.status === 'viewed' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}>
                        {sig.status === 'viewed' ? 'Opened' : 'Sent'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Signatures */}
        {completedSignatures.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-bold">Recent Signatures</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedSignatures.slice(0, 10).map((sig) => (
                  <div key={sig.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-slate-900">{sig.document_title}</p>
                        <p className="text-xs text-slate-500">
                          {sig.signer_name} • {format(new Date(sig.signed_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Send Dialog */}
        <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
          <DialogContent className="bg-white dark:bg-slate-800 max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Document for Signature</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Document Type</label>
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="change_order">Change Order</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Document</label>
                <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a document..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedDocType === 'quote' && quotes.map(q => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.quote_number} - {q.customer_name}
                      </SelectItem>
                    ))}
                    {selectedDocType === 'change_order' && changeOrders.map(co => (
                      <SelectItem key={co.id} value={co.id}>
                        {co.change_order_number} - {co.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Signer Name</label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Signer Email</label>
                <Input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message (Optional)</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please review and sign this document..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => sendMutation.mutate()}
                  disabled={!selectedDocId || !signerEmail || sendMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {sendMutation.isPending ? 'Sending...' : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send for Signature
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}