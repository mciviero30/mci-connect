import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Briefcase, Building2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function AppSwitcher({ currentApp = 'mci-connect' }) {
  const { language } = useLanguage();

  const handleAppSwitch = (app) => {
    console.log('🔄 APP SWITCH: Switching to', app.id);
    console.log('🔄 APP SWITCH: URL:', app.url);
    
    // Internal navigation - reload to ensure fresh state
    window.location.href = app.url;
  };

  const apps = [
    {
      id: 'mci-connect',
      name: 'MCI Connect',
      subtitle: language === 'es' 
        ? 'Ejecución de Campo y Tareas Técnicas' 
        : 'Field Execution & Technical Tasks',
      icon: Briefcase,
      color: 'from-[#3B9FF3] to-blue-500',
      url: '/Dashboard',
      external: false
    },
    {
      id: 'modern-components',
      name: 'Modern Components Web',
      subtitle: language === 'es' 
        ? 'Gestión, Ventas y Finanzas' 
        : 'Management, Sales & Finance',
      icon: Building2,
      color: 'from-purple-500 to-indigo-500',
      url: '/Dashboard',
      external: false // Internal navigation - unified portal
    }
  ];

  const currentAppData = apps.find(app => app.id === currentApp) || apps[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-2 lg:px-3 h-10 hover:bg-slate-100 transition-colors rounded-lg"
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
                <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </div>
              <p className="text-xs text-slate-600 leading-none mt-0.5 truncate max-w-[180px]">
                {currentAppData.subtitle}
              </p>
            </div>
            <div className="lg:hidden">
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80 bg-white border-slate-200 shadow-xl">
        <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider px-3 py-2">
          {language === 'es' ? 'Vista de la Aplicación' : 'Application View'}
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
                handleAppSwitch(app);
              }}
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

        <div className="px-3 py-2 border-t border-slate-200 mt-2">
          <p className="text-xs text-slate-500 text-center">
            {language === 'es' 
              ? 'Todas las herramientas en un solo portal' 
              : 'All tools in one unified portal'}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}