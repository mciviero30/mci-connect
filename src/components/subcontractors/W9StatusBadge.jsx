import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function W9StatusBadge({ user }) {
  const { t } = useLanguage();
  
  const w9Complete = user.w9_completed;
  const agreementComplete = user.agreement_accepted;
  const bothComplete = w9Complete && agreementComplete;

  if (bothComplete) {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {t('onboardingCompleted')}
      </Badge>
    );
  }

  if (w9Complete && !agreementComplete) {
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
        <FileText className="w-3 h-3 mr-1" />
        {t('agreementPending')}
      </Badge>
    );
  }

  return (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
      <AlertCircle className="w-3 h-3 mr-1" />
      {t('w9Required')}
    </Badge>
  );
}