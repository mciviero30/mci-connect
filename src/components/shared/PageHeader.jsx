import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export default function PageHeader({ 
  title, 
  description, 
  icon: Icon, 
  actions, 
  showBack = false,
  stats = [],
  appBadge = null
}) {
  const navigate = useNavigate();

  // Clean title from line breaks and extra whitespace
  const cleanTitle = typeof title === 'string' 
    ? title.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim() 
    : title;

  return (
    <div className="mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-3 md:gap-4 flex-1 w-full">
          {showBack && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="mt-0.5 md:mt-1 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
              {Icon && (
                <div className="p-2 md:p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-xl md:rounded-2xl shadow-lg shadow-[#507DB4]/30">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              )}
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 max-w-full">
                {cleanTitle}
              </h1>
              {appBadge && (
                <Badge className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md shadow-[#507DB4]/30 text-xs md:text-sm">
                  {appBadge}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium ml-0 md:ml-[48px] lg:ml-[60px]">{description}</p>
            )}
            {stats.length > 0 && (
              <div className="flex flex-wrap gap-3 md:gap-4 mt-2 md:mt-3 ml-0 md:ml-[48px] lg:ml-[60px]">
                {stats.map((stat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs md:text-sm">
                    {stat.icon && <stat.icon className="w-3 h-3 md:w-4 md:h-4 text-[#507DB4] dark:text-[#6B9DD8]" />}
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{stat.label}:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}