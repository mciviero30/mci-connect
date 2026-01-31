import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";

export default function ListWidget({ items, emptyMessage, renderItem }) {
  // FIX: Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];
  
  if (safeItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500 text-sm">{emptyMessage || 'No items'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {safeItems.map((item, index) => (
        <div key={index}>
          {renderItem ? renderItem(item) : (
            <div className="flex items-center justify-between p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all">
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-slate-600">{item.subtitle}</p>
                )}
              </div>
              {item.badge && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                  {item.badge}
                </Badge>
              )}
              <ChevronRight className="w-4 h-4 text-slate-400 ml-2" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}