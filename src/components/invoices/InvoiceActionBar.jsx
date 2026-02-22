import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Edit, Mail, Download, DollarSign, Briefcase, MoreHorizontal, CheckCircle2, Maximize2, Printer, Share2, Copy, XCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useUI } from "@/components/contexts/FieldModeContext";
import { getInvoiceStatusMeta } from "../core/statusConfig";

export default function InvoiceActionBar({
  invoice,
  job,
  onRecordPayment,
  onSendInvoice,
  onSendApproval,
  onCreateJob,
  onPrint,
  onDownloadPDF,
  onShare,
  onClone,
  onCancel,
  onDelete,
  sendingApproval,
  sendInvoiceLoading,
  onRetryProvisioning
}) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toggleFocusMode } = useUI();

  if (!invoice) return null;

  const statusMeta = getInvoiceStatusMeta(invoice.status, language);
  const canEdit = invoice.status === 'draft';
  const canDelete = invoice.status === 'draft';
  const canRecordPayment = !['paid', 'cancelled'].includes(invoice.status);

  return (
    <div className="no-print border-b shadow-sm px-4 py-3" style={{ background: 'linear-gradient(to right, #000000 0%, #000000 35%, #4a4a4a 100%)', borderColor: 'rgba(0, 0, 0, 0.2)' }}>
      <div className="max-w-6xl mx-auto flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('Facturas'))}
            className="text-slate-300 hover:text-white hover:bg-slate-800 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white truncate">{invoice.invoice_number}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${statusMeta.badgeClass} text-[10px] px-2 py-0.5`}>{statusMeta.label}</Badge>
              {invoice.customer_approved && (
                <Badge className="bg-green-600 text-white text-[10px] px-2 py-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {language === 'es' ? 'Aprobado por Cliente' : 'Customer Approved'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
          {canRecordPayment && (
            <Button
              size="sm"
              onClick={onRecordPayment}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs px-3 h-9"
            >
              <DollarSign className="w-3.5 h-3.5 mr-1.5" />
              ${invoice.balance?.toLocaleString() || '0'}
            </Button>
          )}

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl(`CrearFactura?id=${invoice.id}`))}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs px-3 h-9"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              {t('edit')}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onSendInvoice}
            disabled={sendInvoiceLoading}
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 disabled:opacity-50 text-xs px-3 h-9"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            {language === 'es' ? 'Enviar' : 'Send'}
          </Button>

          {invoice.customer_email && !['paid', 'cancelled'].includes(invoice.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSendApproval}
              disabled={sendingApproval}
              className="bg-green-700 border-green-600 text-white hover:bg-green-600 disabled:opacity-50 text-xs px-3 h-9"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {sendingApproval ? '...' : (language === 'es' ? 'Pedir Aprobación' : 'Request Approval')}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadPDF}
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs px-3 h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            PDF
          </Button>

          {!invoice.job_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateJob}
              className="bg-blue-600 border-blue-700 text-white hover:bg-blue-700 text-xs px-3 h-9"
            >
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
              {language === 'es' ? 'Crear Job' : 'Create Job'}
            </Button>
          )}

          {onRetryProvisioning && (
            <>{/* Retry provisioning button via component */}</>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 px-2 h-9">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800">
              <DropdownMenuItem onClick={toggleFocusMode} className="cursor-pointer text-white hover:bg-slate-800">
                <Maximize2 className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Modo Enfoque' : 'Focus Mode'}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem onClick={onPrint} className="cursor-pointer text-white hover:bg-slate-800">
                <Printer className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Imprimir' : 'Print'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownloadPDF} className="cursor-pointer text-white hover:bg-slate-800">
                <Download className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Descargar PDF' : 'Download PDF'}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem onClick={onShare} className="cursor-pointer text-white hover:bg-slate-800">
                <Share2 className="w-4 h-4 mr-2" />
                {t('share')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onClone} className="cursor-pointer text-white hover:bg-slate-800">
                <Copy className="w-4 h-4 mr-2" />
                {t('clone')}
              </DropdownMenuItem>
              {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                <>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem onClick={onCancel} className="cursor-pointer text-white hover:bg-slate-800">
                    <XCircle className="w-4 h-4 mr-2 text-amber-600" />
                    {t('cancelInvoice')}
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-300 cursor-pointer hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}