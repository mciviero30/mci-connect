import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { 
  X, Eye, Edit, FileCheck, Mail, CalendarDays, 
  DollarSign, Clock, AlertTriangle, User 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  converted_to_invoice: "bg-purple-100 text-purple-700"
};

export default function QuotePreviewModal({ quote, open, onClose, onConvert, onSend }) {
  const { t, language } = useLanguage();

  if (!quote) return null;

  const isExpired = new Date(quote.valid_until) < new Date();
  const daysUntilExpiry = Math.ceil((new Date(quote.valid_until) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {quote.quote_number}
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">{quote.customer_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[quote.status]}>
                {t(quote.status)}
              </Badge>
              {isExpired && quote.status === 'sent' && (
                <Badge className="bg-red-100 text-red-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {language === 'es' ? 'Vencido' : 'Expired'}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
              <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${quote.total?.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">{t('total')}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
              <CalendarDays className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {format(new Date(quote.quote_date), 'MMM d', { locale: language === 'es' ? es : undefined })}
              </p>
              <p className="text-xs text-slate-500">{t('quoteDate')}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
              <Clock className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <p className={`text-lg font-semibold ${isExpired ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                {isExpired ? (language === 'es' ? 'Vencido' : 'Expired') : `${daysUntilExpiry}d`}
              </p>
              <p className="text-xs text-slate-500">{t('validUntil')}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">{t('jobName')}</span>
              <span className="font-medium text-slate-900 dark:text-white">{quote.job_name}</span>
            </div>
            {quote.job_address && (
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{t('jobAddress')}</span>
                <span className="font-medium text-slate-900 dark:text-white text-right max-w-xs">{quote.job_address}</span>
              </div>
            )}
            {quote.team_name && (
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{language === 'es' ? 'Equipo' : 'Team'}</span>
                <span className="font-medium text-slate-900 dark:text-white">{quote.team_name}</span>
              </div>
            )}
            {quote.assigned_to_name && (
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{language === 'es' ? 'Responsable' : 'Assigned To'}</span>
                <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {quote.assigned_to_name}
                </span>
              </div>
            )}
          </div>

          {/* Items Summary */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
              {t('items')} ({quote.items?.length || 0})
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto">
              {quote.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between py-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-xs">
                    {item.quantity} x {item.description || item.item_name}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    ${item.total?.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">{t('subtotal')}</span>
              <span className="text-slate-900 dark:text-white">${quote.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400">{t('tax')} ({quote.tax_rate}%)</span>
              <span className="text-slate-900 dark:text-white">${quote.tax_amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-600 pt-2">
              <span className="text-slate-900 dark:text-white">{t('total')}</span>
              <span className="text-cyan-600">${quote.total?.toFixed(2)}</span>
            </div>
          </div>

          {/* Profit Margin if available */}
          {quote.profit_margin && (
            <div className="flex justify-between py-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-3">
              <span className="text-green-700 dark:text-green-400">{language === 'es' ? 'Margen de Ganancia' : 'Profit Margin'}</span>
              <span className="font-bold text-green-700 dark:text-green-400">{quote.profit_margin.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Link to={createPageUrl(`VerEstimado?id=${quote.id}`)} className="flex-1">
            <Button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700">
              <Eye className="w-4 h-4 mr-2" />
              {t('view')}
            </Button>
          </Link>
          {quote.status === 'draft' && (
            <Link to={createPageUrl(`EditarEstimado?id=${quote.id}`)} className="flex-1">
              <Button className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700">
                <Edit className="w-4 h-4 mr-2" />
                {t('edit')}
              </Button>
            </Link>
          )}
          {quote.status === 'draft' && onSend && (
            <Button 
              onClick={() => onSend(quote)} 
              className="flex-1 bg-cyan-100 hover:bg-cyan-200 text-cyan-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              {t('send')}
            </Button>
          )}
          {quote.status !== 'converted_to_invoice' && onConvert && (
            <Button 
              onClick={() => onConvert(quote)} 
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              {t('convert')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}