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

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4 flex-1">
          {showBack && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="mt-1 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {Icon && (
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl shadow-indigo-500/30">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              )}
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{title}</h1>
              {appBadge && (
                <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30">
                  {appBadge}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-slate-600 dark:text-slate-400 font-medium ml-[60px]">{description}</p>
            )}
            {stats.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-3 ml-[60px]">
                {stats.map((stat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {stat.icon && <stat.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{stat.label}:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}