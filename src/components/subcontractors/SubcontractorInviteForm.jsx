import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, UserPlus } from "lucide-react";

export default function SubcontractorInviteForm({ onClose }) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState('');

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Generate unique onboarding link
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const appUrl = window.location.origin;
      const generatedLink = `${appUrl}/onboarding/${uniqueId}`;

      // 2. Create user with PENDIENTE_ONBOARDING status
      const newUser = await base44.entities.User.create({
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email,
        role: 'user',
        employment_status: 'PENDIENTE_ONBOARDING',
        w9_completed: false,
        agreement_accepted: false,
        onboarding_link: generatedLink
      });

      // 3. Send invitation email with onboarding link
      const emailBody = language === 'es'
        ? `Hola ${data.first_name},\n\n¡Bienvenido a MCI Connect!\n\nHas sido invitado como subcontratista.\n\nPara completar tu registro:\n1. Abre este enlace: ${generatedLink}\n2. Completa el formulario W-9\n3. Acepta el acuerdo legal\n4. Crea tu contraseña\n\nUna vez completado, tendrás acceso completo a la plataforma.\n\nSaludos,\nMCI Team`
        : `Hello ${data.first_name},\n\nWelcome to MCI Connect!\n\nYou have been invited as a subcontractor.\n\nTo complete your registration:\n1. Open this link: ${generatedLink}\n2. Complete the W-9 form\n3. Accept the legal agreement\n4. Create your password\n\nOnce completed, you'll have full access to the platform.\n\nBest regards,\nMCI Team`;

      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: language === 'es' ? '¡Bienvenido a MCI Connect - Completa tu registro!' : 'Welcome to MCI Connect - Complete your registration!',
        body: emailBody,
        from_name: 'MCI Connect'
      });

      return { newUser, onboardingLink: generatedLink };
    },
    onSuccess: ({ newUser, onboardingLink }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setOnboardingLink(onboardingLink);
      setShowSuccess(true);
    },
    onError: (error) => {
      alert(`❌ ${t('error')}: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    inviteMutation.mutate(formData);
  };

  if (showSuccess) {
    return (
      <div className="space-y-4">
        <Alert className="bg-green-500/10 border-green-500/30">
          <UserPlus className="w-4 h-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <p className="font-bold mb-2">✅ {t('invitationSentSuccessfully')}</p>
            <p className="text-sm">
              {language === 'es' 
                ? `Email de invitación enviado a ${formData.email}`
                : `Invitation email sent to ${formData.email}`}
            </p>
          </AlertDescription>
        </Alert>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-white text-sm font-semibold mb-2">{t('onboardingLink')}:</p>
          <div className="flex gap-2">
            <Input
              value={onboardingLink}
              readOnly
              className="bg-slate-700 border-slate-600 text-white text-xs"
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(onboardingLink);
                alert(t('linkCopiedForSMS'));
              }}
              size="sm"
              className="bg-[#3B9FF3]"
            >
              {t('copy')}
            </Button>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            <strong>{language === 'es' ? '📋 Próximos pasos:' : '📋 Next steps:'}</strong>
          </p>
          <ol className="list-decimal list-inside text-blue-200 text-sm mt-2 space-y-1 ml-2">
            <li>{language === 'es' ? 'El subcontratista recibirá el email' : 'Subcontractor will receive the email'}</li>
            <li>{language === 'es' ? 'Completará el W-9 online' : 'Complete W-9 form online'}</li>
            <li>{language === 'es' ? 'Aceptará el acuerdo legal' : 'Accept legal agreement'}</li>
            <li>{language === 'es' ? 'Aparecerá en la pestaña "REQUIERE REVISIÓN (W-9)"' : 'Will appear in "REQUIRES W-9 REVIEW" tab'}</li>
          </ol>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3]">
            {t('close')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert className="bg-blue-500/10 border-blue-500/30">
        <Mail className="w-4 h-4 text-blue-400" />
        <AlertDescription className="text-blue-300 text-sm">
          {language === 'es'
            ? '📧 Se enviará un email con el enlace de onboarding W-9 automáticamente'
            : '📧 An email with the W-9 onboarding link will be sent automatically'}
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-white">{t('first_name')} *</Label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
            autoCapitalizeInput={true}
            required
          />
        </div>

        <div>
          <Label className="text-white">{t('last_name')} *</Label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
            autoCapitalizeInput={true}
            required
          />
        </div>

        <div className="md:col-span-2">
          <Label className="text-white">{t('email')} *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
        <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={inviteMutation.isPending} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3]">
          {inviteMutation.isPending ? t('sending') : t('inviteSubcontractor')}
        </Button>
      </div>
    </form>
  );
}