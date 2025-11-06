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
        // Just reload if already on MCI Connect
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
        // FIXED: Direct redirect to Base44 dashboard with SSO
        // The Base44 platform will automatically handle SSO and show available apps
        setSwitching(true);
        console.log('🔄 Redirecting to Modern Components Web via Base44 Dashboard...');
        
        // Direct redirect - SSO is handled automatically by Base44
        window.location.href = 'https://dashboard.base44.com';
      }
    }
  ];

  const currentAppData = apps.find(app => app.id === currentApp) || apps[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-3 h-12 hover:bg-slate-100 transition-colors"
          disabled={switching}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentAppData.color} flex items-center justify-center shadow-md`}>
              <currentAppData.icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-left hidden md:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-base">
                  {currentAppData.name}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-xs text-slate-600 leading-none mt-0.5">
                {currentAppData.subtitle}
              </p>
            </div>
            <div className="md:hidden">
              <ChevronDown className="w-4 h-4 text-slate-500" />
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
                console.log(`Switching to app: ${app.id}`);
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
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold text-sm ${
                      isActive ? 'text-[#3B9FF3]' : 'text-slate-900'
                    }`}>
                      {app.name}
                    </p>
                    {app.external && (
                      <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    )}
                    {isActive && (
                      <span className="ml-auto px-2 py-0.5 bg-[#3B9FF3] text-white text-xs rounded-full font-medium">
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
          <div className="px-3 py-4 text-center border-t border-slate-200 mt-2">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <div className="w-4 h-4 border-2 border-[#3B9FF3] border-t-transparent rounded-full animate-spin"></div>
              {language === 'es' ? 'Redirigiendo a Modern Components Web...' : 'Redirecting to Modern Components Web...'}
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}