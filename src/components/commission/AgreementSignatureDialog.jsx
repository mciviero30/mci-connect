import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AgreementSignatureDialog({ agreement, open, onClose, onSign }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [signature, setSignature] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  const handleSign = async () => {
    if (!acknowledged || !signature.trim()) {
      return;
    }

    setIsSigning(true);
    try {
      await onSign({
        signature_data: signature,
      });
      onClose();
    } catch (error) {
      console.error('Failed to sign agreement:', error);
    } finally {
      setIsSigning(false);
    }
  };

  const getAgreementContent = () => {
    if (agreement.agreement_type === 'manager_variable_comp') {
      return {
        title: 'Manager Variable Compensation Agreement',
        content: `
### Manager Variable Compensation Agreement

**Effective Date:** ${agreement.effective_date || 'Upon signing'}

This agreement establishes the terms of your variable compensation plan as a Manager at MCI Connect.

#### Base Compensation
- **Base Salary:** $${agreement.base_salary?.toLocaleString() || 'N/A'}/year
- **Commission Rate:** ${agreement.commission_rate || 0}% on eligible projects

#### Commission Structure
You will receive ${agreement.commission_rate || 0}% commission on:
- Projects you directly manage and complete
- Projects assigned to your team that meet quality standards
- Calculated on net revenue after materials and labor costs

#### Bonus Structure
${agreement.bonus_structure ? JSON.stringify(agreement.bonus_structure, null, 2) : 'Standard performance bonuses apply'}

#### Terms and Conditions
1. Commissions are paid monthly based on completed projects
2. Projects must meet quality standards and client approval
3. Commission rate subject to review annually
4. This agreement can be modified with 30 days notice
5. All compensation is subject to applicable taxes and withholdings

By signing this agreement, you acknowledge that you have read, understood, and agree to the terms outlined above.
        `
      };
    } else if (agreement.agreement_type === 'foreman_variable_comp') {
      return {
        title: 'Foreman Variable Compensation Agreement',
        content: `
### Foreman Variable Compensation Agreement

**Effective Date:** ${agreement.effective_date || 'Upon signing'}

This agreement establishes the terms of your variable compensation plan as a Foreman at MCI Connect.

#### Base Compensation
- **Base Salary:** $${agreement.base_salary?.toLocaleString() || 'N/A'}/year
- **Commission Rate:** ${agreement.commission_rate || 0}% on eligible projects

#### Commission Structure
You will receive ${agreement.commission_rate || 0}% commission on:
- Projects you directly supervise and complete on time
- Projects that meet or exceed quality standards
- Calculated on net revenue after materials

#### Bonus Structure
${agreement.bonus_structure ? JSON.stringify(agreement.bonus_structure, null, 2) : 'Standard performance bonuses apply'}

#### Terms and Conditions
1. Commissions are paid monthly based on completed projects
2. Projects must be completed within estimated timeline
3. No rework or quality issues reported
4. This agreement can be modified with 30 days notice
5. All compensation is subject to applicable taxes and withholdings

By signing this agreement, you acknowledge that you have read, understood, and agree to the terms outlined above.
        `
      };
    }
    return { title: 'Commission Agreement', content: 'Agreement content not available' };
  };

  const { title, content } = getAgreementContent();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Please review this agreement carefully before signing. This will activate your commission structure.
          </AlertDescription>
        </Alert>

        <ScrollArea className="flex-1 pr-4">
          <div className="prose prose-sm max-w-none">
            {content.split('\n').map((line, i) => {
              if (line.startsWith('###')) {
                return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('###', '').trim()}</h3>;
              } else if (line.startsWith('####')) {
                return <h4 key={i} className="text-base font-semibold mt-3 mb-1">{line.replace('####', '').trim()}</h4>;
              } else if (line.startsWith('**')) {
                return <p key={i} className="font-medium my-1">{line}</p>;
              } else if (line.startsWith('-')) {
                return <li key={i} className="ml-4 my-1">{line.substring(1).trim()}</li>;
              } else if (line.trim()) {
                return <p key={i} className="my-2">{line}</p>;
              }
              return null;
            })}
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="signature">Type your full name to sign</Label>
            <Input
              id="signature"
              placeholder="Full Name"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className="font-medium"
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={setAcknowledged}
            />
            <Label htmlFor="acknowledge" className="text-sm leading-tight cursor-pointer">
              I have read and understood this agreement, and I agree to the terms and conditions outlined above. 
              I understand that this will establish my commission structure effective immediately upon signing.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSigning}>
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={!acknowledged || !signature.trim() || isSigning}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSigning ? (
              'Signing...'
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Sign Agreement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}