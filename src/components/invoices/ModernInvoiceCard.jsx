import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Copy, Trash2, DollarSign, AlertCircle, Download, MoreVertical, Eye, Edit3, Briefcase } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { getInvoiceStatusMeta } from "../core/statusConfig";
import ProvisioningStatusBadge from "./ProvisioningStatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ModernInvoiceCard({ invoice, onDuplicate, onDelete, onRegisterPayment, onCreateJob, isAdmin }) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Normalize text helper
  const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  // Defensive guards - never trust invoice data
  const invoiceNumber = invoice?.invoice_number || 'DRAFT';
  const customer = normalizeText(invoice?.customer_name) || 'N/A';
  const total = Number(invoice?.total) || 0;
  const status = invoice?.status || 'draft';
  const itemsCount = Array.isArray(invoice?.items) ? invoice.items.length : 0;
  const balance = Number(invoice?.balance) || 0;

  const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getDaysOverdue = (invoice) => {
    if (!invoice?.due_date || status === 'paid' || status === 'cancelled') return 0;
    
    try {
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      dueDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);

      const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 0 ? daysDiff : 0;
    } catch {
      return 0;
    }
  };

  const daysOverdue = getDaysOverdue(invoice);
  const statusMeta = getInvoiceStatusMeta(status, language);

  return (
    <Card 
      onClick={() => navigate(createPageUrl(`VerFactura?id=${invoice.id}`))}
      className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-[16px] shadow-sm sm:shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-700 sm:border-0 overflow-hidden hover:shadow-md sm:hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all duration-300 w-full flex flex-col h-full touch-manipulation cursor-pointer">
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-[16px] font-bold text-[#1A1A1A] dark:text-white leading-tight mb-0.5 line-clamp-2" title={customer}>
              {customer}
            </h3>
            {invoice?.job_name && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Users className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400" />
                <p className="text-xs sm:text-[11px] text-[#666666] dark:text-slate-400 leading-tight truncate" title={normalizeText(invoice.job_name)}>
                  {normalizeText(invoice.job_name)}
                </p>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="bg-[#F5F5F5] dark:bg-slate-700 hover:bg-[#E8E8E8] dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-2 py-1.5 rounded-lg min-h-[36px] flex-shrink-0 touch-manipulation active:scale-95 transition-transform"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(createPageUrl(`VerFactura?id=${invoice.id}`));
                }}
                className="cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
              >
                <Eye className="w-3.5 h-3.5 mr-2" />
                {language === 'es' ? 'Ver' : 'View'}
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(createPageUrl(`CrearFactura?id=${invoice.id}`));
                    }}
                    className="cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-2" />
                    {language === 'es' ? 'Editar' : 'Edit'}
                  </DropdownMenuItem>
                  {!invoice.job_id && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateJob?.(invoice);
                      }}
                      className="cursor-pointer text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs font-semibold"
                    >
                      <Briefcase className="w-3.5 h-3.5 mr-2" />
                      {language === 'es' ? 'Crear Trabajo' : 'Create Job'}
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuItem 
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await base44.functions.invoke('generateInvoicePDF', { invoiceId: invoice.id });
                    
                    // Handle different response types
                    let pdfData;
                    if (response instanceof Blob) {
                      pdfData = response;
                    } else if (response instanceof ArrayBuffer) {
                      pdfData = new Blob([response], { type: 'application/pdf' });
                    } else if (response?.data) {
                      pdfData = new Blob([response.data], { type: 'application/pdf' });
                    } else {
                      throw new Error('Invalid response format');
                    }
                    
                    const url = window.URL.createObjectURL(pdfData);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Invoice-${invoice.invoice_number}-${invoice.customer_name}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    
                    setTimeout(() => {
                      window.URL.revokeObjectURL(url);
                      a.remove();
                    }, 100);
                  } catch (error) {
                    console.error('PDF download error:', error);
                  }
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate?.(invoice);
                    }}
                    className="cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    {language === 'es' ? 'Duplicar' : 'Duplicate'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(invoice);
                    }}
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

        {/* Status Badges - Enhanced sizing */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <Badge className={`${statusMeta.cardBadgeClass} px-3 py-1 rounded-full text-xs font-bold h-6 flex items-center`}>
            {statusMeta.label}
          </Badge>
          {invoice.team_name && (
            <Badge 
              variant="outline" 
              className="border border-[#507DB4]/40 dark:border-[#6B9DD8]/40 text-[#507DB4] dark:text-[#6B9DD8] bg-transparent hover:bg-transparent px-3 py-1 rounded-full text-xs font-bold h-6 flex items-center"
            >
              <MapPin className="w-3.5 h-3.5 mr-1" />
              {invoice.team_name}
            </Badge>
          )}
        </div>

        {/* Provisioning Status Badge */}
        {invoice.job_id && (
          <ProvisioningStatusBadge 
            provisioningStatus={invoice.provisioning_status}
            driveFolderUrl={invoice.drive_folder_url}
            fieldProjectId={invoice.field_project_id}
            language={language}
          />
        )}

        {/* Overdue Alert - More prominent */}
        {daysOverdue > 0 && (
          <div className="mb-4 px-3 py-2 soft-red-gradient rounded-xl flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-bold text-red-700 dark:text-red-500">
              {language === 'es' ? `Vencida ${daysOverdue} días` : `Overdue ${daysOverdue} days`}
            </span>
          </div>
        )}

        {/* Invoice Number & Date - Better spacing */}
        <div className="text-xs text-[#666666] dark:text-slate-400 mb-4">
          <div className="flex items-center justify-between">
            <span>{invoiceNumber}</span>
            {invoice?.invoice_date && (() => {
              try {
                const date = new Date(invoice.invoice_date);
                if (isNaN(date.getTime())) return null;
                return <span>{format(date, 'MMM d, yyyy')}</span>;
              } catch {
                return null;
              }
            })()}
          </div>
          {invoice?.due_date && (() => {
            try {
              const date = new Date(invoice.due_date);
              if (isNaN(date.getTime())) return null;
              return (
                <div className="flex items-center justify-between mt-1">
                  <span>{language === 'es' ? 'Vence:' : 'Due:'}</span>
                  <span className={daysOverdue > 0 ? 'text-red-600 font-semibold' : ''}>
                    {format(date, 'MMM d, yyyy')}
                  </span>
                </div>
              );
            } catch {
              return null;
            }
          })()}
        </div>

        {/* Address */}
        {invoice.job_address && (
          <div className="flex items-start gap-1.5 text-[#666666] dark:text-slate-400 mb-3">
            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <span className="text-[10px] line-clamp-2">
              {invoice.job_address}
            </span>
          </div>
        )}

        {/* Financial Info - Enhanced visual hierarchy */}
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#666666] dark:text-slate-400 font-semibold uppercase tracking-wide">
                {language === 'es' ? 'Total' : 'Total'}
              </span>
              <span className="text-lg font-bold text-[#00C48C] dark:text-emerald-400">
                {formatCurrency(total)}
              </span>
            </div>
            
            {status === 'partial' && (
              <div className="flex items-center justify-between pt-3 border-t border-green-100 dark:border-green-800/30 mt-2">
                <span className="text-xs text-[#666666] dark:text-slate-400 font-semibold uppercase tracking-wide">
                  {language === 'es' ? 'Saldo' : 'Balance'}
                </span>
                <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(balance)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Enhanced touch targets */}
        {isAdmin && status !== 'paid' && status !== 'cancelled' && onRegisterPayment && (
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRegisterPayment(invoice);
              }}
              className="flex-1 min-h-[40px] text-xs font-semibold text-green-600 dark:text-green-400 border-2 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg touch-manipulation active:scale-95 transition-transform"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Registrar Pago' : 'Register Payment'}
            </Button>
          </div>
        )}
      </div>

      {/* Gradient Line at Bottom - More prominent */}
      <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600" />
    </Card>
  );
}