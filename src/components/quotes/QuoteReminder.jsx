import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Bell, Send, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function QuoteReminder({ quote }) {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  const defaultMessage = language === 'es'
    ? `Estimado/a ${quote.customer_name},\n\nEsperamos que se encuentre bien. Le escribimos para dar seguimiento a nuestro estimado ${quote.quote_number} enviado el ${format(new Date(quote.quote_date), 'd MMMM yyyy', { locale: es })}.\n\nEl estimado tiene un valor de $${quote.total?.toLocaleString()} y está válido hasta ${format(new Date(quote.valid_until), 'd MMMM yyyy', { locale: es })}.\n\nSi tiene alguna pregunta o desea proceder, no dude en contactarnos.\n\nSaludos cordiales`
    : `Dear ${quote.customer_name},\n\nWe hope this message finds you well. We're following up on our quote ${quote.quote_number} sent on ${format(new Date(quote.quote_date), 'MMMM d, yyyy')}.\n\nThe quote totals $${quote.total?.toLocaleString()} and is valid until ${format(new Date(quote.valid_until), 'MMMM d, yyyy')}.\n\nIf you have any questions or would like to proceed, please don't hesitate to contact us.\n\nBest regards`;

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      // Send email
      await base44.integrations.Core.SendEmail({
        to: quote.customer_email,
        subject: language === 'es' 
          ? `Recordatorio: Estimado ${quote.quote_number}` 
          : `Reminder: Quote ${quote.quote_number}`,
        body: customMessage || defaultMessage
      });

      // Update quote with reminder info
      await base44.entities.Quote.update(quote.id, {
        last_reminder_sent: new Date().toISOString(),
        reminder_count: (quote.reminder_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(language === 'es' ? 'Recordatorio enviado' : 'Reminder sent');
      setOpen(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  if (!quote.customer_email) {
    return (
      <Button variant="outline" size="sm" disabled className="text-slate-400">
        <Bell className="w-4 h-4 mr-2" />
        {language === 'es' ? 'Sin email' : 'No email'}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50">
          <Bell className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Recordatorio' : 'Reminder'}
          {quote.reminder_count > 0 && (
            <span className="ml-1 text-xs bg-amber-200 text-amber-800 rounded-full px-1.5">
              {quote.reminder_count}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            {language === 'es' ? 'Enviar Recordatorio' : 'Send Reminder'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Previous reminders info */}
          {quote.reminder_count > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                {language === 'es' 
                  ? `${quote.reminder_count} recordatorio(s) enviado(s). Último: ${format(new Date(quote.last_reminder_sent), 'd MMM yyyy HH:mm', { locale: es })}`
                  : `${quote.reminder_count} reminder(s) sent. Last: ${format(new Date(quote.last_reminder_sent), 'MMM d, yyyy HH:mm')}`}
              </span>
            </div>
          )}

          <div>
            <Label className="text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Para' : 'To'}: {quote.customer_email}
            </Label>
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Mensaje' : 'Message'}
            </Label>
            <Textarea
              value={customMessage || defaultMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="mt-1 h-48 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              onClick={() => sendReminderMutation.mutate()}
              disabled={sendReminderMutation.isPending}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendReminderMutation.isPending 
                ? (language === 'es' ? 'Enviando...' : 'Sending...') 
                : (language === 'es' ? 'Enviar Recordatorio' : 'Send Reminder')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}