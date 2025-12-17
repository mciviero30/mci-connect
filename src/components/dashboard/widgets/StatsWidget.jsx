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

  const badgeClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    green: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
    amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
    purple: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700",
    red: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700"
  };

  return (
    <div className="flex flex-col h-full hover:scale-[1.02] transition-transform cursor-pointer">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2.5 bg-gradient-to-br ${colorClasses[color]} rounded-xl shadow-md`}>
          {Icon && <Icon className="w-5 h-5 text-white" />}
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
        {badge && (
          <Badge className={badgeClasses[color]}>
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}