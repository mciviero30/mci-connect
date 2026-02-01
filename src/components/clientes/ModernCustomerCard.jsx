import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Building2, Plus, MessageSquare, Copy, FileCheck } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { getCustomerDisplayName } from "@/components/utils/nameHelpers";
import { normalizeText } from "@/components/utils/textNormalization";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

export default function ModernCustomerCard({ customer, customerStats }) {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  
  const stats = customerStats || { quotes: 0, invoices: 0, totalRevenue: 0 };
  const displayName = normalizeText(getCustomerDisplayName(customer));
  const companyName = normalizeText(customer.company) || 'No Company';

  return (
    <Card 
      onClick={() => navigate(createPageUrl(`CustomerDetails?id=${customer.id}`))}
      className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-[16px] shadow-sm sm:shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-700 sm:border-0 overflow-hidden hover:shadow-md sm:hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all duration-300 w-full flex flex-col h-full touch-manipulation cursor-pointer">
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2.5">
            <div className="w-[48px] h-[48px] bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center text-white font-bold text-[19px] flex-shrink-0 shadow-md">
              {displayName[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-[16px] font-bold text-[#1A1A1A] dark:text-white leading-tight mb-0.5 truncate" title={displayName}>
                {displayName}
              </h3>
              <p className="text-xs sm:text-[11px] text-[#666666] dark:text-slate-400 leading-tight truncate" title={customer.title || 'Contact'}>
                {normalizeText(customer.title) || 'Contact'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <FavoriteButton
              entityType="customer"
              entityId={customer.id}
              entityName={displayName}
              user={user}
            />

          </div>
        </div>

        {/* Company Name - Improved contrast */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-[#666666] dark:text-slate-400 mb-2 uppercase tracking-wide">
            Company
          </p>
          <Badge className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white px-3 py-1 rounded-full text-xs font-bold h-6 flex items-center w-fit shadow-sm">
            {companyName}
          </Badge>
        </div>

        {/* Status Badges - Enhanced visibility */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <Badge className="soft-green-gradient px-3 py-1 rounded-full text-xs font-bold h-6 flex items-center">
            Active
          </Badge>
          {customer.address && (
            <Badge 
              variant="outline" 
              className="border border-[#507DB4]/40 text-[#507DB4] bg-transparent hover:bg-transparent px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center"
            >
              {customer.city || 'Location'}
            </Badge>
          )}
        </div>

        {/* Stats Row - NEW */}
        <div className="flex gap-2 mb-3 text-[10px]">
          <div className="flex-1 bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2 text-center">
            <p className="font-bold text-slate-900 dark:text-white">{stats.quotes}</p>
            <p className="text-[9px] text-slate-600 dark:text-slate-400">Quotes</p>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2 text-center">
            <p className="font-bold text-slate-900 dark:text-white">{stats.invoices}</p>
            <p className="text-[9px] text-slate-600 dark:text-slate-400">Invoices</p>
          </div>
          <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
            <p className="font-bold text-green-600 dark:text-green-400">${(stats.totalRevenue / 1000).toFixed(1)}k</p>
            <p className="text-[9px] text-green-600 dark:text-green-400">Revenue</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 mb-3 mt-auto">
          {customer.email && (
            <div className="flex items-center gap-1.5 text-[#666666] dark:text-slate-400">
              <Mail className="w-[13px] h-[13px] text-slate-400 dark:text-slate-500 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[10px] truncate">{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-1.5 text-[#666666] dark:text-slate-400">
              <Phone className="w-[13px] h-[13px] text-slate-400 dark:text-slate-500 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[10px]">{customer.phone}</span>
            </div>
          )}
        </div>

        {/* Quick Actions - NEW */}
        <div className="flex gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-700">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(createPageUrl(`CrearEstimado?customerId=${customer.id}`));
            }}
            className="flex-1 h-8 text-[11px] border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(createPageUrl(`CrearFactura?customerId=${customer.id}`));
            }}
            className="flex-1 h-8 text-[11px] border-slate-300 dark:border-slate-600 hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            <FileCheck className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Bottom Border Line */}
      <div className="h-[3px] bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]" />
    </Card>
  );
}