import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, DollarSign, Eye, Users, Calendar, TrendingUp, MoreVertical, Edit, Trash2 } from "lucide-react";
import SwipeableListItem from '@/components/shared/SwipeableListItem';
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/components/i18n/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";

export default function ModernJobCard({ job, onEdit }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Job.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(lang === 'es' ? 'Trabajo eliminado' : 'Job deleted');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const handleDelete = () => {
    if (confirm(lang === 'es' ? '¿Eliminar este trabajo?' : 'Delete this job?')) {
      deleteMutation.mutate(job.id);
    }
  };

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

  const lang = language || 'en';

  const statusColors = {
    active: "soft-green-gradient",
    completed: "soft-blue-gradient",
    archived: "soft-slate-gradient",
    on_hold: "soft-amber-gradient"
  };

  const statusLabels = {
    active: lang === 'es' ? 'Activo' : 'Active',
    completed: lang === 'es' ? 'Completado' : 'Completed',
    archived: lang === 'es' ? 'Archivado' : 'Archived',
    on_hold: lang === 'es' ? 'En Espera' : 'On Hold'
  };

  const colorIndicator = job.color || 'blue';

  return (
    <Card className="bg-white dark:bg-[#282828] rounded-xl sm:rounded-[16px] shadow-sm sm:shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-700 sm:border-0 overflow-hidden hover:shadow-md sm:hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all duration-300 w-full flex flex-col h-full touch-manipulation">
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base md:text-[16px] font-bold text-[#1A1A1A] dark:text-white leading-tight mb-0.5 line-clamp-2">
              {job.name}
            </h3>
            {job.customer_name && (
              <div className="flex items-center gap-1 mt-1">
                <Users className="w-3 h-3 text-[#666666] dark:text-slate-400" />
                <p className="text-[10px] sm:text-[11px] text-[#666666] dark:text-slate-400 leading-tight truncate">
                  {job.customer_name}
                </p>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="bg-[#F5F5F5] dark:bg-slate-700 hover:bg-[#E8E8E8] dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-2 py-1.5 rounded-lg min-h-[36px] sm:h-[26px] flex-shrink-0 touch-manipulation active:scale-95"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
              <DropdownMenuItem onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}>
                <Eye className="w-4 h-4 mr-2" />
                {lang === 'es' ? 'Ver Detalles' : 'View Details'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit && onEdit(job)}>
                <Edit className="w-4 h-4 mr-2" />
                {lang === 'es' ? 'Editar' : 'Edit'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600 dark:text-red-400">
                <Trash2 className="w-4 h-4 mr-2" />
                {lang === 'es' ? 'Eliminar' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badges - Enhanced sizing */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <Badge className={`${statusColors[job.status]} px-3 py-1 rounded-full text-xs font-bold h-6 flex items-center`}>
            {statusLabels[job.status] || job.status}
          </Badge>
          {job.team_name && (
            <Badge 
              variant="outline" 
              className="border border-[#507DB4]/40 dark:border-[#6B9DD8]/40 text-[#507DB4] dark:text-[#6B9DD8] bg-transparent hover:bg-transparent px-3 py-1 rounded-full text-xs font-bold h-6 flex items-center"
            >
              <MapPin className="w-3.5 h-3.5 mr-1" />
              {job.team_name}
            </Badge>
          )}
        </div>

        {/* Description - Better readability */}
        {job.description && (
          <p className="text-xs sm:text-[11px] text-[#666666] dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        )}

        {/* Address - Better spacing */}
        {(job.address || job.city) && (
          <div className="flex items-start gap-2 text-[#666666] dark:text-slate-400 mb-4">
            <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <span className="text-xs line-clamp-2">
              {job.address}
              {job.city && `, ${job.city}`}
              {job.state && `, ${job.state}`}
              {job.zip && ` ${job.zip}`}
            </span>
          </div>
        )}

        {/* Financial Info - Enhanced visual hierarchy */}
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#666666] dark:text-slate-400 font-semibold uppercase tracking-wide">
                {lang === 'es' ? 'Contrato' : 'Contract'}
              </span>
              <span className="text-lg font-bold text-[#507DB4] dark:text-[#6B9DD8]">
                {formatCurrency(contractAmount)}
              </span>
            </div>
            
            {estimatedCost > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-blue-100 dark:border-blue-800/30 mt-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs text-[#666666] dark:text-slate-400 font-semibold uppercase tracking-wide">
                    {lang === 'es' ? 'Margen' : 'Margin'}
                  </span>
                </div>
                <span className={`text-base font-bold ${getProfitMarginColor(profitMargin)}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gradient Line at Bottom - More prominent */}
      <div className={`h-1 bg-gradient-to-r from-${colorIndicator}-500 to-${colorIndicator}-600`} />
    </Card>
  );
}