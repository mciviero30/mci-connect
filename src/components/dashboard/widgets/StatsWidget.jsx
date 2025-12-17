import React from "react";
import { Badge } from "@/components/ui/badge";

export default function StatsWidget({ value, label, icon: Icon, badge, color = "blue" }) {
  const colorClasses = {
    blue: "soft-blue-gradient shadow-lg",
    green: "soft-green-gradient shadow-lg",
    amber: "soft-amber-gradient shadow-lg",
    purple: "soft-purple-gradient shadow-lg",
    red: "soft-red-gradient shadow-lg"
  };

  const badgeClasses = {
    blue: "badge-soft-blue",
    green: "badge-soft-green",
    amber: "badge-soft-amber",
    purple: "badge-soft-purple",
    red: "badge-soft-red"
  };

  return (
    <div className="flex flex-col h-full hover:scale-[1.02] transition-transform cursor-pointer">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2.5 rounded-xl ${colorClasses[color].replace('shadow-lg', 'shadow-md')}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        <p className="text-sm font-medium opacity-80">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-3xl font-bold">{value}</div>
        {badge && (
          <Badge className={badgeClasses[color]}>
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}