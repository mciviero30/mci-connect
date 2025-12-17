import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, Users, Copy, Trash2, FileCheck } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { format } from "date-fns";

export default function ModernQuoteCard({ quote, onDuplicate, onDelete, onConvert, isAdmin }) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$0';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const statusColors = {
    draft: "bg-[#94A3B8] hover:bg-[#94A3B8] text-white",
    sent: "bg-[#1E6FE8] hover:bg-[#1E6FE8] text-white",
    approved: "bg-[#00C48C] hover:bg-[#00C48C] text-white",
    rejected: "bg-[#EF4444] hover:bg-[#EF4444] text-white",
    converted_to_invoice: "bg-[#8B5CF6] hover:bg-[#8B5CF6] text-white"
  };

  const statusLabels = {
    draft: language === 'es' ? 'Borrador' : 'Draft',
    sent: language === 'es' ? 'Enviado' : 'Sent',
    approved: language === 'es' ? 'Aprobado' : 'Approved',
    rejected: language === 'es' ? 'Rechazado' : 'Rejected',
    converted_to_invoice: language === 'es' ? 'Convertido' : 'Converted'
  };

  return (
    <Card className="bg-white rounded-[16px] shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border-0 overflow-hidden hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] transition-all duration-300 w-full flex flex-col h-full">
      <div className="p-4 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-[#1A1A1A] leading-tight mb-0.5 line-clamp-2">
              {quote.customer_name}
            </h3>
            {quote.job_name && (
              <div className="flex items-center gap-1 mt-1">
                <Users className="w-3 h-3 text-[#666666]" />
                <p className="text-[11px] text-[#666666] leading-tight truncate">
                  {quote.job_name}
                </p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl(`VerEstimado?id=${quote.id}`))}
            className="bg-[#F5F5F5] hover:bg-[#E8E8E8] text-slate-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg h-[26px] flex-shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">{language === 'es' ? 'Ver' : 'View'}</span>
          </Button>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1.5 mb-3">
          <Badge className={`${statusColors[quote.status]} px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center`}>
            {statusLabels[quote.status] || quote.status}
          </Badge>
          {quote.team_name && (
            <Badge 
              variant="outline" 
              className="border border-[#1E6FE8] text-[#1E6FE8] bg-transparent hover:bg-transparent px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center"
            >
              <MapPin className="w-3 h-3 mr-0.5" />
              {quote.team_name}
            </Badge>
          )}
        </div>

        {/* Quote Number & Date */}
        <div className="text-[10px] text-[#666666] mb-3">
          <div className="flex items-center justify-between">
            <span>{quote.quote_number}</span>
            {quote.quote_date && (
              <span>{format(new Date(quote.quote_date), 'MMM d, yyyy')}</span>
            )}
          </div>
        </div>

        {/* Address */}
        {quote.job_address && (
          <div className="flex items-start gap-1.5 text-[#666666] mb-3">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <span className="text-[10px] line-clamp-2">
              {quote.job_address}
            </span>
          </div>
        )}

        {/* Financial Info */}
        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#666666] font-semibold">
                {language === 'es' ? 'Valor Total' : 'Total Value'}
              </span>
              <span className="text-[14px] font-bold text-[#1E6FE8]">
                {formatCurrency(quote.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Only for Admin */}
        {isAdmin && (
          <div className="flex gap-1.5 mt-3">
            {quote.status !== 'converted_to_invoice' && onConvert && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConvert(quote)}
                className="flex-1 h-[28px] text-[10px] text-green-600 border-green-300 hover:bg-green-50"
              >
                <FileCheck className="w-3 h-3 mr-1" />
                {language === 'es' ? 'Factura' : 'Invoice'}
              </Button>
            )}
            {onDuplicate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDuplicate(quote)}
                className="h-[28px] px-2"
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm(language === 'es' ? '¿Eliminar?' : 'Delete?')) {
                    onDelete(quote.id);
                  }
                }}
                className="h-[28px] px-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Gradient Line at Bottom */}
      <div className="h-[3px] bg-gradient-to-r from-cyan-500 to-blue-600" />
    </Card>
  );
}