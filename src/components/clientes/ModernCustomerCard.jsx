import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Building2, Plus } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function ModernCustomerCard({ customer, onViewDetails, isSelected, onToggleSelect, showSelectButton }) {
  const navigate = useNavigate();

  const getCustomerDisplayName = () => {
    if (customer.first_name || customer.last_name) {
      const firstName = customer.first_name || '';
      const lastName = customer.last_name || '';
      return `${firstName} ${lastName}`.trim();
    }
    if (customer.name) {
      return customer.name;
    }
    return customer.email?.split('@')[0] || 'Unknown';
  };

  const displayName = getCustomerDisplayName();
  const companyName = customer.company || 'No Company';

  return (
    <Card className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-[16px] shadow-sm sm:shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-700 sm:border-0 overflow-hidden hover:shadow-md sm:hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all duration-300 w-full flex flex-col h-full touch-manipulation">
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2.5">
            <div className="w-[48px] h-[48px] bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center text-white font-bold text-[19px] flex-shrink-0 shadow-md">
              {displayName[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-[16px] font-bold text-[#1A1A1A] dark:text-white leading-tight mb-0.5">
                {displayName}
              </h3>
              <p className="text-xs sm:text-[11px] text-[#666666] dark:text-slate-400 leading-tight">
                {customer.title || 'Contact'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl(`CustomerDetails?id=${customer.id}`))}
              className="bg-[#F5F5F5] dark:bg-slate-700 hover:bg-[#E8E8E8] dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 px-3 py-2 rounded-lg min-h-[36px] flex-shrink-0 touch-manipulation active:scale-95 transition-transform"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">View</span>
            </Button>
            
            {showSelectButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.();
                }}
                style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', maxWidth: '18px', maxHeight: '18px' }}
                className={`rounded flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#FFB800] text-white'
                    : 'bg-white border border-slate-300 hover:border-[#FFB800]'
                }`}
              >
                {isSelected && (
                  <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )}
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

        {/* Contact Info */}
        <div className="space-y-1.5 mb-0 mt-auto">
          {customer.email && (
            <div className="flex items-center gap-1.5 text-[#666666]">
              <Mail className="w-[13px] h-[13px] text-slate-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[10px] truncate">{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-1.5 text-[#666666]">
              <Phone className="w-[13px] h-[13px] text-slate-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[10px]">{customer.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Border Line */}
      <div className="h-[3px] bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]" />
    </Card>
  );
}