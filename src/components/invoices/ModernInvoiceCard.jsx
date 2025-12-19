import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Copy, Trash2, DollarSign, AlertCircle, Download, MoreVertical, Eye } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ModernInvoiceCard({ invoice, onDuplicate, onDelete, onRegisterPayment, isAdmin }) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$0';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getDaysOverdue = (invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled' || !invoice.due_date) return 0;
    
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    dueDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 0 ? daysDiff : 0;
  };

  const daysOverdue = getDaysOverdue(invoice);

  const statusColors = {
    draft: "soft-slate-gradient",
    sent: "soft-blue-gradient",
    paid: "soft-green-gradient",
    partial: "soft-amber-gradient",
    overdue: "soft-red-gradient",
    cancelled: "soft-slate-gradient"
  };

  const statusLabels = {
    draft: language === 'es' ? 'Borrador' : 'Draft',
    sent: language === 'es' ? 'Enviado' : 'Sent',
    paid: language === 'es' ? 'Pagado' : 'Paid',
    partial: language === 'es' ? 'Parcial' : 'Partial',
    overdue: language === 'es' ? 'Vencido' : 'Overdue',
    cancelled: language === 'es' ? 'Cancelado' : 'Cancelled'
  };

  return (
    <Card className="bg-white rounded-[16px] shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border-0 overflow-hidden hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] transition-all duration-300 w-full flex flex-col h-full">
      <div className="p-4 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-[#1A1A1A] leading-tight mb-0.5 line-clamp-2">
              {invoice.customer_name}
            </h3>
            {invoice.job_name && (
              <div className="flex items-center gap-1 mt-1">
                <Users className="w-3 h-3 text-[#666666]" />
                <p className="text-[11px] text-[#666666] leading-tight truncate">
                  {invoice.job_name}
                </p>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="bg-[#F5F5F5] hover:bg-[#E8E8E8] text-slate-700 px-2 rounded-lg h-[26px]"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <DropdownMenuItem 
                onClick={() => navigate(createPageUrl(`VerFactura?id=${invoice.id}`))}
                className="cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
              >
                <Eye className="w-3.5 h-3.5 mr-2" />
                {language === 'es' ? 'Ver' : 'View'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={async () => {
                  const { data } = await base44.functions.invoke('generateInvoicePDF', { invoiceId: invoice.id });
                  const blob = new Blob([data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Invoice-${invoice.invoice_number}.pdf`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                {language === 'es' ? 'Descargar' : 'Download'}
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
                  <DropdownMenuItem 
                    onClick={() => onDuplicate?.(invoice)}
                    className="cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    {language === 'es' ? 'Duplicar' : 'Duplicate'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(invoice)}
                    className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    {language === 'es' ? 'Eliminar' : 'Delete'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1.5 mb-3">
          <Badge className={`${statusColors[invoice.status]} px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center`}>
            {statusLabels[invoice.status] || invoice.status}
          </Badge>
          {invoice.team_name && (
            <Badge 
              variant="outline" 
              className="border border-[#1E6FE8] text-[#1E6FE8] bg-transparent hover:bg-transparent px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center"
            >
              <MapPin className="w-3 h-3 mr-0.5" />
              {invoice.team_name}
            </Badge>
          )}
        </div>

        {/* Overdue Alert */}
        {daysOverdue > 0 && (
          <div className="mb-3 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-red-600" />
            <span className="text-[10px] font-semibold text-red-600">
              {language === 'es' ? `Vencida ${daysOverdue}d` : `Overdue ${daysOverdue}d`}
            </span>
          </div>
        )}

        {/* Invoice Number & Date */}
        <div className="text-[10px] text-[#666666] mb-3">
          <div className="flex items-center justify-between">
            <span>{invoice.invoice_number}</span>
            {invoice.invoice_date && (
              <span>{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</span>
            )}
          </div>
          {invoice.due_date && (
            <div className="flex items-center justify-between mt-1">
              <span>{language === 'es' ? 'Vence:' : 'Due:'}</span>
              <span className={daysOverdue > 0 ? 'text-red-600 font-semibold' : ''}>
                {format(new Date(invoice.due_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Address */}
        {invoice.job_address && (
          <div className="flex items-start gap-1.5 text-[#666666] mb-3">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <span className="text-[10px] line-clamp-2">
              {invoice.job_address}
            </span>
          </div>
        )}

        {/* Financial Info */}
        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#666666] font-semibold">
                {language === 'es' ? 'Total' : 'Total'}
              </span>
              <span className="text-[14px] font-bold text-[#00C48C]">
                {formatCurrency(invoice.total)}
              </span>
            </div>
            
            {invoice.status === 'partial' && (
              <div className="flex items-center justify-between pt-2 border-t border-green-100 mt-2">
                <span className="text-[10px] text-[#666666] font-semibold">
                  {language === 'es' ? 'Saldo' : 'Balance'}
                </span>
                <span className="text-[12px] font-bold text-amber-600">
                  {formatCurrency(invoice.balance || 0)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Only for Admin */}
        {isAdmin && invoice.status !== 'paid' && invoice.status !== 'cancelled' && onRegisterPayment && (
          <div className="flex gap-1.5 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRegisterPayment(invoice)}
              className="flex-1 h-[32px] text-[10px] font-semibold text-green-600 border-2 border-green-300 hover:bg-green-50"
            >
              <DollarSign className="w-3.5 h-3.5 mr-1.5" />
              {language === 'es' ? 'Pago' : 'Payment'}
            </Button>
          </div>
        )}
      </div>

      {/* Gradient Line at Bottom */}
      <div className="h-[3px] bg-gradient-to-r from-green-500 to-emerald-600" />
    </Card>
  );
}