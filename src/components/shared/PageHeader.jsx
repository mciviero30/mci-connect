import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { FadeInUp } from '@/components/advanced/MicroInteractions';

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
    <FadeInUp>
      <div className="mb-3 md:mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="flex items-start gap-2 md:gap-2 flex-1 w-full">
            {showBack && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="mt-0 md:mt-0 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 h-6 w-6"
              >
                <ArrowLeft className="w-3 h-3 md:w-3 md:h-3" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 flex-wrap">
                {Icon && (
                  <div className="p-1 md:p-1.5 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded md:rounded-lg shadow-lg shadow-[#507DB4]/30">
                    <Icon className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
                )}
                <h1 className="text-sm md:text-base lg:text-lg font-bold text-slate-900 dark:text-slate-100 max-w-full">
                  {cleanTitle}
                </h1>
                {appBadge && (
                  <Badge className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md shadow-[#507DB4]/30 text-[8px] md:text-[9px]">
                    {appBadge}
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400 font-medium ml-0 md:ml-[28px] lg:ml-[32px]">{description}</p>
              )}
              {stats.length > 0 && (
                <div className="flex flex-wrap gap-2 md:gap-2 mt-1 md:mt-1.5 ml-0 md:ml-[28px] lg:ml-[32px]">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[9px] md:text-[10px]">
                      {stat.icon && <stat.icon className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#507DB4] dark:text-[#6B9DD8]" />}
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{stat.label}:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{stat.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto items-center">
              {actions}
            </div>
          )}
        </div>
      </div>
    </FadeInUp>
  );
}