import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import FavoriteButton from "./FavoriteButton";

export default function CompactListView({ 
  items, 
  entityType, 
  user,
  getTitle,
  getSubtitle,
  getBadges,
  getAmount,
  onItemClick 
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card
          key={item.id}
          onClick={() => onItemClick(item)}
          className="bg-white dark:bg-slate-800 hover:shadow-md transition-all cursor-pointer p-4 flex items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {getTitle(item)}
              </h3>
              {getBadges && (
                <div className="flex gap-1.5">
                  {getBadges(item)}
                </div>
              )}
            </div>
            {getSubtitle && (
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {getSubtitle(item)}
              </p>
            )}
          </div>

          {getAmount && (
            <div className="text-right">
              <p className="text-lg font-bold text-[#507DB4] dark:text-[#6B9DD8]">
                {getAmount(item)}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <FavoriteButton
              entityType={entityType}
              entityId={item.id}
              entityName={getTitle(item)}
              user={user}
              size="icon"
            />
            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </div>
        </Card>
      ))}
    </div>
  );
}