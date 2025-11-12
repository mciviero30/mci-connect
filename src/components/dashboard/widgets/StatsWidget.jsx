import React from "react";
import { Badge } from "@/components/ui/badge";

export default function StatsWidget({ value, label, icon: Icon, badge, color = "blue" }) {
  const colorClasses = {
    blue: "from-[#3B9FF3] to-blue-500 shadow-blue-500/30",
    green: "from-green-500 to-emerald-500 shadow-green-500/30",
    amber: "from-amber-500 to-orange-500 shadow-amber-500/30",
    purple: "from-purple-500 to-pink-500 shadow-purple-500/30",
    red: "from-red-500 to-red-600 shadow-red-500/30"
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-3 bg-gradient-to-br ${colorClasses[color]} rounded-xl shadow-md`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {badge && (
            <Badge className={`bg-${color}-50 text-${color}-700 border-${color}-200`}>
              {badge}
            </Badge>
          )}
        </div>
        <div className="text-3xl font-bold text-slate-900 mt-2">{value}</div>
        <p className="text-sm text-slate-600 mt-1">{label}</p>
      </div>
    </div>
  );
}