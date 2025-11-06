import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Briefcase, Building2, ExternalLink } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function AppSwitcher({ currentApp = 'mci-connect' }) {
  const { language } = useLanguage();
  const [switching, setSwitching] = useState(false);

  const apps = [
    {
      id: 'mci-connect',
      name: 'MCI Connect',
      subtitle: language === 'es' 
        ? 'Ejecución de Campo y Tareas Técnicas' 
        : 'Field Execution & Technical Tasks',
      icon: Briefcase,
      color: 'from-[#3B9FF3] to-blue-500',
      action: () => {
        if (currentApp === 'mci-connect') {
          window.location.href = '/';
        }
      }
    },
    {
      id: 'modern-components',
      name: 'Modern Components Web',
      subtitle: language === 'es' 
        ? 'Gestión, Ventas y Finanzas' 
        : 'Management, Sales & Finance',
      icon: Building2,
      color: 'from-purple-500 to-indigo-500',
      external: true,
      action: () => {
        console.log('🔄 REDIRECT: Starting redirect to Modern Components Web...');
        setSwitching(true);
        
        // CRITICAL FIX: Use setTimeout to ensure state updates, then redirect
        setTimeout(() => {
          console.log('🔄 REDIRECT: Executing window.location.href...');
          window.location.href = 'https://dashboard.base44.com';
        }, 100);
      }
    }
  ];

  const currentAppData = apps.find(app => app.id === currentApp) || apps[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-2 lg:px-3 h-10 hover:bg-slate-100 transition-colors rounded-lg"
          disabled={switching}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${currentAppData.color} flex items-center justify-center shadow-md flex-shrink-0`}>
              <currentAppData.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-left hidden lg:block min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm truncate max-w-[150px]">
                  {currentAppData.name}
                </span>
                {!switching && <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
              </div>
              <p className="text-xs text-slate-600 leading-none mt-0.5 truncate max-w-[180px]">
                {currentAppData.subtitle}
              </p>
            </div>
            <div className="lg:hidden">
              {!switching && <ChevronDown className="w-4 h-4 text-slate-500" />}
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80 bg-white border-slate-200 shadow-xl">
        <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider px-3 py-2">
          {language === 'es' ? 'Cambiar Aplicación' : 'Switch Application'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {apps.map((app) => {
          const isActive = app.id === currentApp;
          const Icon = app.icon;
          
          return (
            <DropdownMenuItem
              key={app.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`📱 APP SWITCH: User clicked on ${app.id}`);
                app.action();
              }}
              disabled={switching}
              className={`px-3 py-3 cursor-pointer transition-all ${
                isActive 
                  ? 'bg-blue-50 hover:bg-blue-100' 
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold text-sm ${
                      isActive ? 'text-[#3B9FF3]' : 'text-slate-900'
                    }`}>
                      {app.name}
                    </p>
                    {app.external && (
                      <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    )}
                    {isActive && (
                      <span className="px-2 py-0.5 bg-[#3B9FF3] text-white text-xs rounded-full font-medium">
                        {language === 'es' ? 'Actual' : 'Current'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                    {app.subtitle}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}

        {switching && (
          <div className="px-3 py-4 text-center border-t border-slate-200 mt-2 bg-blue-50">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
              <div className="w-4 h-4 border-2 border-[#3B9FF3] border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium">
                {language === 'es' ? 'Redirigiendo...' : 'Redirecting...'}
              </span>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}