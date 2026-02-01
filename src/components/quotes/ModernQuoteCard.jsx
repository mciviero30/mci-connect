import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Copy, Trash2, FileCheck, Download, MoreVertical, Eye, Edit3, Send } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { getQuoteStatusMeta } from "../core/statusConfig";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { useQuery } from "@tanstack/react-query";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";

export default function ModernQuoteCard({ quote, onDuplicate, onDelete, onConvert, isAdmin, onSend }) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const { data: user } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
  });

  // Normalize text helper
  const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$0';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const statusMeta = getQuoteStatusMeta(quote.status, language);

  return (
    <Card 
      onClick={() => navigate(createPageUrl(`VerEstimado?id=${quote.id}`))}
      className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-[16px] shadow-sm sm:shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-700 sm:border-0 overflow-hidden hover:shadow-md sm:hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all duration-300 w-full flex flex-col h-full touch-manipulation cursor-pointer">
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-[16px] font-bold text-[#1A1A1A] dark:text-white leading-tight mb-0.5 line-clamp-2" title={normalizeText(quote.customer_name)}>
              {normalizeText(quote.customer_name)}
            </h3>
            {quote.job_name && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Users className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400" />
                <p className="text-xs sm:text-[11px] text-[#666666] dark:text-slate-400 leading-tight truncate" title={normalizeText(quote.job_name)}>
                  {normalizeText(quote.job_name)}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <FavoriteButton
              entityType="quote"
              entityId={quote.id}
              entityName={quote.customer_name}
              user={user}
            />
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
                  navigate(createPageUrl(`VerEstimado?id=${quote.id}`));
                }}
                className="cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
              >
                <Eye className="w-3.5 h-3.5 mr-2" />
                {language === 'es' ? 'Ver' : 'View'}
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl(`CrearEstimado?id=${quote.id}`));
                  }}
                  className="cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-2" />
                  {language === 'es' ? 'Editar' : 'Edit'}
                </DropdownMenuItem>
              )}
              {isAdmin && quote.status === 'draft' && onSend && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSend(quote);
                  }}
                  className="cursor-pointer text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs"
                >
                  <Send className="w-3.5 h-3.5 mr-2" />
                  {language === 'es' ? 'Marcar como Enviado' : 'Mark as Sent'}
                </DropdownMenuItem>
              )}
              {isAdmin && quote.status === 'sent' && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl(`VerEstimado?id=${quote.id}`));
                  }}
                  className="cursor-pointer text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-2" />
                  {language === 'es' ? 'Re-abrir para Editar' : 'Reopen for Editing'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await base44.functions.invoke('generateQuotePDF', { quoteId: quote.id });
                    
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
                    a.download = `Quote-${quote.quote_number}.pdf`;
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
                      onDuplicate?.(quote);
                    }}
                    className="cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    {language === 'es' ? 'Duplicar' : 'Duplicate'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(quote);
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
        </div>

        {/* Status Badges - Enhanced sizing */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <Badge className={`${statusMeta.cardBadgeClass} px-3 py-1 rounded-full text-xs font-bold h-6 flex items-center`}>
            {statusMeta.label}
          </Badge>
          {quote.team_name && (
            <Badge 
              variant="outline" 
              className="border border-[#507DB4]/40 dark:border-[#6B9DD8]/40 text-[#507DB4] dark:text-[#6B9DD8] bg-transparent hover:bg-transparent px-3 py-1 rounded-full text-xs font-bold h-6 flex items-center"
            >
              <MapPin className="w-3.5 h-3.5 mr-1" />
              {quote.team_name}
            </Badge>
          )}
        </div>

        {/* Quote Number & Date - Better readability */}
        <div className="text-xs text-[#666666] dark:text-slate-400 mb-4">
          <div className="flex items-center justify-between">
            <span>{quote.quote_number}</span>
            {quote.quote_date && (() => {
              try {
                return <span>{format(new Date(quote.quote_date), 'MMM d, yyyy')}</span>;
              } catch {
                return null;
              }
            })()}
          </div>
        </div>

        {/* Address - Better spacing */}
        {quote.job_address && (
          <div className="flex items-start gap-2 mb-4">
            <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <span className="text-xs text-[#666666] dark:text-slate-400 line-clamp-2 leading-relaxed">
              {quote.job_address}
            </span>
          </div>
        )}

        {/* Financial Info - Enhanced visual hierarchy */}
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#666666] dark:text-slate-400 font-semibold uppercase tracking-wide">
                {language === 'es' ? 'Valor Total' : 'Total Value'}
              </span>
              <span className="text-lg font-bold text-[#507DB4] dark:text-[#6B9DD8]">
                {formatCurrency(quote.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Enhanced touch targets */}
        {isAdmin && quote.status !== 'converted_to_invoice' && onConvert && (
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onConvert(quote);
              }}
              className="flex-1 min-h-[40px] text-xs font-semibold text-[#507DB4] dark:text-[#6B9DD8] border-2 border-[#507DB4]/30 dark:border-[#6B9DD8]/30 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 rounded-lg touch-manipulation active:scale-95 transition-transform"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Convertir a Factura' : 'Convert to Invoice'}
            </Button>
          </div>
        )}
      </div>

      {/* Gradient Line at Bottom - More prominent */}
      <div className="h-1 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]" />
    </Card>
  );
}