import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Globe, Settings, LogOut } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { clearAllFieldData } from "@/components/field/services/FieldCleanupService";

const ThemeToggle = () => {
  const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'light');

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button 
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
    >
      {theme === 'light' ? (
        <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
};

export const SidebarFooterContent = ({ user, displayUser, profileImage, imageKey, language, changeLanguage, t }) => {
  return (
    <div className="p-4 flex-shrink-0 border-t border-[#E0E7FF] dark:border-slate-700/50 bg-gradient-to-br from-[#F8FAFF] to-[#F0F4FF] dark:from-slate-900 dark:to-slate-800/50">
      <div className="mb-3 px-2 flex items-center gap-2">
        <Select value={language} onValueChange={changeLanguage}>
          <SelectTrigger className="h-9 flex-1 bg-white dark:bg-slate-800 border-[#1E3A8A]/20 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-[#EBF2FF] dark:hover:bg-slate-700/50 rounded-xl">
            <Globe className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
            <SelectItem value="en" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                English
              </div>
            </SelectItem>
            <SelectItem value="es" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Español
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <ThemeToggle />
      </div>

      <div className="flex items-center justify-between rounded-2xl p-3 border bg-white dark:bg-slate-800 border-[#1E3A8A]/20 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {profileImage ? (
            <img
              src={`${profileImage}?v=${imageKey}`}
              alt={(displayUser || user)?.full_name}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-[#1E3A8A]/30 shadow-md"
            />
          ) : (
            <div className="w-11 h-11 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center ring-2 ring-[#507DB4]/30 shadow-md">
              <span className="text-white font-bold text-base">
                {(displayUser || user)?.full_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-slate-900 dark:text-slate-100">
              {(displayUser || user)?.full_name || (displayUser || user)?.email || 'User'}
            </p>
            <p className="text-xs truncate text-[#507DB4] dark:text-[#6B9DD8] font-medium">
              {(displayUser || user)?.position || (user?.role === 'admin' ? t('admin') : t('user'))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link to={createPageUrl("Configuracion")} className="p-2 rounded-xl transition-all hover:bg-[#EBF2FF] dark:hover:bg-slate-700/50 hover:scale-110" title={t('settings')}>
            <Settings className="w-4 h-4 text-[#507DB4] dark:text-[#6B9DD8]" />
          </Link>
          <button
            onClick={async () => {
              await clearAllFieldData();
              base44.auth.logout();
            }}
            className="p-2 rounded-xl transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
};