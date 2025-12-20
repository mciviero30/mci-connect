import React from "react";
import { Badge } from "@/components/ui/badge";

export default function StatsWidget({ value, label, icon: Icon, badge, color = "blue" }) {
  const colorClasses = {
    blue: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] shadow-md",
    green: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] shadow-md",
    amber: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] shadow-md",
    slate: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] shadow-md",
    red: "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] shadow-md"
  };

  const badgeClasses = {
    blue: "bg-blue-50/60 text-[#507DB4] border border-blue-200/40 px-2 py-0.5 rounded-full text-xs font-semibold",
    green: "bg-blue-50/60 text-[#507DB4] border border-blue-200/40 px-2 py-0.5 rounded-full text-xs font-semibold",
    amber: "bg-blue-50/60 text-[#507DB4] border border-blue-200/40 px-2 py-0.5 rounded-full text-xs font-semibold",
    slate: "bg-blue-50/60 text-[#507DB4] border border-blue-200/40 px-2 py-0.5 rounded-full text-xs font-semibold",
    red: "bg-blue-50/60 text-[#507DB4] border border-blue-200/40 px-2 py-0.5 rounded-full text-xs font-semibold"
  };

  return (
    <div className="flex flex-col h-full hover:scale-[1.02] transition-transform cursor-pointer">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
          {Icon && <Icon className="w-5 h-5 text-white" />}
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
        {badge && (
          <Badge className={badgeClasses[color]}>
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}