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
    <Card className="bg-white rounded-[16px] shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border-0 overflow-hidden hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] transition-all duration-300 w-full flex flex-col h-full">
      <div className="p-4 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2.5">
            <div className="w-[48px] h-[48px] bg-[#1E6FE8] rounded-full flex items-center justify-center text-white font-bold text-[19px] flex-shrink-0">
              {displayName[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold text-[#1A1A1A] leading-tight mb-0.5">
                {displayName}
              </h3>
              <p className="text-[11px] text-[#666666] leading-tight">
                {customer.title || 'Contact'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl(`CustomerDetails?id=${customer.id}`))}
              className="bg-[#F5F5F5] hover:bg-[#E8E8E8] text-slate-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg h-[26px] flex-shrink-0"
            >
              <Building2 className="w-3 h-3" />
              <span className="text-[10px] font-medium">View Details</span>
            </Button>
            
            {showSelectButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.();
                }}
                className={`w-[14px] h-[14px] rounded flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#FFB800] text-white'
                    : 'bg-white border border-slate-300 hover:border-[#FFB800]'
                }`}
              >
                {isSelected && (
                  <svg className="w-[10px] h-[10px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Company Name */}
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-[#666666] mb-1.5">
            Company
          </p>
          <Badge className="bg-[#1E6FE8] hover:bg-[#1E6FE8] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center w-fit">
            {companyName}
          </Badge>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1.5 mb-3">
          <Badge className="bg-[#00C48C] hover:bg-[#00C48C] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center">
            Active
          </Badge>
          {customer.address && (
            <Badge 
              variant="outline" 
              className="border border-[#1E6FE8] text-[#1E6FE8] bg-transparent hover:bg-transparent px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center"
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
      <div className="h-[3px] bg-gradient-to-r from-[#1E6FE8] to-[#0052CC]" />
    </Card>
  );
}