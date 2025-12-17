import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, DollarSign, Eye, Users, Calendar, TrendingUp } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function ModernJobCard({ job }) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Calculate profit margin
  const contractAmount = job.contract_amount || 0;
  const estimatedCost = job.estimated_cost || 0;
  const profitMargin = contractAmount > 0
    ? ((contractAmount - estimatedCost) / contractAmount * 100)
    : 0;

  const getProfitMarginColor = (margin) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-amber-600';
    return 'text-red-600';
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$0';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const statusColors = {
    active: "soft-green-gradient",
    completed: "soft-blue-gradient",
    archived: "soft-slate-gradient",
    on_hold: "soft-amber-gradient"
  };

  const statusLabels = {
    active: language === 'es' ? 'Activo' : 'Active',
    completed: language === 'es' ? 'Completado' : 'Completed',
    archived: language === 'es' ? 'Archivado' : 'Archived',
    on_hold: language === 'es' ? 'En Espera' : 'On Hold'
  };

  const colorIndicator = job.color || 'blue';

  return (
    <Card className="bg-white rounded-[16px] shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border-0 overflow-hidden hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] transition-all duration-300 w-full flex flex-col h-full">
      <div className="p-4 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-[#1A1A1A] leading-tight mb-0.5 line-clamp-2">
              {job.name}
            </h3>
            {job.customer_name && (
              <div className="flex items-center gap-1 mt-1">
                <Users className="w-3 h-3 text-[#666666]" />
                <p className="text-[11px] text-[#666666] leading-tight truncate">
                  {job.customer_name}
                </p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
            className="bg-[#F5F5F5] hover:bg-[#E8E8E8] text-slate-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg h-[26px] flex-shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">{language === 'es' ? 'Ver' : 'View'}</span>
          </Button>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1.5 mb-3">
          <Badge className={`${statusColors[job.status]} px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center`}>
            {statusLabels[job.status] || job.status}
          </Badge>
          {job.team_name && (
            <Badge 
              variant="outline" 
              className="border border-[#1E6FE8] text-[#1E6FE8] bg-transparent hover:bg-transparent px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center"
            >
              <MapPin className="w-3 h-3 mr-0.5" />
              {job.team_name}
            </Badge>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-[11px] text-[#666666] mb-3 line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        )}

        {/* Address */}
        {(job.address || job.city) && (
          <div className="flex items-start gap-1.5 text-[#666666] mb-3">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <span className="text-[10px] line-clamp-2">
              {job.address}
              {job.city && `, ${job.city}`}
              {job.state && `, ${job.state}`}
              {job.zip && ` ${job.zip}`}
            </span>
          </div>
        )}

        {/* Financial Info */}
        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#666666] font-semibold">
                {language === 'es' ? 'Valor Contrato' : 'Contract Value'}
              </span>
              <span className="text-[14px] font-bold text-[#1E6FE8]">
                {formatCurrency(contractAmount)}
              </span>
            </div>
            
            {estimatedCost > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-[#666666] font-semibold">
                    {language === 'es' ? 'Margen' : 'Margin'}
                  </span>
                </div>
                <span className={`text-[12px] font-bold ${getProfitMarginColor(profitMargin)}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gradient Line at Bottom */}
      <div className={`h-[3px] bg-gradient-to-r from-${colorIndicator}-500 to-${colorIndicator}-600`} />
    </Card>
  );
}